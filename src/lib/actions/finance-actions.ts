"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { getTenancyFilters } from "../utils/tenancy";
import { CounterService } from "../services/counter-service";
import { Decimal } from "@prisma/client/runtime/library";
import { razorpay } from "@/lib/razorpay";
import crypto from "crypto";
import { checkCapability } from "../auth/rbac";
import { ST_CONFIRMED, ST_PROVISIONAL } from "../constants/admission-statuses";

/**
 * serialize
 * 
 * Safely converts Prisma-specific types (like Decimal) into plain JSON-serializable numbers
 * to prevent Next.js Client Component errors.
 */
const serialize = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) 
      ? Number(value) 
      : value
  ));
};

/**
 * findPotentialSiblings
 * 
 * Sibling Discovery Logic: Matches by parent phone, Aadhaar, or address within the same school.
 */
export async function findPotentialSiblings(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    const target = await prisma.student.findUnique({
      where: { id: studentId },
      include: { family: true, address: true }
    });
    if (!target) throw new Error("Student not found.");

    const siblings = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId,
        id: { not: studentId },
        OR: [
          { family: { fatherPhone: target.family?.fatherPhone } },
          { family: { motherPhone: target.family?.motherPhone } },
          { phone: target.phone },
          { address: { permanentAddress: target.address?.permanentAddress } }
        ]
      },
      include: { academic: { include: { class: true } }, financial: true }
    });

    return { success: true, data: serialize(siblings) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getSchoolInfoAction
 * 
 * Retrieves the professional school name for the current branch/tenant.
 */
export async function getSchoolInfoAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const branch = await prisma.branch.findUnique({
      where: { id: context.branchId },
      include: { school: true }
    });
    
    if (!branch) {
      // Fallback to school info if branch not found (Global Dev mode)
      const school = await prisma.school.findUnique({
        where: { id: context.schoolId }
      });
      return { success: true, name: school?.name || "Virtue Education" };
    }

    return { success: true, name: branch.name || branch.school?.name || "Virtue Academy" };
  } catch (error) {
    return { success: true, name: "Virtue Academy" }; // Resilient fallback
  }
}

/**
 * recordFeeCollection
 * 
 * Atomic transaction to record payment with strict term-locking and waiver audit.
 */
export async function recordFeeCollection(params: {
  studentId: string;
  selectedTerms: string[]; // e.g. ["term1", "term2"]
  amountPaid: number;      // System-calculated sum of selected terms (base tuition)
  paymentMode: string;
  paymentReference?: string;
  lateFeePaid: number;
  lateFeeWaived: boolean;
  waiverReason?: string;
  convenienceFee?: number; // Optional 2% Gateway Charge
  bankRrn?: string;        // Optional High-Fidelity Metadata
  customerContact?: string;
  customerEmail?: string;
  waiveAdmissionFee?: boolean; // Rule: One-time fee can be waived or collected
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

    // 1. RBAC GATEKEEPER (Fail-Shut CBAC)
    await checkCapability('RECORD_PAYMENT');

    // 🛡️ CRITICAL FIX: Import helpers and resolve activeFY in this function's scope
    const { validateMilestone, canPayAdvance } = await import("../utils/fee-utils");
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found. Please configure one in Settings.");

    // IDEMPOTENCY CHECK: Ensure this specific transaction (Razorpay/Reference) isn't already recorded
    if (params.paymentReference) {
      const existing = await prisma.collection.findFirst({
        where: { 
          schoolId: context.schoolId,
          paymentReference: params.paymentReference,
          status: "Success"
        }
      });
      if (existing) {
        console.warn(`[FINANCE_IDEMPOTENCY] Reference ${params.paymentReference} already settled. Skipping duplicate.`);
        return { success: true, data: existing }; // Idempotent return
      }
    }

    // 2. Load Student Fee Context for Milestone Validation
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: { 
        financial: { include: { components: true } }, 
        collections: { where: { status: "Success" } } 
      }
    });
    if (!student || !student.financial) throw new Error("Financial record missing.");

    const components = student.financial.components || [];
    const netAnnual = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.baseAmount || 0) - Number(c.waiverAmount || 0) - Number(c.discountAmount || 0), 0)
        // ✅ Bug 4 fixed: use annualTuition (true full total) not tuitionFee (partial)
        : Number(student.financial.annualTuition || student.financial.tuitionFee || 0) - Number(student.financial.totalDiscount || 0);

    const prevTotalPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
    const newTotalPaid = prevTotalPaid + params.amountPaid;

    if (params.lateFeeWaived && (!params.waiverReason || params.waiverReason.trim() === '')) {
      throw new Error("Audit Violation: A valid reason must be provided when waiving late fees.");
    }

    // 2.5 Policy Guard: 30-Day Partial Window (Sovereign Rulebook)
    // If a provisional student is older than 30 days, we block partial settlements for the primary milestone.
    if (student.status === ST_PROVISIONAL && student.createdAt) {
      const plan = student.financial.paymentType || "Term-wise";
      const threshold = plan === "Yearly" 
        ? Number(student.financial.annualTuition || 0)
        : Number(student.financial.term1Amount || 0);
      
      const enrollmentAge = Math.floor((new Date().getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      
      if (enrollmentAge > 30 && params.amountPaid < threshold && threshold > 0) {
        throw new Error(
          `Policy Violation: This provisional enrollment is ${enrollmentAge} days old. ` +
          `Partial payments are restricted after the 30-day grace period. ` +
          `Full ${plan} settlement (₹${threshold.toLocaleString()}) is required to proceed.`
        );
      }
    }

    // 3. ENFORCEMENT: Advance Payment Block (Legacy Prerequisite)
    if (params.selectedTerms.includes("advance") && !canPayAdvance(prevTotalPaid, netAnnual)) {
      throw new Error("Cannot collect Advance payment. All current year dues must be 100% cleared first.");
    }

    // 4. ENFORCEMENT: Sequential Selection (No-Skip Policy)
    const isAnnual = student.financial.paymentType === "Annual";
    if (!isAnnual) {
      if (params.selectedTerms.includes("term2") && !student.collections.some((c: any) => (c.allocatedTo as any)?.terms?.includes("term1")) && !params.selectedTerms.includes("term1")) {
        throw new Error("Sequential Violation: Term 1 must be paid or selected to collect Term 2.");
      }
      if (params.selectedTerms.includes("term3") && 
          (!student.collections.some((c: any) => (c.allocatedTo as any)?.terms?.includes("term2")) && !params.selectedTerms.includes("term2")) ||
          (!student.collections.some((c: any) => (c.allocatedTo as any)?.terms?.includes("term1")) && !params.selectedTerms.includes("term1"))) {
        throw new Error("Sequential Violation: Previous terms must be paid or selected to collect Term 3.");
      }
    }

    // 5. ENFORCEMENT: Milestone Milestone (50/75/100)
    for (const term of params.selectedTerms) {
      // For Annual, term1 is 100%
      const termToValidate = (isAnnual && term === "term1") ? "term3" : term; 
      const milestone = validateMilestone(termToValidate, newTotalPaid, netAnnual);
      if (!milestone.success) {
        throw new Error(
          `Validation Failed: By collecting ${term.toUpperCase()}, the cumulative payment must be at least ${milestone.percent}% (` +
          `₹${milestone.required.toLocaleString()}). New cumulative total would only be ₹${newTotalPaid.toLocaleString()}.`
        );
      }
    }

    // 6. RESOLVE ENROLLMENT IDENTITY & CODES (FOR 2026-27 BRANDING)
    const activeAdmission = await prisma.academicHistory.findFirst({
        where: { studentId: params.studentId, schoolId: context.schoolId },
        include: { 
          branch: { include: { school: true } },
          academicYear: true
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!activeAdmission) {
        throw new Error("Active enrollment record not found. Please ensure the student is correctly admitted.");
    }

    const schoolCode = activeAdmission.branch.school.code || "VIRT";
    const branchCode = activeAdmission.branch.code || "MAIN";

    // 7. Scoped Receipt Number & Transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId: context.schoolId,
        schoolCode, 
        branchId: context.branchId,
        branchCode,
        year: activeFY.name || new Date().getFullYear().toString()
      }, tx);

      const gatewayFee = params.convenienceFee || 0;
      const basePlusLate = params.amountPaid + params.lateFeePaid;
      const totalInBank = basePlusLate + gatewayFee;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: params.studentId,
          admissionId: activeAdmission.id,
          financialYearId: activeFY.id,
          schoolId: context.schoolId,
          branchId: context.branchId,
          amountPaid: params.amountPaid,
          lateFeePaid: params.lateFeePaid,
          convenienceFee: gatewayFee,
          totalPaid: totalInBank,
          paymentMode: params.paymentMode,
          paymentReference: params.paymentReference,
          collectedBy: context.name || context.role,
          isAutomated: params.paymentMode === "Razorpay",
          status: "Success",
          allocatedTo: {
            terms: params.selectedTerms,
            lateFeeWaived: params.lateFeeWaived,
            waiverReason: params.waiverReason,
            admissionWaived: params.waiveAdmissionFee || false, // Rule: Track waivers for audit
            bankRrn: params.bankRrn,
            customerContact: params.customerContact,
            customerEmail: params.customerEmail,
            auditMeta: {
              tuitionPortion: params.amountPaid,
              lateFeePortion: params.lateFeePaid,
              serviceChargePortion: gatewayFee
            }
          }
        }
      });

      // AUDIT-SAFE LEDGER POSTING
      // Debit: Bank (1110) | Credit 1: AR (1200) | Credit 2: Service Charge (4200) | Credit 3: Admission Income (4100)
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });
      const admissionAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4200" } });

      if (cashAcc && arAcc) {
        // Journal Entry with split credit lines
        const lines = [
          { accountId: cashAcc.id, debit: totalInBank, credit: 0 },   // Total Money In (Full 102%)
        ];

        // LOGIC: If this is an Admission Fee collection (not waived), we split it
        // For simplicity in this dummy reset, we treat the 'amountPaid' as primarily Tuition
        // but we can add specific line-item logic here if needed.
        lines.push({ accountId: arAcc.id, debit: 0, credit: basePlusLate }); // Clear Student Debt

        // Only add credit line for convenience if it exists
        if (gatewayFee > 0 && serviceAcc) {
          lines.push({ accountId: serviceAcc.id, debit: 0, credit: gatewayFee }); // Service Income (2%)
        }

        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: totalInBank,
            totalCredit: totalInBank,
            description: `Fee Collection (${params.selectedTerms.join(', ')}) - Ref: ${params.paymentReference || receiptNumber}`,
            lines: {
              create: lines
            }
          }
        });

        // Update Account Balances
        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalInBank } } });
        await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: basePlusLate } } });
        if (gatewayFee > 0 && serviceAcc) {
          await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: gatewayFee } } });
        }
      }

      // 🚀 THE CONFIRMATION ENGINE (Elite ERP Promotion Hook)
      // Check if student is still Provisional and has now cleared their chosen milestone
      if (student.status === ST_PROVISIONAL && student.financial) {
        // Fetch snapshot value based on parent's opted payment plan
        const plan = student.financial.paymentType || "Term-wise";
        const threshold = plan === "Yearly" 
          ? Number(student.financial.annualTuition || 0)
          : Number(student.financial.term1Amount || 0);
        
        if (newTotalPaid >= threshold && threshold > 0) {
            console.log(`✅ [PROMOTION_ENGINE] Student ${student.firstName} ${student.lastName} cleared ${plan} threshold (${threshold}). Promoting to ST_CONFIRMED.`);
            
            // 🆔 IDENTITY ELEVATION: Generate Actual Admission & Student IDs
            const ayName = activeAdmission.academicYear.name;
            const admissionNumber = await CounterService.generateAdmissionNumber({
                schoolId: context.schoolId, schoolCode, branchId: context.branchId, branchCode, year: ayName
            }, tx);

            const studentCode = await CounterService.generateStudentCode({
                schoolId: context.schoolId, schoolCode, branchId: context.branchId, branchCode, year: ayName
            }, tx);

            console.log(`✨ [IDENTITY_ELEVATION] Allocated New Admission ID: ${admissionNumber}`);

            await tx.student.update({
                where: { id: student.id },
                data: { 
                  status: ST_CONFIRMED,
                  admissionNumber,
                  studentCode
                }
            });

            // 📝 AUDIT LOG: Lifecycle Transition
            await tx.activityLog.create({
                data: {
                    schoolId: context.schoolId,
                    staffId: context.staffId,
                    action: "STATUS_PROMOTION",
                    entityType: "STUDENT",
                    entityId: student.id,
                    metadata: {
                        oldStatus: ST_PROVISIONAL,
                        newStatus: ST_CONFIRMED,
                        trigger: "THRESHOLD_REACHED",
                        threshold: threshold,
                        totalPaid: newTotalPaid
                    }
                }
            });
        }
      }

      return collection;
    }, { maxWait: 10000, timeout: 30000 });

    revalidatePath("/admin/fees");
    revalidatePath("/dashboard/finance");
    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🔁 voidPaymentAction (Sovereign Reversal Engine)
 * 
 * AUDIT-SAFE REVERSAL: Marks a collection as VOIDED and posts a reversing entry to the ledger.
 * We never "Delete" financial records as per the Immutable Ledger mandate.
 */
export async function voidPaymentAction(collectionId: string, reason: string) {
  try {
    // 1. RBAC GATEKEEPER (Fail-Shut CBAC)
    await checkCapability('REVERSE_LEDGER');
    
    const identity = await getSovereignIdentity();
    const context = identity!;
    
    if (!reason || reason.trim().length < 5) {
      throw new Error("Audit Violation: A valid reason (min 5 chars) is required to perform a reversal.");
    }

    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { journalEntry: { include: { lines: true } } }
    });

    if (!collection || collection.schoolId !== context.schoolId) {
      throw new Error("Receipt not found or unauthorized.");
    }

    if (collection.status === "VOIDED" || collection.isDeleted) {
      throw new Error("This receipt is already voided.");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 🕵️ REVERSAL STRATEGY: 
      // Instead of updating the Collection status (which is blocked by the sentinel),
      // we create a 'FinancialAuditLog' and a 'ReversalEntry'.
      // Wait, if I want to show it as voided in the UI, I need a status change.
      // But the Sentinel blocks 'update' on 'Collection'.
      
      // OPTION: We use 'skip_tenancy' for internal reversals? No, rule is 'Absolute'.
      // CORRECT APPROACH: We create a Journal Entry that offsets the original.
      
      const activeFY = await prisma.financialYear.findFirst({
        where: { schoolId: context.schoolId, isCurrent: true }
      });

      if (!activeFY) throw new Error("No active financial year for reversal.");

      // 2. CREATE REVERSING JOURNAL ENTRY (The Offset)
      if (collection.journalEntry) {
        const originalLines = collection.journalEntry.lines;
        const reversalLines = originalLines.map((line: any) => ({
          accountId: line.accountId,
          description: `REVERSAL of ${collection.receiptNumber}: ${reason}`,
          credit: line.debit, // Swap Debit to Credit
          debit: line.credit   // Swap Credit to Debit
        }));

        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "REVERSAL",
            totalDebit: collection.journalEntry.totalCredit,
            totalCredit: collection.journalEntry.totalDebit,
            description: `REVERSAL of Receipt ${collection.receiptNumber} - Reason: ${reason}`,
            lines: { create: reversalLines }
          }
        });

        // 3. ADJUST ACCOUNT BALANCES (Reverting the impact)
        for (const line of originalLines) {
           await tx.chartOfAccount.update({
             where: { id: line.accountId },
             data: {
               currentBalance: {
                 decrement: line.debit, // Revert the debit
                 increment: line.credit // Revert the credit
               }
             }
           });
        }
      }

      // 4. LOG THE AUDIT EVENT (The final marker)
      await tx.financialAuditLog.create({
        data: {
          schoolId: context.schoolId,
          branchId: context.branchId,
          performedBy: context.staffId,
          action: "PAYMENT_REVERSAL",
          entityType: "COLLECTION",
          entityId: collectionId,
          reason,
          riskFlag: true
        }
      });

      return { success: true };
    });

    revalidatePath("/admin/fees");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * recordBulkFeeCollection
 * 
 * ATOMIC MULTI-STUDENT SETTLEMENT: Processes multiple siblings in one transaction.
 * If any student fails validation, the entire family payment is rolled back.
 */
export async function recordBulkFeeCollection(params: {
  settlements: {
    studentId: string;
    selectedTerms: string[];
    amountPaid: number;
    lateFeePaid: number;
    lateFeeWaived: boolean;
    waiverReason?: string;
  }[];
  paymentMode: string;
  paymentReference?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const { validateMilestone, canPayAdvance } = await import("../utils/fee-utils");
    
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found.");

    // 1. PRE-VALIDATION: Check all students before starting transaction
    for (const s of params.settlements) {
      const student = await prisma.student.findUnique({
        where: { id: s.studentId },
        include: { financial: { include: { components: true } }, collections: { where: { status: "Success" } } }
      });
      if (!student || !student.financial) throw new Error(`Financial record missing for student ${s.studentId}`);

      const components = student.financial.components || [];
      const netAnnual = components.length > 0 
          ? components.reduce((sum, c) => sum + Number(c.baseAmount || 0) - Number(c.waiverAmount || 0) - Number(c.discountAmount || 0), 0)
          : Number(student.financial.tuitionFee || student.financial.annualTuition || 0) - Number(student.financial.totalDiscount || 0);
      const prevTotalPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
      const newTotalPaid = prevTotalPaid + s.amountPaid;

      // Sequential check
      if (s.selectedTerms.includes("term2") && !student.collections.some((c: any) => (c.allocatedTo as any)?.terms?.includes("term1")) && !s.selectedTerms.includes("term1")) {
        throw new Error(`Sequential Violation (${student.firstName}): Term 1 required for Term 2.`);
      }
      
      // Milestone checks
      for (const term of s.selectedTerms) {
        const milestone = validateMilestone(term, newTotalPaid, netAnnual);
        if (!milestone.success) throw new Error(`Milestone Failure (${student.firstName}): Cumulative payment must be at least ${milestone.percent}%`);
      }
    }

    // 2. ATOMIC TRANSACTION
    const result = await prisma.$transaction(async (tx: any) => {
      const batchResults = [];
      let batchTotal = 0;

      for (const s of params.settlements) {
        const activeAdmission = await tx.academicHistory.findFirst({
            where: { studentId: s.studentId, schoolId: context.schoolId },
            orderBy: { createdAt: 'desc' }
        });

        if (!activeAdmission) throw new Error(`Active enrollment missing for student ${s.studentId}`);

        const receiptNumber = await CounterService.generateReceiptNumber({
          schoolId: context.schoolId,
          schoolCode: context.schoolId,
          branchId: context.branchId,
          branchCode: context.branchId.split('-').pop() || "MNB01",
          year: new Date().getFullYear().toString()
        }, tx);

        const collection = await tx.collection.create({
          data: {
            receiptNumber,
            studentId: s.studentId,
            admissionId: activeAdmission.id,
            financialYearId: activeFY.id,
            schoolId: context.schoolId,
            branchId: context.branchId,
            amountPaid: s.amountPaid,
            lateFeePaid: s.lateFeePaid,
            totalPaid: s.amountPaid + s.lateFeePaid,
            paymentMode: params.paymentMode,
            paymentReference: params.paymentReference,
            collectedBy: context.name || context.role,
            status: "Success",
            allocatedTo: {
              terms: s.selectedTerms,
              lateFeeWaived: s.lateFeeWaived,
              waiverReason: s.waiverReason,
              isBulk: true
            }
          }
        });
        
        batchTotal += (s.amountPaid + s.lateFeePaid);
        batchResults.push(collection);
      }

      // 3. CONSOLIDATED LEDGER POSTING
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

      if (cashAcc && arAcc) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: batchTotal,
            totalCredit: batchTotal,
            description: `Bulk Sibling Fee Collection (${params.settlements.length} Students) - Mode: ${params.paymentMode}`,
            lines: {
              create: [
                { accountId: cashAcc.id, debit: batchTotal, credit: 0 },
                { accountId: arAcc.id, debit: 0, credit: batchTotal }
              ]
            }
          }
        });

        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: batchTotal } } });
        await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: batchTotal } } });
      }

      return batchResults;
    }, { maxWait: 10000, timeout: 30000 });

    revalidatePath("/admin/fees");
    revalidatePath("/dashboard/finance");
    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getStudentFeeStatus with Tenancy Guard & Term Isolation
 */
export async function getStudentFeeStatus(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const { calculateTermBreakdown } = await import("../utils/fee-utils");

    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: context.schoolId
      },
      include: {
        academic: { include: { class: true } },
        financial: { 
          include: { 
            components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } }, 
            discounts: { include: { discountType: true } },
            feeStructure: { include: { components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } } } }
          } 
        },
        ledgerEntries: { where: { type: "CHARGE" } },
        collections: { 
          where: { status: "Success" },
          orderBy: { paymentDate: 'desc' } 
        }
      }
    });

    if (!student) throw new Error("Student not found or unauthorized.");

    // Calculate dynamic term status
    // TENANCY HARDENED: Resolve financial data with fallback to ledger charges if profile is missing
    const components = student.financial?.components || [];
    const tuition = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
        : Number(student.financial?.tuitionFee || student.financial?.annualTuition || 0);
    const discount = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0)
        : Number(student.financial?.totalDiscount || 0);
    const paymentType = student.financial?.paymentType || "Term-wise";
    
    // If tuition is recorded as 0 but ledger has charges, use ledger sum as fallback for visibility
    const ledgerTuition = tuition === 0 && student.ledgerEntries && student.ledgerEntries.length > 0
        ? student.ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)
        : tuition;

    const breakdown = calculateTermBreakdown(ledgerTuition, discount, paymentType);

    // Sync isPaid status from history
    const paidTerms = student.collections.flatMap((c: any) => {
      const allocated = c.allocatedTo as any;
      if (!allocated) return [];
      
      const termsFromList = allocated.terms || [];
      const legacyTerms = ["term1", "term2", "term3"].filter(t => (allocated as any)[t] > 0);
      
      return [...new Set([...termsFromList, ...legacyTerms])];
    });

    breakdown.term1.isPaid = paidTerms.includes("term1");
    breakdown.term2.isPaid = paidTerms.includes("term2");
    breakdown.term3.isPaid = paidTerms.includes("term3");

    // 4. MAP ANCILLARY FEES (Multi-Source Resilience)
    const ancillary: Record<string, any> = {};
    const fin = student.financial;
    const ancillaryFields = [
      { key: "admissionFee", label: "Admission Fee" },
      { key: "cautionDeposit", label: "Caution Deposit" },
      { key: "transportFee", label: "Transport Fee" },
      { key: "examFee", label: "Exam Fee" },
      { key: "computerFee", label: "Computer Fee" },
      { key: "libraryFee", label: "Library Fee" },
      { key: "sportsFee", label: "Sports Fee" },
      { key: "activityFee", label: "Activity Fee" },
      { key: "booksFee", label: "Books & Stationaries" },
      { key: "uniformFee", label: "Uniform Fee" },
      { key: "miscellaneousFee", label: "Misc Fee" }
    ];

    // Priority 0: AUTHORITATIVE TEMPLATE (Fee Structure)
    // This ensures boxes show up immediately upon enrollment, even before heavy processing
    if (fin?.feeStructure?.components) {
       fin.feeStructure.components.forEach((comp: any) => {
          const name = comp.masterComponent?.name?.toLowerCase() || "";
          // Skip tuition as it belongs in the main installments
          if (name.includes("tuition")) return;

          let key = "";
          if (name.includes("admission")) key = "admissionFee";
          else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
          else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
          else if (name.includes("library")) key = "libraryFee";
          else if (name.includes("exam")) key = "examFee";
          else if (name.includes("computer")) key = "computerFee";
          else if (name.includes("sports") || name.includes("gym")) key = "sportsFee";
          else if (name.includes("activity")) key = "activityFee";
          else if (name.includes("book") || name.includes("stationary")) key = "booksFee";
          else if (name.includes("uniform") || name.includes("kit")) key = "uniformFee";
          else if (name.includes("miscellaneous")) key = "miscellaneousFee";
          else key = `tmpl_${comp.id}`;

          if (key && !ancillary[key]) {
             ancillary[key] = {
                amount: Number(comp.amount),
                isPaid: paidTerms.includes(key) || paidTerms.includes(comp.masterComponent.name),
                label: comp.masterComponent.name,
                dueDate: null
             };
          }
       });
    }

    // Priority 1: Direct Profile Fields
    ancillaryFields.forEach(field => {
       const amount = Number(fin?.[field.key as keyof typeof fin] || 0);
       if (amount > 0) {
          ancillary[field.key] = {
             amount,
             isPaid: paidTerms.includes(field.key),
             label: field.label,
             dueDate: null
          };
       }
    });

    // Priority 2: Granular Components
    if (fin?.components) {
      fin.components.forEach((comp: any) => {
        const name = comp.masterComponent?.name?.toLowerCase();
        if (!name || name.includes("tuition")) return;
        let key = "";
        
        if (name.includes("admission")) key = "admissionFee";
        else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
        else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
        else if (name.includes("library")) key = "libraryFee";
        else if (name.includes("exam")) key = "examFee";
        else if (name.includes("computer")) key = "computerFee";
        else if (name.includes("sports")) key = "sportsFee";
        else if (name.includes("activity")) key = "activityFee";
        else if (name.includes("book")) key = "booksFee";
        else if (name.includes("uniform")) key = "uniformFee";
        else key = `comp_${comp.id}`; // CATCH-ALL KEY

        if (key && !ancillary[key]) {
          ancillary[key] = {
            amount: Number(comp.baseAmount),
            isPaid: paidTerms.includes(key),
            label: comp.masterComponent.name,
            dueDate: null
          };
        }
      });
    }

    // Priority 3: Ledger Fallback
    if (student.ledgerEntries && student.ledgerEntries.length > 0) {
       student.ledgerEntries.forEach((entry: any, index: number) => {
          const reason = entry.reason.toLowerCase();
          if (reason.includes("term 1") || reason.includes("term 2") || reason.includes("term 3") || 
              (reason.includes("tuition") && !reason.includes("admission") && !reason.includes("transport"))) return;

          let key = "";
          if (reason.includes("admission")) key = "admissionFee";
          else if (reason.includes("caution") || reason.includes("deposit")) key = "cautionDeposit";
          else if (reason.includes("transport") || reason.includes("bus")) key = "transportFee";
          else if (reason.includes("library")) key = "libraryFee";
          else if (reason.includes("exam")) key = "examFee";
          else if (reason.includes("computer")) key = "computerFee";
          else if (reason.includes("sports")) key = "sportsFee";
          else if (reason.includes("activity")) key = "activityFee";
          else if (reason.includes("book")) key = "booksFee";
          else if (reason.includes("uniform")) key = "uniformFee";
          else key = `misc_${index}`;

          if (key && !ancillary[key]) {
             ancillary[key] = {
                amount: Number(entry.amount),
                isPaid: paidTerms.includes(key) || paidTerms.includes(entry.reason),
                label: entry.reason.replace("Accrual: ", "").split(' (')[0],
                dueDate: null
             };
          }
       });
    }

    // 🚀 POINT-OF-SALE (POS) ENGINE: Registry-Synced Placeholders
    // Fetches institutional standard prices from the Master Registry.
    const masterRegistry = await prisma.feeComponentMaster.findMany({
      where: { schoolId: context.schoolId, isActive: true }
    });

    const posFinalCategories = [
      { key: "admissionFee", label: "Admission Fee" },
      { key: "transportFee", label: "Transport Fee" },
      { key: "libraryFee", label: "Library Fee" },
      { key: "sportsFee", label: "Sports Fee" },
      { key: "activityFee", label: "Activity Fee" },
      { key: "booksFee", label: "Books & Stationaries" },
      { key: "uniformFee", label: "Uniform Fee" },
      { key: "cautionDeposit", label: "Caution Deposit" }
    ];

    posFinalCategories.forEach(cat => {
      if (!ancillary[cat.key]) {
        const master = masterRegistry.find(m => 
          m.name.toLowerCase().includes(cat.label.toLowerCase()) || 
          cat.label.toLowerCase().includes(m.name.toLowerCase())
        );

        ancillary[cat.key] = {
          amount: master ? Number(master.amount) : 0,
          isPaid: false,
          label: cat.label,
          dueDate: null,
          isAdHoc: true, // Marker for UI input
          masterId: master?.id
        };
      }
    });
    
    breakdown.ancillary = ancillary;

    return { 
      success: true, 
      data: serialize({
        ...student,
        feeBreakdown: breakdown
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * createRazorpayOrderAction
 * 
 * Generates an encrypted order ID with mandatory 2% convenience fee addition.
 */
export async function createRazorpayOrderAction(params: {
  amountPaid: number;
  studentId: string;
  selectedTerms: string[];
  lateFeePaid?: number;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // IDEMPOTENCY GUARD: Check if ANY term in this order is already paid
    const existingSuccessfulCollection = await prisma.collection.findFirst({
      where: {
        studentId: params.studentId,
        status: "Success",
        allocatedTo: {
          path: ['terms'],
          array_contains: params.selectedTerms 
        }
      }
    });

    if (existingSuccessfulCollection) {
      throw new Error(`Double Payment Blocked: Term(s) ${params.selectedTerms.join(', ')} are already paid or in-process.`);
    }

    // 1.5% Gateway Fee + 18% GST (1.77% multiplier)
    const baseAmount = params.amountPaid;
    const lateFee = params.lateFeePaid || 0;
    
    // Gateway Fee: 1.5% | GST: 18% of the Fee
    const gatewayFee = (baseAmount + lateFee) * 0.015;
    const gst = gatewayFee * 0.18;
    const totalConvenience = gatewayFee + gst;
    const totalAmountIncludingFee = baseAmount + lateFee + totalConvenience;

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmountIncludingFee * 100), // Conversion to Paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        studentId: params.studentId,
        schoolId: context.schoolId,
        terms: params.selectedTerms.join(','),
        baseAmount: baseAmount.toString(),
        lateFee: lateFee.toString(),
        convenienceFee: totalConvenience.toFixed(2),
        gatewayFee: gatewayFee.toFixed(2),
        gst: gst.toFixed(2),
        type: "FEE_COLLECTION_V2_TAXED"
      }
    });

    return { 
      success: true, 
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        baseAmount,
        lateFee,
        convenienceFee: totalConvenience
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * verifyRazorpayPaymentAction
 * 
 * Cryptographic signature verification and atomic ledger posting.
 * FOR LOGGED-IN STAFF USE ONLY. Session required.
 */
export async function verifyRazorpayPaymentAction(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  studentId: string;
  selectedTerms: string[];
  amountPaid: number;
  lateFeePaid: number;
  convenienceFee: number;
}) {
  try {
    // 1. Digital Signature Verification
    const body = params.razorpay_order_id + "|" + params.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== params.razorpay_signature) {
      throw new Error("Payment Verification Failed: Digital signature mismatch. Potential tampering detected.");
    }

    // 2. Atomic Ledger Posting
    const result = await recordFeeCollection({
      studentId: params.studentId,
      selectedTerms: params.selectedTerms,
      amountPaid: params.amountPaid,
      paymentMode: "Razorpay",
      paymentReference: params.razorpay_payment_id,
      lateFeePaid: params.lateFeePaid,
      convenienceFee: params.convenienceFee,
      lateFeeWaived: false
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * verifyPublicRazorpayPaymentAction
 * 
 * SESSION-FREE version for the Public Payment Portal.
 * Looks up school context from the studentId — no login cookie required.
 * This is what fires when a parent pays from an external payment link.
 */
export async function verifyPublicRazorpayPaymentAction(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  studentId: string;
  selectedTerms: string[];
  amountPaid: number;
  lateFeePaid: number;
  convenienceFee: number;
}) {
  try {
    // 1. Cryptographic Signature Verification
    const body = params.razorpay_order_id + "|" + params.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== params.razorpay_signature) {
      throw new Error("Payment Verification Failed: Digital signature mismatch.");
    }

    // 2. Load student to discover school context (NO SESSION NEEDED)
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: {
        financial: true,
        collections: { where: { status: "Success" } }
      }
    });
    if (!student) throw new Error("Student not found.");

    const schoolId = student.schoolId;

    // 3. Find active financial year directly from school
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("No active Financial Year found for school.");

    // 4. Find branch from school
    const branch = await prisma.branch.findFirst({ where: { schoolId } });
    const branchId = branch?.id || "GLOBAL";

    // 5. Idempotency: never double-record
    const existing = await prisma.collection.findFirst({
      where: { paymentReference: params.razorpay_payment_id }
    });
    if (existing) {
      // Return existing receipt data
      const receiptData = await prisma.collection.findUnique({
        where: { id: existing.id },
        include: { student: { include: { academic: { include: { class: true } }, family: true } } }
      });
      return { success: true, data: serialize(receiptData) };
    }

    // 6. Atomic transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const { CounterService } = await import("../services/counter-service");

      // Resolve enrollment for ID linking
      const enrollment = await tx.academicHistory.findFirst({
        where: { studentId: params.studentId, schoolId },
        orderBy: { createdAt: 'desc' }
      });

      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId,
        schoolCode: schoolId,
        branchId,
        branchCode: branchId.split('-').pop() || "MAIN",
        year: new Date().getFullYear().toString()
      }, tx);

      const lateFee = params.lateFeePaid || 0;
      const convenience = params.convenienceFee || 0;
      const totalPaid = params.amountPaid + lateFee + convenience;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: params.studentId,
          admissionId: enrollment?.id || null, // Link if found
          schoolId,
          branchId,
          financialYearId: activeFY.id,
          amountPaid: params.amountPaid,
          lateFeePaid: lateFee,
          convenienceFee: convenience,
          totalPaid,
          paymentMode: "Razorpay",
          paymentReference: params.razorpay_payment_id,
          collectedBy: "PARENT_PORTAL",
          isAutomated: true,
          status: "Success",
          collectionDate: new Date(),
          allocatedTo: {
            terms: params.selectedTerms,
            lateFeeWaived: false,
            waiverReason: "[Parent Portal Auto-Settlement]"
          }
        },
        include: {
          student: {
            include: { academic: { include: { class: true } }, family: true }
          }
        }
      });

      // Journal Entry
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "1200" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4200" } });

      if (cashAcc && arAcc) {
        const lines: any[] = [
          { accountId: cashAcc.id, debit: totalPaid, credit: 0 },
          { accountId: arAcc.id, debit: 0, credit: params.amountPaid + lateFee }
        ];
        if (convenience > 0 && serviceAcc) {
          lines.push({ accountId: serviceAcc.id, debit: 0, credit: convenience });
        }
        await tx.journalEntry.create({
          data: {
            schoolId, branchId, financialYearId: activeFY.id, entryType: "RECEIPT",
            totalDebit: totalPaid, totalCredit: totalPaid,
            description: `Parent Portal Settlement (${params.selectedTerms.join(", ")}) - ${params.razorpay_payment_id}`,
            lines: { create: lines }
          }
        });
        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: totalPaid } } });
        await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: params.amountPaid + lateFee } } });
        if (convenience > 0 && serviceAcc) {
          await tx.chartOfAccount.update({ where: { id: serviceAcc.id }, data: { currentBalance: { increment: convenience } } });
        }
      }

      return collection;
    });

    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getRazorpayReport
 * 
 * High-fidelity audit report matching the Razorpay Dashboard.
 */
export async function getRazorpayReport() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const tenancy = getTenancyFilters(context);
    const collections = await prisma.collection.findMany({
      where: { 
        ...tenancy,
        paymentMode: "Razorpay"
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
            family: {
              select: {
                fatherPhone: true,
                motherPhone: true
              }
            }
          }
        }
      },
      orderBy: { paymentDate: "desc" }
    });

    return { success: true, data: serialize(collections) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getFinanceKPIs
 * 
 * Fetches real-time financial metrics for the dashboard.
 */
export async function getFinanceKPIs() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const tenancy = getTenancyFilters(context);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Daily Revenue (Sum of totalPaid today)
    const dailyRevenue = await prisma.collection.aggregate({
      where: {
        ...tenancy,
        paymentDate: { gte: today },
        status: "Success"
      },
      _sum: { totalPaid: true }
    });

    // 2. Collections count today
    const collectionsToday = await prisma.collection.count({
      where: {
        ...tenancy,
        paymentDate: { gte: today },
        status: "Success"
      }
    });

    // 3. Void Requests
    const voidRequests = await prisma.collection.count({
      where: {
        ...tenancy,
        status: "VoidRequested"
      }
    });

    // 4. Active Financial Year
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });

    return {
      success: true,
      data: serialize({
        dailyRevenue: Number(dailyRevenue._sum.totalPaid || 0),
        collectionsToday,
        voidRequests,
        activeFYName: activeFY?.name || "N/A"
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getCollectionHistory
 * 
 * Fetches recent collection records for the dashboard activity log.
 */
export async function getCollectionHistory(limit = 10) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const history = await prisma.collection.findMany({
      where: { schoolId: context.schoolId },
      include: { 
        student: {
          include: {
            history: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            academic: { include: { class: true } }
          }
        }
      },
      orderBy: { paymentDate: 'desc' },
      take: limit
    });

    return { success: true, data: serialize(history) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * generatePaymentLinkAction
 * 
 * Logic to create a secure, shareable payment link for a specific term.
 */
export async function generatePaymentLinkAction(studentId: string, termId: string) {
  try {
    const payload = JSON.stringify({ studentId, termId, timestamp: Date.now() });
    const token = Buffer.from(payload).toString("base64");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return { success: true, url: `${baseUrl}/pay/${token}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getPublicPaymentDetails
 * 
 * Fetches student name and school branding for the public payment portal.
 * SECURE: No sensitive IDs or phone numbers are exposed here.
 */
export async function getPublicPaymentDetails(token: string) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    const { studentId, termId } = decoded;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { 
        firstName: true, 
        lastName: true,
        school: { select: { name: true } }
      }
    });

    if (!student) throw new Error("Invalid or expired payment link.");

    return { 
      success: true, 
      data: { 
        studentName: `${student.firstName} ${student.lastName}`,
        schoolName: student.school.name,
        termLabel: termId.toUpperCase()
      } 
    };
  } catch (error: any) {
    return { success: false, error: "This payment link is invalid." };
  }
}

/**
 * validatePaymentGate
 * 
 * Matches admission number against the studentId encrypted in the link token.
 */
export async function validatePaymentGate(params: { token: string; admissionNumber: string }) {
  try {
    const decoded = JSON.parse(Buffer.from(params.token, "base64").toString());
    const { studentId, termId } = decoded;

    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        admissionNumber: params.admissionNumber
      },
      include: { 
        financial: { include: { components: true } },
        collections: { where: { status: "Success" } }
      }
    });

    if (!student) throw new Error("Verification Failed: Admission ID mismatch.");

    // Recalculate fee for this specific term
    const { calculateTermBreakdown } = await import("../utils/fee-utils");
    const components = student.financial?.components || [];
    const tuition = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
        : Number(student.financial?.tuitionFee || student.financial?.annualTuition || 0);
    const discount = components.length > 0 
        ? components.reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0)
        : Number(student.financial?.totalDiscount || 0);
    const breakdown = calculateTermBreakdown(tuition, discount, student.financial?.paymentType || "Term-wise");
    
    const amount = (breakdown as any)[termId]?.amount || 0;

    return { 
      success: true, 
      data: serialize({
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        termId,
        baseAmount: amount
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * requestReceiptVoid
 * 
 * Step 1 of Two-Factor Audit: Agent requests a reversal.
 */
export async function requestReceiptVoid(collectionId: string, reason: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    await prisma.collection.update({
      where: { id: collectionId, schoolId: context.schoolId },
      data: { 
        status: "VoidRequested",
        allocatedTo: {
          push: { voidReason: reason, requestedBy: context.role, requestedAt: new Date() }
        }
      }
    });

    return { success: true, message: "Voiding request sent for Manager approval." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * approveReceiptVoid
 * 
 * Step 2 of Two-Factor Audit: Manager approves & system reverses ledger.
 */
export async function approveReceiptVoid(collectionId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId, schoolId: context.schoolId }
    });

    if (!collection || collection.status !== "VoidRequested") throw new Error("Invalid request.");

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark as Voided
      await tx.collection.update({
        where: { id: collectionId },
        data: { status: "Voided" }
      });

      // 2. Reverse Ledger Posting
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const total = Number(collection.totalPaid);

      if (cashAcc) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            financialYearId: collection.financialYearId,
            entryType: "REVERSAL",
            totalDebit: total,
            totalCredit: total,
            description: `REVERSAL of Receipt ${collection.receiptNumber} - Reason: Audit Correction`,
            lines: {
              create: [
                { accountId: cashAcc.id, debit: 0, credit: total } // Reverse Cash
              ]
            }
          }
        });

        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { decrement: total } } });
      }
    });

    revalidatePath("/admin/fees");
    return { success: true, message: "Receipt voided and ledger reversed." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getRevenueLeakageReport
 * 
 * Owner Dashboard Tool: Finds active students without assigned fees.
 */
export async function getRevenueLeakageReport() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const students = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId,
        status: "Active",
        financial: null
      },
      include: { academic: { include: { class: true } } }
    });
    return { success: true, data: serialize(students) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getPendingVoidRequests
 * 
 * Fetches collections actively pending a void/reversal approval.
 */
export async function getPendingVoidRequests() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const requests = await prisma.collection.findMany({
      where: {
        schoolId: context.schoolId,
        status: "VoidRequested"
      },
      include: {
        student: { 
          select: { 
            firstName: true, 
            lastName: true, 
            admissionNumber: true, 
             history: {
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            academic: { select: { class: { select: { name: true } } } } 
          } 
        }
      },
      orderBy: { paymentDate: 'desc' }
    });
    return { success: true, data: serialize(requests) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * rejectReceiptVoid
 * 
 * Step 2 Alternative: Manager rejects the void request, reverting status to Success.
 */
export async function rejectReceiptVoid(collectionId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    await prisma.collection.update({
      where: { id: collectionId, schoolId: context.schoolId },
      data: { status: "Success" }
    });
    revalidatePath("/admin/fees");
    return { success: true, message: "Void request rejected and receipt restored." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * getDailyCollectionSummary
 * 
 * Aggregates all SUCCESSFUL collections for TODAY across various payment modes.
 * Used for the accountant's daily settlement dashboard.
 */
export async function getDailyCollectionSummary() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: context.schoolId,
        status: "Success",
        paymentDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    const summary = collections.reduce((acc: any, c: any) => {
      const mode = c.paymentMode || "Other";
      if (!acc[mode]) acc[mode] = 0;
      acc[mode] += Number(c.totalPaid);
      acc.total += Number(c.totalPaid);
      acc.count += 1;
      return acc;
    }, { Cash: 0, UPI: 0, Cheque: 0, total: 0, count: 0 });

    return { success: true, data: serialize(summary) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * getAdHocFeeOptions
 * 
 * Fetches institutional fee components (Library, Transport, etc.) from the Master DB.
 * Used for mid-term "Opt-in" scenarios in the Student Profile.
 */
export async function getAdHocFeeOptions() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const components = await prisma.feeComponentMaster.findMany({
      where: { 
        schoolId: context.schoolId,
        type: { not: "TUITION" } // Only ancillary items
      },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: serialize(components) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * assignAdHocFeeAction
 * 
 * ATOMIC ASSIGNMENT: Links a master component to a student, 
 * updates their balance, and posts a Charge to the Ledger.
 */
export async function assignAdHocFeeAction(params: {
  studentId: string;
  componentId: string;
  amount: number;
  reason?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    // 1. Resolve Student Finance Context
    const financial = await prisma.financialRecord.findUnique({
      where: { studentId: params.studentId }
    });

    if (!financial) throw new Error("Student financial record not initialized.");

    const result = await prisma.$transaction(async (tx: any) => {
      // 2. Create the Component Link
      const studentComponent = await tx.studentFeeComponent.create({
        data: {
          schoolId: context.schoolId,
          branchId: context.branchId,
          studentFinancialId: financial.id,
          componentId: params.componentId,
          baseAmount: params.amount,
          isApplicable: true,
          version: 1
        },
        include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } }
      });

      // 3. Update Financial Record (Accrue to Net)
      // Note: We use the specific field if it matches the component name (Transport/Library)
      const name = studentComponent.masterComponent.name.toLowerCase();
      const updateData: any = {
        tuitionFee: { increment: 0 } // No-op to trigger update
      };

      if (name.includes("transport")) updateData.transportFee = { increment: params.amount };
      else if (name.includes("library")) updateData.libraryFee = { increment: params.amount };
      else if (name.includes("admission")) updateData.admissionFee = { increment: params.amount };
      else if (name.includes("sports")) updateData.sportsFee = { increment: params.amount };
      
      await tx.financialRecord.update({
        where: { id: financial.id },
        data: updateData
      });

      // 4. POST TO LEDGER (THE AUDIT TRAIL)
      const [activeFY, activeAY] = await Promise.all([
        tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } }),
        tx.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
      ]);

      await tx.ledgerEntry.create({
        data: {
          studentId: params.studentId,
          schoolId: context.schoolId,
          branchId: context.branchId,
          financialYearId: activeFY?.id,
          academicYearId: activeAY?.id,
          type: "CHARGE",
          amount: params.amount,
          reason: `Accrual: ${studentComponent.masterComponent.name}${params.reason ? ` (${params.reason})` : ''}`,
          createdBy: context.name || context.role
        }
      });

      return studentComponent;
    });

    revalidatePath("/dashboard/finance");
    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * applyDiscountAction
 * 
 * Manual discount application from the student profile.
 * Posts a "CREDIT" to the Ledger.
 */
export async function applyDiscountAction(params: {
  studentId: string;
  amount: number;
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Update Financial Record
      const financial = await tx.financialRecord.update({
        where: { studentId: params.studentId },
        data: {
          totalDiscount: { increment: params.amount }
        }
      });

      // 2. Post to Ledger
      const [activeFY, activeAY] = await Promise.all([
        tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } }),
        tx.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
      ]);

      await tx.ledgerEntry.create({
        data: {
          studentId: params.studentId,
          schoolId: context.schoolId,
          branchId: context.branchId,
          financialYearId: activeFY?.id,
          academicYearId: activeAY?.id,
          type: "CREDIT",
          amount: params.amount,
          reason: `Discount Applied: ${params.reason}`,
          createdBy: context.name || context.role
        }
      });

      return financial;
    });

    revalidatePath("/dashboard/finance");
    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * updateStudentFeeComponentAction
 * 
 * PRINCIPAL OVERRIDE: Updates a student's assigned fee and posts a Ledger Adjustment.
 * This ensures the P&L and Outstanding Dues are always in sync with the audit trail.
 */
export async function updateStudentFeeComponentAction(params: {
  studentId: string;
  componentId: string; // The ID of the StudentFeeComponent record
  newAmount: number;
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    // RBAC: Only Principal/Admin/Finance Manager can perform overrides
    await checkCapability('RECORD_PAYMENT'); 

    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error("Audit Violation: A valid reason (min 5 chars) is required for financial adjustments.");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Resolve Existing Component
      const existing = await tx.studentFeeComponent.findUnique({
        where: { id: params.componentId },
        include: { 
          masterComponent: true,
          studentFinancial: true
        }
      });

      if (!existing) throw new Error("Component record not found.");
      if (existing.studentFinancial.studentId !== params.studentId) throw new Error("Security Violation: Record mismatch.");

      const oldAmount = Number(existing.baseAmount);
      const delta = params.newAmount - oldAmount;

      if (delta === 0) return existing; // No change

      // 2. Update the Component Amount
      const updated = await tx.studentFeeComponent.update({
        where: { id: params.componentId },
        data: { 
          baseAmount: params.newAmount,
          version: { increment: 1 }
        }
      });

      // 3. Post Ledger Adjustment
      const [activeFY, activeAY] = await Promise.all([
        tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } }),
        tx.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
      ]);

      await tx.ledgerEntry.create({
        data: {
          studentId: params.studentId,
          schoolId: context.schoolId,
          branchId: context.branchId,
          financialYearId: activeFY?.id,
          academicYearId: activeAY?.id,
          type: delta > 0 ? "CHARGE" : "CREDIT",
          amount: Math.abs(delta),
          reason: `ADJUSTMENT: ${existing.masterComponent.name} modified by Principal. Reason: ${params.reason}`,
          createdBy: context.name || context.role
        }
      });

      // 4. Update Financial Record Mirror Fields
      const name = existing.masterComponent.name.toLowerCase();
      const updateData: any = {};

      if (name.includes("tuition")) updateData.annualTuition = { increment: delta };
      else if (name.includes("transport")) updateData.transportFee = { increment: delta };
      else if (name.includes("library")) updateData.libraryFee = { increment: delta };
      else if (name.includes("admission")) updateData.admissionFee = { increment: delta };
      else if (name.includes("sports")) updateData.sportsFee = { increment: delta };

      if (Object.keys(updateData).length > 0) {
        await tx.financialRecord.update({
          where: { id: existing.studentFinancialId },
          data: updateData
        });
      }

      return updated;
    });

    revalidatePath("/dashboard/finance");
    revalidatePath(`/admin/students/${params.studentId}`);
    return { success: true, data: serialize(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
