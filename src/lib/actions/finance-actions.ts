"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { getGuardianIdentity } from "../auth/guardian-backbone";
import { serializeDecimal } from "@/lib/utils/serialization";
import { getTenancyFilters } from "../utils/tenancy";
import { CounterService } from "../services/counter-service";
import { Decimal } from "@prisma/client/runtime/library";
import { razorpay } from "@/lib/razorpay";
import crypto from "crypto";
import { checkCapability } from "../auth/rbac";
import { ST_CONFIRMED, ST_PROVISIONAL } from "../constants/admission-statuses";

// Parents pay round figures (e.g. ₹33,000 instead of ₹33,045). This tolerance is INTENTIONAL.
const ROUND_FIGURE_TOLERANCE_INR = 49;

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
      include: { family: true }
    });
    if (!target) throw new Error("Student not found.");

    const conditions: any[] = [];
    
    // 1. Aadhaar Match (Authority check)
    if (target.family?.fatherAadhaar && target.family.fatherAadhaar.trim() !== "") {
      conditions.push({ family: { fatherAadhaar: target.family.fatherAadhaar.trim() } });
    }
    if (target.family?.motherAadhaar && target.family.motherAadhaar.trim() !== "") {
      conditions.push({ family: { motherAadhaar: target.family.motherAadhaar.trim() } });
    }

    // 2. Fallback: Double-Phone Check & Last Name Match
    if (conditions.length === 0) {
      const fatherPhone = target.family?.fatherPhone?.trim();
      const motherPhone = target.family?.motherPhone?.trim();
      if (fatherPhone && motherPhone) {
        const nameFilter = target.lastName 
          ? { lastName: { equals: target.lastName.trim(), mode: 'insensitive' as const } } 
          : {};
        conditions.push({
          AND: [
            { family: { fatherPhone } },
            { family: { motherPhone } },
            nameFilter
          ]
        });
      }
    }

    if (conditions.length === 0) {
      return { success: true, data: serializeDecimal([]) };
    }

    const siblings = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId,
        id: { not: studentId },
        OR: conditions
      },
      include: { academic: { include: { class: true } }, financial: true }
    });

    return { success: true, data: serializeDecimal(serialize(siblings)) };
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
  bookReceiptNo?: string;  // Physical receipt book/bill number
  lateFeePaid: number;
  lateFeeWaived: boolean;
  waiverReason?: string;
  convenienceFee?: number; // Optional 2% Gateway Charge
  bankRrn?: string;        // Optional High-Fidelity Metadata
  customerContact?: string;
  customerEmail?: string;
  waiveAdmissionFee?: boolean; // Rule: One-time fee can be waived or collected
  ancillaryItems?: { key: string; amount: number; label?: string }[]; // BUG-4 FIX: Ancillary fees settled in this collection (e.g. admissionFee, transportFee)
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

    // 1. RBAC GATEKEEPER (Fail-Shut CBAC)
    await checkCapability('RECORD_PAYMENT');

    // 🛡️ CRITICAL FIX: Import helpers and resolve activeFY in this function's scope
    const { validateMilestone, canPayAdvance, calculateTermBreakdown } = await import("../utils/fee-utils");
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found. Please configure one in Settings.");

    // IDEMPOTENCY CHECK: Ensure this specific transaction isn't already recorded
    if (params.paymentReference) {
      // Online/Cheque: match by unique reference
      const existing = await prisma.collection.findFirst({
        where: {
          schoolId: context.schoolId,
          paymentReference: params.paymentReference,
          status: "Success"
        }
      });
      if (existing) {
        console.warn(`[FINANCE_IDEMPOTENCY] Reference ${params.paymentReference} already settled. Skipping duplicate.`);
        return { success: true, data: serializeDecimal(existing) };
      }
    } else if (params.paymentMode?.toLowerCase() === "cash") {
      // Cash: block if same student paid same amount within the last 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const recentCash = await prisma.collection.findFirst({
        where: {
          schoolId: context.schoolId,
          studentId: params.studentId,
          amountPaid: params.amountPaid,
          paymentMode: "Cash",
          status: "Success",
          createdAt: { gte: twoMinutesAgo }
        }
      });
      if (recentCash) {
        console.warn(`[FINANCE_IDEMPOTENCY] Possible duplicate cash payment for student ${params.studentId} within 2 minutes.`);
        return { success: true, data: serializeDecimal(recentCash) };
      }
    }

    // 2. Load Student Fee Context for Milestone Validation
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: { 
        financial: { 
          include: { 
            components: { 
              include: { 
                masterComponent: { 
                  select: { id: true, name: true, type: true, accountCode: true } 
                } 
              } 
            } 
          } 
        }, 
        collections: { where: { status: "Success" } } 
      }
    });
    if (!student || !student.financial) throw new Error("Financial record missing.");

    const components = student.financial.components || [];
    const netAnnual = components.length > 0 
        ? components
            .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                         !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                         !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                         !c.masterComponent?.name?.toLowerCase().includes("deposit"))
            .reduce((sum, c) => sum + Number(c.baseAmount || 0) - Number(c.waiverAmount || 0) - Number(c.discountAmount || 0), 0)
        // ✅ Bug 4 fixed: use annualTuition (true full total) not tuitionFee (partial)
        : Number(student.financial.annualTuition || student.financial.tuitionFee || 0) - Number(student.financial.totalDiscount || 0);

    const prevTotalPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
    const newTotalPaid = prevTotalPaid + params.amountPaid;

    if (params.lateFeeWaived && (!params.waiverReason || params.waiverReason.trim() === '')) {
      throw new Error("Audit Violation: A valid reason must be provided when waiving late fees.");
    }

    // 2.5 Policy Guard: Enrollment Milestone Compliance (Sovereign Rulebook)
    // ALL students must cumulatively reach their plan-specific milestone within the grace window.
    // Part payments are fully allowed — this checks the CUMULATIVE total, not a single payment amount.
    //
    // Grace Windows by Plan:
    //   Term-wise  → 30 days  → must reach full Term 1 amount (50% of net annual)
    //   One-time   → 30 days  → must reach full annual net amount
    //   Monthly    → 80 days  → must reach cumulative sum of all monthly installments due within 80 days
    //                           (i.e., the first "term" worth of monthly payments)
    if (student.createdAt) {
      const plan = student.financial.paymentType || "Term-wise";
      const enrollmentDate = new Date(student.createdAt);
      const enrollmentAge = Math.floor((new Date().getTime() - enrollmentDate.getTime()) / (1000 * 60 * 60 * 24));

      let threshold = 0;
      let graceWindowDays = 30;

      if (plan === "Annual" || plan === "One-time" || plan === "One-Time") {
        // One-time: must pay full net annual within 30 days
        graceWindowDays = 30;
        threshold = Number(student.financial.annualTuition || 0) - Number(student.financial.totalDiscount || 0);

      } else if (plan === "Monthly") {
        // Monthly: 80-day grace window (≈ one term's duration)
        // Threshold = cumulative sum of all monthly installments due within 80 days of enrollment
        graceWindowDays = 80;
        const cutoffDate = new Date(enrollmentDate.getTime() + (80 * 24 * 60 * 60 * 1000));
        const annualTuition = Number(student.financial.annualTuition || student.financial.tuitionFee || 0);
        const baseMonthly = Math.floor(annualTuition / 10);
        const remainder = annualTuition - (baseMonthly * 10);
        const enrollYear = enrollmentDate.getFullYear();

        // Generate the 10 monthly installments starting June of the enrollment year
        for (let m = 0; m < 10; m++) {
          const monthIndex = (5 + m) % 12; // June = 5
          const yearOffset = Math.floor((5 + m) / 12);
          const dueDate = new Date(enrollYear + yearOffset, monthIndex, 10);
          const amount = m === 9 ? (baseMonthly + remainder) : baseMonthly;
          // Sum installments whose due date falls on or before the 80-day cutoff
          if (dueDate <= cutoffDate) {
            threshold += amount;
          }
        }

      } else {
        // Term-wise (default): must reach Term 1 (50% of net annual) within 30 days
        graceWindowDays = 30;
        threshold = Number(student.financial.term1Amount || 0);
      }

      // Only enforce after the grace window has elapsed
      if (enrollmentAge > graceWindowDays && threshold > 0 && newTotalPaid < (threshold - 1)) {
        const planLabel = plan === "Monthly" ? "Monthly (80-day term window)" : `${plan} (${graceWindowDays}-day window)`;
        throw new Error(
          `Policy Violation: This enrollment is ${enrollmentAge} days old. ` +
          `The cumulative amount collected (₹${Math.round(newTotalPaid).toLocaleString()}) has not yet reached ` +
          `the required milestone of ₹${Math.round(threshold).toLocaleString()} for the ${planLabel} plan. ` +
          `Part payments are accepted — please collect the remaining ₹${Math.round(threshold - newTotalPaid).toLocaleString()} to clear this milestone.`
        );
      }
    }

    // 3. ENFORCEMENT: Advance Payment Block (Legacy Prerequisite)
    if (params.selectedTerms.includes("advance") && !canPayAdvance(prevTotalPaid, netAnnual)) {
      throw new Error("Cannot collect Advance payment. All current year dues must be 100% cleared first.");
    }

    // 4. ENFORCEMENT: Sequential Selection & Milestone Check based on Cumulative Balance
    const plan = student.financial.paymentType || "Term-wise";
    const tuition = components.length > 0 
        ? components
            .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                         !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                         !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                         !c.masterComponent?.name?.toLowerCase().includes("deposit"))
            .reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
        : Number(student.financial.annualTuition || student.financial.tuitionFee || 0);
    const discount = components.length > 0 
        ? components
            .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                         !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                         !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                         !c.masterComponent?.name?.toLowerCase().includes("deposit"))
            .reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0)
        : Number(student.financial.totalDiscount || 0);

    const breakdown = calculateTermBreakdown(tuition, discount, plan);

    // Find the index of the highest selected installment
    let maxSelectedIndex = -1;
    breakdown.installments.forEach((inst, index) => {
      if (params.selectedTerms.includes(inst.key)) {
        maxSelectedIndex = Math.max(maxSelectedIndex, index);
      }
    });

    if (maxSelectedIndex > 0) {
      // The sum of all prior installments must be fully paid
      let requiredPriorSum = 0;
      for (let i = 0; i < maxSelectedIndex; i++) {
        requiredPriorSum += breakdown.installments[i].amount;
      }
      if (prevTotalPaid < (requiredPriorSum - 1)) {
        const unfinishedInst = breakdown.installments.find((inst, idx) => idx < maxSelectedIndex && prevTotalPaid < (requiredPriorSum - inst.amount));
        throw new Error(`Sequential Violation: The installment '${unfinishedInst?.label || "previous"}' must be fully paid before you can collect payments for '${breakdown.installments[maxSelectedIndex].label}'.`);
      }
    }

    // Max allowed total to prevent overpaying selected terms without selecting subsequent ones
    let maxAllowedTotal = 0;
    breakdown.installments.forEach((inst, index) => {
      if (index <= maxSelectedIndex) {
        maxAllowedTotal += inst.amount;
      }
    });
    if (newTotalPaid > (maxAllowedTotal + ROUND_FIGURE_TOLERANCE_INR)) {
      throw new Error(`Overpayment Violation: The new cumulative total (₹${newTotalPaid.toLocaleString()}) exceeds the maximum amount due for the selected installments (₹${maxAllowedTotal.toLocaleString()}). Please select additional installments to credit the extra amount.`);
    }

    // 6. RESOLVE ENROLLMENT IDENTITY & CODES (FOR 2026-27 BRANDING)
    const activeAdmission = await prisma.studentAcademicYear.findFirst({
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
      const ancillaryTotal = params.ancillaryItems?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const totalBasePaid = params.amountPaid + ancillaryTotal;
      const basePlusLate = totalBasePaid + params.lateFeePaid;
      const totalInBank = basePlusLate + gatewayFee;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          bookReceiptNo: params.bookReceiptNo,
          studentId: params.studentId,
          admissionId: activeAdmission.id,
          financialYearId: activeFY.id,
          schoolId: context.schoolId,
          branchId: context.branchId,
          amountPaid: totalBasePaid,
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
            ancillaryPaid: params.ancillaryItems || [],
            lateFeeWaived: params.lateFeeWaived,
            waiverReason: params.waiverReason,
            admissionWaived: params.waiveAdmissionFee || false,
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

      // 🚀 TRANSACTIONAL FEE ALLOCATIONS
      const activeInvoice = await tx.feeInvoice.findFirst({
        where: { studentId: params.studentId, schoolId: context.schoolId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
        include: { items: true }
      });

      if (activeInvoice) {
        if (params.amountPaid > 0) {
          const tuitionItem = activeInvoice.items.find((item: any) => 
            item.componentType === "TUTION" || item.componentName.toLowerCase().includes("tuition")
          );
          if (tuitionItem) {
            await tx.feeInvoiceItem.update({
              where: { id: tuitionItem.id },
              data: {
                paidAmount: { increment: params.amountPaid },
                balance: { decrement: params.amountPaid }
              }
            });

            await tx.collectionAllocation.create({
              data: {
                collectionId: collection.id,
                invoiceId: activeInvoice.id,
                invoiceItemId: tuitionItem.id,
                amount: params.amountPaid
              }
            });
          }
        }

        if (params.ancillaryItems && params.ancillaryItems.length > 0) {
          for (const item of params.ancillaryItems) {
            let itemType = "";
            const key = item.key.toLowerCase();
            if (key.includes("transport")) itemType = "TRANSPORT";
            else if (key.includes("admission")) itemType = "ADMISSION";
            else itemType = "ANCILLARY";

            const matchingItem = activeInvoice.items.find((invItem: any) => 
              (itemType && invItem.componentType === itemType) || 
              invItem.componentName.toLowerCase().includes(item.key.toLowerCase()) ||
              item.key.toLowerCase().includes(invItem.componentName.toLowerCase())
            );

            if (matchingItem) {
              await tx.feeInvoiceItem.update({
                where: { id: matchingItem.id },
                data: {
                  paidAmount: { increment: item.amount },
                  balance: { decrement: item.amount }
                }
              });

              await tx.collectionAllocation.create({
                data: {
                  collectionId: collection.id,
                  invoiceId: activeInvoice.id,
                  invoiceItemId: matchingItem.id,
                  amount: item.amount
                }
              });
            }
          }
        }

        const updatedInvoice = await tx.feeInvoice.update({
          where: { id: activeInvoice.id },
          data: {
            paidAmount: { increment: totalBasePaid },
            balance: { decrement: totalBasePaid }
          }
        });

        const newBalance = Number(updatedInvoice.balance || 0);
        const newPaidAmount = Number(updatedInvoice.paidAmount || 0);
        let newStatus = "PENDING";
        if (newBalance <= 0) {
          newStatus = "PAID";
        } else if (newPaidAmount > 0) {
          newStatus = "PARTIALLY_PAID";
        }

        await tx.feeInvoice.update({
          where: { id: activeInvoice.id },
          data: { status: newStatus }
        });
      }

      // AUDIT-SAFE LEDGER POSTING
      // 1. Student Ledger (Account Statement)
      await tx.ledgerEntry.create({
        data: {
          studentId: params.studentId,
          schoolId: context.schoolId,
          branchId: context.branchId,
          financialYearId: activeFY.id,
          academicYearId: activeAdmission.academicYearId,
          type: "PAYMENT",
          amount: totalBasePaid,
          reason: `Fee Payment (${params.selectedTerms.join(', ')}) - Ref: ${receiptNumber}`,
          createdBy: context.name || context.role,
          journalEntryId: null
        }
      });

      // 2. Double-Entry Journal
      // Debit: Cash/Bank | Credit 1: AR (1200) | Credit 2: Service Charge (4200) | Credit 3: Admission Income (4100)
      const isOnlineOrBank = ["Razorpay", "Bank QR", "Bank Transfer", "Cheque", "Card"].includes(params.paymentMode);
      const debitAccountCode = isOnlineOrBank ? "1120" : "1110";
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: debitAccountCode } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });
      const admissionAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4200" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4500" } });

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

        const createdJe = await tx.journalEntry.create({
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

        // Link the Journal Entry back to the Collection for reversal parity
        await tx.collection.update({
          where: { id: collection.id },
          data: { journalEntryId: createdJe.id }
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
                    userId: context.staffId,
                    action: "STATUS_PROMOTION",
                    entityType: "STUDENT",
                    entityId: student.id,
                    details: `Status promoted from ${ST_PROVISIONAL} to ${ST_CONFIRMED} [Metadata: ${JSON.stringify({
                        oldStatus: ST_PROVISIONAL,
                        newStatus: ST_CONFIRMED,
                        trigger: "THRESHOLD_REACHED",
                        threshold: threshold,
                        totalPaid: newTotalPaid
                    })}]`
                }
            });
        }
      }

      // 🔄 THE RENEWAL ENGINE (Existing Student Promotion Hook)
      // Check if student has a PENDING renewal in any AcademicHistory record
      const pendingRenewal = await tx.studentAcademicYear.findFirst({
        where: { studentId: student.id, renewalStatus: "PENDING" },
        include: { academicYear: true }
      });

      if (pendingRenewal && student.financial) {
        const plan = student.financial.paymentType || "Term-wise";
        const threshold = plan === "Yearly" 
          ? Number(student.financial.annualTuition || 0)
          : Number(student.financial.term1Amount || 0);

        if (newTotalPaid >= threshold && threshold > 0) {
            console.log(`✅ [RENEWAL_ENGINE] Student ${student.firstName} ${student.lastName} cleared ${plan} threshold (${threshold}). Renewing enrollment status for ${pendingRenewal.academicYear.name}.`);
            
            await tx.studentAcademicYear.update({
                where: { id: pendingRenewal.id },
                data: { renewalStatus: "RENEWED" }
            });

            // 📝 AUDIT LOG: Renewal Lifecycle Transition
            await tx.activityLog.create({
                data: {
                    schoolId: context.schoolId,
                    userId: context.staffId,
                    action: "RENEWAL_PROMOTION",
                    entityType: "STUDENT",
                    entityId: student.id,
                    details: `Renewal promoted from PENDING to RENEWED for ${pendingRenewal.academicYear.name} [Metadata: ${JSON.stringify({
                        trigger: "THRESHOLD_REACHED",
                        threshold: threshold,
                        totalPaid: newTotalPaid
                    })}]`
                }
            });
        }
      }

      return collection;
    }, { maxWait: 10000, timeout: 30000 });

    try {
      revalidatePath("/admin/fees");
      revalidatePath("/dashboard/finance");
    } catch (e) {
      console.log("ℹ️ [Next.js Cache] Skipping path revalidation outside request context.");
    }

    // Dispatch automated Email Receipt notification to parent/student asynchronously
    try {
      let recipientEmail = params.customerEmail || student.email || "";
      if (!recipientEmail) {
        const family = await prisma.familyDetail.findUnique({
          where: { studentId: student.id }
        });
        recipientEmail = family?.fatherEmail || family?.motherEmail || "";
      }

      if (recipientEmail && recipientEmail.includes("@")) {
        const { NotificationService } = await import("../services/notification-service");
        // Non-blocking trigger
        NotificationService.sendReceiptNotification(
          recipientEmail.trim(),
          result.receiptNumber,
          Number(result.amountPaid),
          { schoolId: context.schoolId, branchId: result.branchId || undefined }
        ).catch(err => console.error("❌ Failed to dispatch automated receipt email:", err));
      }
    } catch (notifyErr) {
      console.error("⚠️ Failed to resolve parent email for receipt dispatch:", notifyErr);
    }

    return { success: true, data: serializeDecimal(serialize(result)) };
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
      include: {
        journalEntry: { include: { lines: true } },
        backboneAllocations: true // Load CollectionAllocation records
      }
    });

    if (!collection || collection.schoolId !== context.schoolId) {
      throw new Error("Receipt not found or unauthorized.");
    }

    if (collection.status === "VOIDED" || collection.isDeleted) {
      throw new Error("This receipt is already voided.");
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. MARK COLLECTION AS VOIDED (Sentinel allows updates with schoolId in where clause)
      await tx.collection.update({
        where: { id: collectionId, schoolId: context.schoolId },
        data: { status: "VOIDED", isDeleted: true }
      });

      const activeFY = await prisma.financialYear.findFirst({
        where: { schoolId: context.schoolId, isCurrent: true }
      });

      if (!activeFY) throw new Error("No active financial year for reversal.");

      // 1.5. REVERT INVOICE AND INVOICE ITEM ALLOCATIONS
      if (collection.backboneAllocations && collection.backboneAllocations.length > 0) {
        for (const alloc of collection.backboneAllocations) {
          const amount = Number(alloc.amount);

          // Revert Invoice Item Balance
          await tx.feeInvoiceItem.update({
            where: { id: alloc.invoiceItemId },
            data: {
              paidAmount: { decrement: amount },
              balance: { increment: amount }
            }
          });

          // Revert Main Invoice Balance
          await tx.feeInvoice.update({
            where: { id: alloc.invoiceId },
            data: {
              paidAmount: { decrement: amount },
              balance: { increment: amount }
            }
          });
        }

        // Re-evaluate invoice statuses
        const uniqueInvoiceIds = Array.from(new Set(collection.backboneAllocations.map(a => a.invoiceId)));
        for (const invId of uniqueInvoiceIds) {
          const updatedInv = await tx.feeInvoice.findUnique({
            where: { id: invId }
          });
          if (updatedInv) {
            const newBalance = Number(updatedInv.balance || 0);
            const newPaidAmount = Number(updatedInv.paidAmount || 0);
            let newStatus = "PENDING";
            if (newBalance <= 0) {
              newStatus = "PAID";
            } else if (newPaidAmount > 0) {
              newStatus = "PARTIALLY_PAID";
            }

            await tx.feeInvoice.update({
              where: { id: invId },
              data: { status: newStatus }
            });
          }
        }
      }

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

    try {
      revalidatePath("/admin/fees");
    } catch (e) {
      console.log("ℹ️ [Next.js Cache] Skipping path revalidation outside request context.");
    }
    return { success: true, data: serializeDecimal(result) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}



/**
 * getStudentFeeStatus with Tenancy Guard & Term Isolation
 */
export async function getStudentFeeStatus(studentId: string) {
  const tStart = Date.now();
  try {
    console.log(`⏱️ [FEE_DEBUG] getStudentFeeStatus started.`);
    const t0 = Date.now();
    const identity = await getSovereignIdentity();
    console.log(`⏱️ [FEE_DEBUG] getSovereignIdentity took ${Date.now() - t0}ms`);
    
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    const t1 = Date.now();
    const { calculateTermBreakdown } = await import("../utils/fee-utils");
    console.log(`⏱️ [FEE_DEBUG] Import fee-utils took ${Date.now() - t1}ms`);

    const t2 = Date.now();
    const [studentRecord, ledgerEntries, collections] = await Promise.all([
      prismaBypass.student.findFirst({
        where: { 
          id: studentId,
          schoolId: context.schoolId
        },
        include: {
          academic: { include: { class: true } },
          history: { include: { academicYear: true } },
          studentTransport: { include: { route: true, pickupStop: true, dropStop: true } },
          backboneInvoices: { include: { items: true } },
          financial: { 
            include: { 
              components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } }, 
              discounts: { include: { discountType: true } },
              feeStructure: { include: { components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } } } }
            } 
          }
        }
      }),
      prismaBypass.ledgerEntry.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' }
      }),
      prismaBypass.collection.findMany({
        where: { studentId, status: "Success", isDeleted: false },
        include: { backboneAllocations: { include: { invoiceItem: true } } },
        orderBy: { paymentDate: 'desc' }
      })
    ]);
    console.log(`⏱️ [FEE_DEBUG] Parallel findFirst student, ledger, and collections took ${Date.now() - t2}ms`);

    if (!studentRecord) throw new Error("Student not found or unauthorized.");

    const student = studentRecord as any;
    student.ledgerEntries = ledgerEntries;
    student.collections = collections;

    const secureBranchId = student.branchId || null;
    const secureSchoolId = student.schoolId || null;

    // 1. RESOLVE INVOICE-BASED OR PROFILE-BASED BASE VALUES
    const activeInvoice = student.backboneInvoices?.[0]; // Get the warded invoice
    
    let tuition = 0;
    let discount = 0;
    let transportFeeVal = 0;
    let admissionFeeVal = 0;
    
    if (activeInvoice) {
      activeInvoice.items.forEach((item: any) => {
        const type = item.componentType;
        const name = item.componentName.toLowerCase();
        const amt = Number(item.amount);
        
        if (type === "TUTION" || name.includes("tuition")) {
          tuition = amt;
        } else if (type === "CONCESSION" || name.includes("concession")) {
          discount = Math.abs(amt);
        } else if (type === "TRANSPORT" || name.includes("transport")) {
          transportFeeVal = amt;
        } else if (type === "ADMISSION" || name.includes("admission")) {
          admissionFeeVal = amt;
        }
      });
    } else {
      const components = student.financial?.components || [];
      tuition = components.length > 0 
          ? components
              .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                           !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                           !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                           !c.masterComponent?.name?.toLowerCase().includes("deposit"))
              .reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
          : Number(student.financial?.tuitionFee || student.financial?.annualTuition || 0);
      discount = components.length > 0 
          ? components
              .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                           !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                           !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                           !c.masterComponent?.name?.toLowerCase().includes("deposit"))
              .reduce((sum, c) => sum + Number(c.waiverAmount || 0) + Number(c.discountAmount || 0), 0)
          : Number(student.financial?.totalDiscount || 0);
    }

    const paymentType = student.financial?.paymentType || "Term-wise";
    
    const ledgerTuition = activeInvoice 
        ? tuition
        : (tuition === 0 && student.ledgerEntries && student.ledgerEntries.length > 0
            ? student.ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)
            : tuition);

    const breakdown = calculateTermBreakdown(ledgerTuition, discount, paymentType);

    // 2. CATEGORIZE CUMULATIVE PAYMENT ALLOCATIONS (BY COMPONENT TYPE)
    let tuitionPaid = 0;
    let transportPaid = 0;
    let admissionPaid = 0;

    student.collections.forEach((col: any) => {
      if (col.backboneAllocations && col.backboneAllocations.length > 0) {
        col.backboneAllocations.forEach((alloc: any) => {
          const type = alloc.invoiceItem?.componentType;
          const amt = Number(alloc.amount || 0);
          if (type === "TUTION") tuitionPaid += amt;
          else if (type === "TRANSPORT") transportPaid += amt;
          else if (type === "ADMISSION") admissionPaid += amt;
        });
      } else {
        // Fallback for legacy collections without allocations
        const totalColPaid = Number(col.amountPaid || 0);
        const mode = (col.allocatedTo as any)?.feeHead?.toLowerCase() || "tuition";
        if (mode.includes("transport")) transportPaid += totalColPaid;
        else if (mode.includes("admission")) admissionPaid += totalColPaid;
        else tuitionPaid += totalColPaid;
      }
    });

    // 3. MAP TUITION PAYMENTS TO TERM INSTALLMENTS
    let remainingTuitionPaid = tuitionPaid;

    breakdown.installments.forEach(inst => {
      const amt = Number(inst.amount);
      if (remainingTuitionPaid >= amt) {
        inst.isPaid = true;
        (inst as any).balance = 0;
        remainingTuitionPaid -= amt;
      } else if (remainingTuitionPaid > 0) {
        inst.isPaid = false;
        (inst as any).balance = amt - remainingTuitionPaid;
        remainingTuitionPaid = 0;
      } else {
        inst.isPaid = false;
        (inst as any).balance = amt;
      }
    });

    breakdown.term1.isPaid = breakdown.installments.find(i => i.key === "term1")?.isPaid || false;
    breakdown.term2.isPaid = breakdown.installments.find(i => i.key === "term2")?.isPaid || false;
    breakdown.term3.isPaid = breakdown.installments.find(i => i.key === "term3")?.isPaid || false;

    const paidTerms = student.collections.flatMap((c: any) => {
      const allocated = c.allocatedTo as any;
      if (!allocated) return [];
      
      const termsFromList = allocated.terms || [];
      const legacyTerms = ["term1", "term2", "term3"].filter(t => (allocated as any)[t] > 0);
      const ancillaryPaid = Array.isArray(allocated.ancillaryPaid)
        ? allocated.ancillaryPaid.map((a: any) => (typeof a === "string" ? a : a.key)).filter(Boolean)
        : [];
      
      return [...new Set([...termsFromList, ...legacyTerms, ...ancillaryPaid])];
    });

    // Inject payment keys for warded components
    if (tuitionPaid >= (breakdown.annualNet || tuition - discount)) {
      paidTerms.push("tuitionFee");
    }
    if (transportPaid >= transportFeeVal && transportFeeVal > 0) {
      paidTerms.push("transportFee");
    }
    if (admissionPaid >= admissionFeeVal && admissionFeeVal > 0) {
      paidTerms.push("admissionFee");
    }

    const ancillary: Record<string, any> = {};
    const fin = student.financial;

    // Priority -1: AUTHORITATIVE ACTIVE INVOICE ITEMS
    if (activeInvoice?.items) {
      activeInvoice.items.forEach((item: any) => {
        const type = item.componentType;
        const name = item.componentName.toLowerCase();
        
        if (type === "TUTION" || name.includes("tuition") || type === "CONCESSION" || name.includes("concession")) {
          // tuition and concession are core, handled separately
          return;
        }

        let key = "";
        if (type === "ADMISSION" || name.includes("admission")) key = "admissionFee";
        else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
        else if (type === "TRANSPORT" || name.includes("transport")) key = "transportFee";
        else if (name.includes("library")) key = "libraryFee";
        else if (name.includes("exam")) key = "examFee";
        else if (name.includes("computer")) key = "computerFee";
        else if (name.includes("sports")) key = "sportsFee";
        else if (name.includes("activity")) key = "activityFee";
        else if (name.includes("book")) key = "booksFee";
        else if (name.includes("uniform")) key = "uniformFee";
        else key = `inv_${item.id}`;

        if (key && !ancillary[key]) {
          ancillary[key] = {
            amount: Number(item.amount),
            isPaid: Number(item.balance) <= 0,
            label: item.componentName,
            dueDate: null
          };
        }
      });
    }

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
          const reason = (entry.reason ?? "unknown").toLowerCase();
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

    // Calculate total paid and total due dynamically
    const totalCollected = collections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);
    const tuitionNet = Number(breakdown.annualNet) || 0;
    const ancillaryTotal = Object.values(ancillary).reduce((sum, comp: any) => sum + Number(comp.amount || 0), 0);
    const grandTotalFee = tuitionNet + ancillaryTotal;
    const dueTotal = Math.max(0, grandTotalFee - totalCollected);

    (breakdown as any).paidTotal = totalCollected;
    (breakdown as any).dueTotal = dueTotal;

    return { 
      success: true, 
      data: serialize({
        ...student,
        branchId: secureBranchId,
        schoolId: secureSchoolId,
        academic: student.academic ? {
          ...student.academic,
          academicYear: student.history?.[0]?.academicYear?.name || (typeof student.academic?.academicYear === 'string' ? student.academic.academicYear : null) || null,
          branchId: secureBranchId,
          schoolId: secureSchoolId
        } : null,
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

    // 4. Resolve branch from student's current enrollment (not a random findFirst)
    const enrollment = await prisma.studentAcademicYear.findFirst({
      where: { studentId: params.studentId, schoolId },
      select: { branchId: true },
      orderBy: { createdAt: "desc" }
    });
    const branchId = enrollment?.branchId || (await prisma.branch.findFirst({ where: { schoolId }, select: { id: true } }))?.id || "GLOBAL";

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
      return { success: true, data: serializeDecimal(serialize(receiptData)) };
    }

    // 6. Atomic transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const { CounterService } = await import("../services/counter-service");

      // Resolve enrollment for ID linking
      const enrollment = await tx.studentAcademicYear.findFirst({
        where: { studentId: params.studentId, schoolId },
        include: {
          branch: { include: { school: true } },
          academicYear: true
        },
        orderBy: { createdAt: 'desc' }
      });

      let schoolCode = schoolId;
      if (enrollment?.branch?.school?.code) {
        schoolCode = enrollment.branch.school.code;
      } else {
        const sch = await tx.school.findUnique({
          where: { id: schoolId },
          select: { code: true }
        });
        if (sch) schoolCode = sch.code;
      }

      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId,
        schoolCode,
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
          paymentDate: new Date(),
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
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId, accountCode: "4500" } });

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

      // 🚀 THE CONFIRMATION ENGINE (Elite ERP Promotion Hook)
      // Check if student is still Provisional and has now cleared their chosen milestone
      if (student.status === ST_PROVISIONAL && student.financial && enrollment) {
        // Fetch snapshot value based on parent's opted payment plan
        const plan = student.financial.paymentType || "Term-wise";
        const threshold = plan === "Yearly" 
          ? Number(student.financial.annualTuition || 0)
          : Number(student.financial.term1Amount || 0);
        
        const prevTotalPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
        const newTotalPaid = prevTotalPaid + params.amountPaid;

        if (newTotalPaid >= threshold && threshold > 0) {
            console.log(`✅ [PROMOTION_ENGINE] Student ${student.firstName} ${student.lastName} cleared ${plan} threshold (${threshold}). Promoting to ST_CONFIRMED.`);
            
            const schoolCode = enrollment.branch.school.code || schoolId;
            const branchCode = enrollment.branch.code || "MAIN";
            const ayName = enrollment.academicYear.name;

            // 🆔 IDENTITY ELEVATION: Generate Actual Admission & Student IDs
            const admissionNumber = await CounterService.generateAdmissionNumber({
                schoolId, schoolCode, branchId, branchCode, year: ayName
            }, tx);

            const studentCode = await CounterService.generateStudentCode({
                schoolId, schoolCode, branchId, branchCode, year: ayName
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
                    schoolId,
                    userId: "PARENT_PORTAL",
                    action: "STATUS_PROMOTION",
                    entityType: "STUDENT",
                    entityId: student.id,
                    details: `Status promoted from ${ST_PROVISIONAL} to ${ST_CONFIRMED} [Metadata: ${JSON.stringify({
                        oldStatus: ST_PROVISIONAL,
                        newStatus: ST_CONFIRMED,
                        trigger: "THRESHOLD_REACHED",
                        threshold: threshold,
                        totalPaid: newTotalPaid
                    })}]`
                }
            });
        }
      }

      return collection;
    });

    return { success: true, data: serializeDecimal(serialize(result)) };
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

    return { success: true, data: serializeDecimal(serialize(collections)) };
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
        status: "VOID_REQUESTED"
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

    return { success: true, data: serializeDecimal(serialize(history)) };
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
        status: "VOID_REQUESTED",
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
      where: { id: collectionId, schoolId: context.schoolId },
      include: { journalEntry: { include: { lines: true } } }
    });

    if (!collection || collection.status !== "VOID_REQUESTED") throw new Error("Invalid request.");

    await prisma.$transaction(async (tx: any) => {
      // 1. Mark as VOIDED (BUG-3 FIX: Standardized casing to match voidPaymentAction)
      await tx.collection.update({
        where: { id: collectionId },
        data: { status: "VOIDED" }
      });

      // 2. Reverse Ledger Posting (Double-Entry Parity)
      if (collection.journalEntry) {
        const originalLines = collection.journalEntry.lines;
        const reversalLines = originalLines.map((line: any) => ({
          accountId: line.accountId,
          description: `REVERSAL of ${collection.receiptNumber}: Audit Correction`,
          credit: line.debit, // Swap Debit to Credit
          debit: line.credit   // Swap Credit to Debit
        }));

        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: collection.branchId,
            financialYearId: collection.financialYearId,
            entryType: "REVERSAL",
            totalDebit: collection.journalEntry.totalCredit,
            totalCredit: collection.journalEntry.totalDebit,
            description: `REVERSAL of Receipt ${collection.receiptNumber}`,
            lines: { create: reversalLines }
          }
        });

        // Update Account Balances
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
      } else {
        // Fallback for old collections without journal links
        const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
        const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });
        const total = Number(collection.totalPaid);
        if (cashAcc && arAcc) {
           await tx.journalEntry.create({
             data: {
               schoolId: context.schoolId,
               branchId: collection.branchId,
               financialYearId: collection.financialYearId,
               entryType: "REVERSAL",
               totalDebit: total,
               totalCredit: total,
               description: `REVERSAL of Receipt ${collection.receiptNumber} (Fallback)`,
               lines: {
                 create: [
                   { accountId: cashAcc.id, debit: 0, credit: total }, // Reverse Cash
                   { accountId: arAcc.id, debit: total, credit: 0 }    // Reverse AR
                 ]
               }
             }
           });
           await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { decrement: total } } });
           await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { increment: total } } });
        }
      }

      // 3. Post REVERSAL to Student Ledger
      await tx.ledgerEntry.create({
        data: {
          studentId: collection.studentId,
          schoolId: context.schoolId,
          branchId: collection.branchId,
          type: "ADJUSTMENT",
          amount: -Number(collection.totalPaid), // Negative to indicate subtraction from paid balance (or just reverse logic depending on display)
          reason: `Receipt Voided: ${collection.receiptNumber}`,
          createdBy: context.name || context.role
        }
      });
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
        status: "CONFIRMED",
        financial: null
      },
      include: { academic: { include: { class: true } } }
    });
    return { success: true, data: serializeDecimal(serialize(students)) };
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
        status: "VOID_REQUESTED"
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
    return { success: true, data: serializeDecimal(serialize(requests)) };
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

    return { success: true, data: serializeDecimal(serialize(summary)) };
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
        type: "ANCILLARY" // Strictly ancillary items, excluding CORE tuition/admission
      },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: serializeDecimal(serialize(components)) };
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
      // 1.5 Duplicate Check
      const existingAssignment = await tx.studentFeeComponent.findFirst({
        where: { studentFinancialId: financial.id, componentId: params.componentId }
      });
      if (existingAssignment) throw new Error("Duplicate Assignment: This fee is already assigned.");

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

      // 3. Hardcoded Field Updates Removed (Sovereign V2 single source of truth)

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

      // 5. Double-Entry Journal for Accrual
      const accountCode = studentComponent.masterComponent.accountCode || "4100"; // Fallback to general fee income
      const incomeAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode } })
                         || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });
      const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

      if (incomeAccount && receivableAccount && activeFY) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "CHARGE",
            totalDebit: params.amount,
            totalCredit: params.amount,
            description: `Ad-Hoc Fee Accrual: ${studentComponent.masterComponent.name} for Student ${params.studentId}`,
            lines: {
              create: [
                { accountId: receivableAccount.id, debit: params.amount, credit: 0, description: "Receivable Accrual" },
                { accountId: incomeAccount.id, debit: 0, credit: params.amount, description: "Fee Income Accrual" }
              ]
            }
          }
        });
      }

      return studentComponent;
    }, { maxWait: 5000, timeout: 15000 });

    revalidatePath("/dashboard/finance");
    return { success: true, data: serializeDecimal(serialize(result)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * applyDiscountAction
 * 
 * REGISTRY-DRIVEN: Applies a predefined discount from the institutional registry.
 * Posts a "CREDIT" to the Ledger and links the audit record.
 */
export async function applyDiscountAction(params: {
  studentId: string;
  discountTypeId: string;
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    // Role gate: ACCOUNTS/ADMIN can only propose; PRINCIPAL/OWNER can directly approve
    const canApprove = context.role === "PRINCIPAL" || context.role === "OWNER";
    const canPropose = canApprove || context.role === "ACCOUNTS" || context.role === "ADMIN";
    if (!canPropose) throw new Error("ACCESS_DENIED: Only Accounts, Admin, Principal, or Owner can apply discounts.");

    const discountStatus = canApprove ? "Approved" : "Pending";

    const discountType = await prisma.discountType.findUnique({
      where: { id: params.discountTypeId, schoolId: context.schoolId }
    });

    if (!discountType) throw new Error("CRITICAL_ERROR: Discount Policy not found in Registry.");

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Fetch Student Financial Record
      const financial = await tx.financialRecord.findUnique({
        where: { studentId: params.studentId }
      });
      if (!financial) throw new Error("Financial record not found.");

      // 2. Find tuition component — discount is ONLY allowed on tuition fee
      const allComponents = await tx.studentFeeComponent.findMany({
        where: { studentFinancialId: financial.id },
        include: { masterComponent: { select: { name: true, type: true } } }
      });
      const tuitionComp = allComponents.find((c: any) =>
        c.masterComponent.type === "CORE" ||
        c.masterComponent.name.toLowerCase().includes("tuition")
      );
      if (!tuitionComp) throw new Error("RULE_VIOLATION: Discount can only be applied when a Tuition Fee component exists. No tuition component found for this student.");

      // 3. Calculate Amount (based on tuition base only)
      const tuitionBase = Number(tuitionComp.baseAmount || 0);
      let discountAmount = 0;
      if (discountType.percentage) {
        discountAmount = (tuitionBase * Number(discountType.percentage)) / 100;
      } else {
        discountAmount = Number(discountType.amount || 0);
      }

      // 4. Validate: total discounts (existing + new) cannot exceed tuition base
      const existingDiscount = Number(tuitionComp.discountAmount || 0);
      if (existingDiscount + discountAmount > tuitionBase) {
        throw new Error(
          `RULE_VIOLATION: Total discount (₹${(existingDiscount + discountAmount).toLocaleString()}) would exceed tuition base (₹${tuitionBase.toLocaleString()}). Maximum additional discount allowed: ₹${(tuitionBase - existingDiscount).toLocaleString()}.`
        );
      }

      // 5. Create Audit Record
      await tx.discount.create({
        data: {
          schoolId: context.schoolId,
          studentFinancialId: financial.id,
          discountTypeId: discountType.id,
          amount: discountAmount,
          reason: params.reason,
          status: discountStatus,
          branchId: context.branchId
        }
      });

      // Only update balances immediately if approved; pending discounts wait for PRINCIPAL/OWNER approval
      if (discountStatus !== "Approved") {
        return { pendingApproval: true, amount: discountAmount };
      }

      // 6. Update Financial Record
      const updatedFinancial = await tx.financialRecord.update({
        where: { studentId: params.studentId },
        data: {
          totalDiscount: { increment: discountAmount }
        }
      });

      // 7. Sync discount to tuition StudentFeeComponent
      await tx.studentFeeComponent.update({
        where: { id: tuitionComp.id },
        data: { discountAmount: { increment: discountAmount } }
      });

      // 5. Post to Ledger
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
          type: "DISCOUNT",
          amount: discountAmount,
          reason: `Policy Applied: ${discountType.name}. Reason: ${params.reason}`,
          createdBy: context.name || context.role
        }
      });

      // 6. Double-Entry Journal for Discount
      const discountAccount = await tx.chartOfAccount.findFirst({ 
        where: { 
          schoolId: context.schoolId, 
          OR: [
            { accountCode: "4400" },
            { accountName: { contains: "Discount", mode: "insensitive" } },
            { accountName: { contains: "Scholarship", mode: "insensitive" } }
          ] 
        } 
      }) || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });
      const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

      if (discountAccount && receivableAccount && activeFY) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "ADMISSION_DISCOUNT", // Using existing type for discounts
            totalDebit: discountAmount,
            totalCredit: discountAmount,
            description: `Discount Applied: ${discountType.name} for Student ${params.studentId}`,
            lines: {
              create: [
                { accountId: discountAccount.id, debit: discountAmount, credit: 0, description: "Discount/Scholarship Expense" },
                { accountId: receivableAccount.id, debit: 0, credit: discountAmount, description: "Receivable Offset" }
              ]
            }
          }
        });
      }

      return { approved: true, financial: updatedFinancial };
    }, { maxWait: 5000, timeout: 15000 });

    revalidatePath("/dashboard/finance");
    if ((result as any).pendingApproval) {
      return { success: true, pending: true, message: "Discount proposal submitted. Awaiting approval from Principal or Owner." };
    }
    return { success: true, data: serializeDecimal(serialize((result as any).financial)) };
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

      // 4. Hardcoded Field Updates Removed (Sovereign V2 single source of truth)

      return updated;
    });

    revalidatePath("/dashboard/finance");
    revalidatePath(`/admin/students/${params.studentId}`);
    return { success: true, data: serializeDecimal(serialize(result)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getDiscountTypesAction
 * 
 * Fetches the institutional discount registry.
 * Used for populating dropdowns in admission and profile hubs.
 */
export async function getDiscountTypesAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const discountTypes = await prisma.discountType.findMany({
      where: { 
        schoolId: context.schoolId,
        isActive: true 
      },
      orderBy: { name: 'asc' }
    });

    return { success: true, data: serializeDecimal(serialize(discountTypes)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * upsertDiscountTypeAction
 * 
 * Create or Update a predefined discount.
 * Ensures that amounts or percentages are locked in for staff selection.
 */
export async function upsertDiscountTypeAction(params: {
  id?: string;
  name: string;
  amount?: number;
  percentage?: number;
  description?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const data = {
      name: params.name,
      amount: params.amount || null,
      percentage: params.percentage || null,
      description: params.description,
      schoolId: context.schoolId,
      branchId: context.branchId,
      isActive: true
    };

    const result = params.id 
      ? await prisma.discountType.update({ where: { id: params.id, schoolId: context.schoolId }, data })
      : await prisma.discountType.create({ data });

    revalidatePath("/dashboard/finance/settings");
    return { success: true, data: serializeDecimal(serialize(result)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * deleteDiscountTypeAction
 * 
 * Soft-deactivates a discount type to prevent its use in new admissions.
 */
export async function toggleDiscountTypeStatusAction(id: string, status: boolean) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    
    await prisma.discountType.update({
      where: { id, schoolId: identity.schoolId },
      data: { isActive: status }
    });

    revalidatePath("/dashboard/finance/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * removeAdHocFeeAction
 * 
 * Removes an assigned ad-hoc fee and reverses the ledger entry.
 */
export async function removeAdHocFeeAction(params: {
  studentId: string;
  componentId: string; // The ID of the StudentFeeComponent record
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Find existing component
      const existing = await tx.studentFeeComponent.findUnique({
        where: { id: params.componentId },
        include: { masterComponent: true, financialRecord: true }
      });
      if (!existing) throw new Error("Component not found.");
      if (existing.financialRecord.studentId !== params.studentId) throw new Error("Security Violation: Record mismatch.");

      // 2. Delete it
      await tx.studentFeeComponent.delete({ where: { id: params.componentId } });

      // 3. Reverse Ledger
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
          amount: Number(existing.baseAmount),
          reason: `Reversal: Removed AdHoc Fee (${existing.masterComponent.name}). Reason: ${params.reason}`,
          createdBy: context.name || context.role
        }
      });

      // 4. Reverse Journal Entry
      const accountCode = existing.masterComponent.accountCode || "4100";
      const incomeAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode } })
                         || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });
      const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

      if (incomeAccount && receivableAccount && activeFY) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            branchId: context.branchId,
            financialYearId: activeFY.id,
            entryType: "CREDIT",
            totalDebit: Number(existing.baseAmount),
            totalCredit: Number(existing.baseAmount),
            description: `Ad-Hoc Fee Reversal: ${existing.masterComponent.name} removed for Student ${params.studentId}`,
            lines: {
              create: [
                { accountId: incomeAccount.id, debit: Number(existing.baseAmount), credit: 0, description: "Reversing Fee Income Accrual" },
                { accountId: receivableAccount.id, debit: 0, credit: Number(existing.baseAmount), description: "Reversing Receivable Accrual" }
              ]
            }
          }
        });
      }

      return true;
    }, { maxWait: 5000, timeout: 15000 });

    revalidatePath("/dashboard/finance");
    return { success: true, data: serializeDecimal(serialize(result)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * getParentStudentFeeStatus
 * 
 * Secure parent portal action to retrieve warded student fee structure and collections.
 */
export async function getParentStudentFeeStatus(studentId: string) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Parent session required.");

    // Verify mapping
    const mapping = await prismaBypass.studentGuardian.findFirst({
      where: {
        guardianId: identity.guardianId,
        studentId: studentId,
        activeStatus: "ACTIVE"
      }
    });
    if (!mapping) throw new Error("UNAUTHORIZED_ACCESS: You are not linked to this student.");

    const { calculateTermBreakdown } = await import("../utils/fee-utils");

    const [studentRecord, ledgerEntries, collections] = await Promise.all([
      prismaBypass.student.findFirst({
        where: { id: studentId },
        include: {
          academic: { include: { class: true } },
          history: { include: { academicYear: true } },
          studentTransport: { include: { route: true, pickupStop: true, dropStop: true } },
          backboneInvoices: { include: { items: true } },
          financial: { 
            include: { 
              components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } }, 
              discounts: { include: { discountType: true } },
              feeStructure: { include: { components: { include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } } } } }
            } 
          }
        }
      }),
      prismaBypass.ledgerEntry.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" }
      }),
      prismaBypass.collection.findMany({
        where: { studentId, status: "Success", isDeleted: false },
        include: { backboneAllocations: { include: { invoiceItem: true } } },
        orderBy: { paymentDate: "desc" }
      })
    ]);

    if (!studentRecord) throw new Error("Student not found.");

    const student = studentRecord as any;
    student.ledgerEntries = ledgerEntries;
    student.collections = collections;

    const secureBranchId = student.branchId || null;
    const secureSchoolId = student.schoolId || null;

    // 1. RESOLVE INVOICE-BASED OR PROFILE-BASED BASE VALUES
    const activeInvoice = student.backboneInvoices?.[0];
    
    let tuition = 0;
    let discount = 0;
    let transportFeeVal = 0;
    let admissionFeeVal = 0;
    
    if (activeInvoice) {
      activeInvoice.items.forEach((item: any) => {
        const type = item.componentType;
        const name = item.componentName.toLowerCase();
        const amt = Number(item.amount);
        
        if (type === "TUTION" || name.includes("tuition")) {
          tuition = amt;
        } else if (type === "CONCESSION" || name.includes("concession")) {
          discount = Math.abs(amt);
        } else if (type === "TRANSPORT" || name.includes("transport")) {
          transportFeeVal = amt;
        } else if (type === "ADMISSION" || name.includes("admission")) {
          admissionFeeVal = amt;
        }
      });
    } else {
      const components = student.financial?.components || [];
      tuition = components.length > 0 
          ? components
              .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                           !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                           !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                           !c.masterComponent?.name?.toLowerCase().includes("deposit"))
              .reduce((sum, c) => sum + Number(c.baseAmount || 0), 0)
          : Number(student.financial?.tuitionFee || student.financial?.annualTuition || 0);
      discount = components.length > 0 
          ? components
              .filter(c => (c.masterComponent?.type === "CORE" || c.masterComponent?.name?.toLowerCase().includes("tuition")) &&
                           !c.masterComponent?.name?.toLowerCase().includes("admission") &&
                           !c.masterComponent?.name?.toLowerCase().includes("caution") &&
                           !c.masterComponent?.name?.toLowerCase().includes("deposit"))
              .reduce((sum, c) => sum + Number(c.discountAmount || 0), 0)
          : Number(student.financial?.totalDiscount || 0);

      const financialDiscounts = student.financial?.discounts || [];
      const discountSum = financialDiscounts.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
      discount = discount + discountSum;

      transportFeeVal = components
        .filter(c => c.masterComponent?.type === "TRANSPORT" || c.masterComponent?.name?.toLowerCase().includes("transport"))
        .reduce((sum, c) => sum + Number(c.baseAmount || 0), 0);
      admissionFeeVal = components
        .filter(c => c.masterComponent?.name?.toLowerCase().includes("admission"))
        .reduce((sum, c) => sum + Number(c.baseAmount || 0), 0);
    }

    const paymentType = student.financial?.paymentType || "Term-wise";
    
    const ledgerTuition = activeInvoice 
        ? tuition
        : (tuition === 0 && student.ledgerEntries && student.ledgerEntries.length > 0
            ? student.ledgerEntries.reduce((sum, entry) => sum + Number(entry.amount), 0)
            : tuition);

    const breakdown = calculateTermBreakdown(ledgerTuition, discount, paymentType);

    // 2. CATEGORIZE CUMULATIVE PAYMENT ALLOCATIONS (BY COMPONENT TYPE)
    let tuitionPaid = 0;
    let transportPaid = 0;
    let admissionPaid = 0;

    student.collections.forEach((col: any) => {
      if (col.backboneAllocations && col.backboneAllocations.length > 0) {
        col.backboneAllocations.forEach((alloc: any) => {
          const type = alloc.invoiceItem?.componentType;
          const amt = Number(alloc.amount || 0);
          if (type === "TUTION") tuitionPaid += amt;
          else if (type === "TRANSPORT") transportPaid += amt;
          else if (type === "ADMISSION") admissionPaid += amt;
        });
      } else {
        const totalColPaid = Number(col.amountPaid || 0);
        const mode = (col.allocatedTo as any)?.feeHead?.toLowerCase() || "tuition";
        if (mode.includes("transport")) transportPaid += totalColPaid;
        else if (mode.includes("admission")) admissionPaid += totalColPaid;
        else tuitionPaid += totalColPaid;
      }
    });

    // 3. MAP TUITION PAYMENTS TO TERM INSTALLMENTS
    let remainingTuitionPaid = tuitionPaid;

    breakdown.installments.forEach(inst => {
      const amt = Number(inst.amount);
      if (remainingTuitionPaid >= amt) {
        inst.isPaid = true;
        (inst as any).balance = 0;
        remainingTuitionPaid -= amt;
      } else if (remainingTuitionPaid > 0) {
        inst.isPaid = false;
        (inst as any).balance = amt - remainingTuitionPaid;
        remainingTuitionPaid = 0;
      } else {
        inst.isPaid = false;
        (inst as any).balance = amt;
      }
    });

    breakdown.term1.isPaid = breakdown.installments.find(i => i.key === "term1")?.isPaid || false;
    breakdown.term2.isPaid = breakdown.installments.find(i => i.key === "term2")?.isPaid || false;
    breakdown.term3.isPaid = breakdown.installments.find(i => i.key === "term3")?.isPaid || false;

    const paidTerms = student.collections.flatMap((c: any) => {
      const allocated = c.allocatedTo as any;
      if (!allocated) return [];
      
      const termsFromList = allocated.terms || [];
      const legacyTerms = ["term1", "term2", "term3"].filter(t => (allocated as any)[t] > 0);
      const ancillaryPaid = Array.isArray(allocated.ancillaryPaid)
        ? allocated.ancillaryPaid.map((a: any) => (typeof a === "string" ? a : a.key)).filter(Boolean)
        : [];
      
      return [...new Set([...termsFromList, ...legacyTerms, ...ancillaryPaid])];
    });

    if (tuitionPaid >= (breakdown.annualNet || tuition - discount)) {
      paidTerms.push("tuitionFee");
    }
    if (transportPaid >= transportFeeVal && transportFeeVal > 0) {
      paidTerms.push("transportFee");
    }
    if (admissionPaid >= admissionFeeVal && admissionFeeVal > 0) {
      paidTerms.push("admissionFee");
    }

    const ancillary: Record<string, any> = {};
    const fin = student.financial;

    if (activeInvoice?.items) {
      activeInvoice.items.forEach((item: any) => {
        const type = item.componentType;
        const name = item.componentName.toLowerCase();
        
        if (type === "TUTION" || name.includes("tuition") || type === "CONCESSION" || name.includes("concession")) {
          return;
        }

        let key = "";
        if (type === "ADMISSION" || name.includes("admission")) key = "admissionFee";
        else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
        else if (type === "TRANSPORT" || name.includes("transport")) key = "transportFee";
        else if (name.includes("library")) key = "libraryFee";
        else if (name.includes("exam")) key = "examFee";
        else if (name.includes("computer")) key = "computerFee";
        else if (name.includes("sports")) key = "sportsFee";
        else if (name.includes("activity")) key = "activityFee";
        else if (name.includes("book")) key = "booksFee";
        else if (name.includes("uniform")) key = "uniformFee";
        else key = `inv_${item.id}`;

        if (key && !ancillary[key]) {
          ancillary[key] = {
            amount: Number(item.amount),
            isPaid: Number(item.balance) <= 0,
            label: item.componentName,
            dueDate: null
          };
        }
      });
    }

    if (fin?.feeStructure?.components) {
       fin.feeStructure.components.forEach((comp: any) => {
          const name = comp.masterComponent?.name?.toLowerCase() || "";
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
        else key = `comp_${comp.id}`;

        if (key && !ancillary[key]) {
          ancillary[key] = {
            amount: Number(comp.baseAmount),
            isPaid: paidTerms.includes(key) || paidTerms.includes(comp.masterComponent.name),
            label: comp.masterComponent.name,
            dueDate: null
          };
        }
      });
    }

    breakdown.ancillary = ancillary;

    // Calculate total paid and total due dynamically
    const totalCollected = collections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);
    const tuitionNet = Number(breakdown.annualNet) || 0;
    const ancillaryTotal = Object.values(ancillary).reduce((sum, comp: any) => sum + Number(comp.amount || 0), 0);
    const grandTotalFee = tuitionNet + ancillaryTotal;
    const dueTotal = Math.max(0, grandTotalFee - totalCollected);

    (breakdown as any).paidTotal = totalCollected;
    (breakdown as any).dueTotal = dueTotal;

    return {
      success: true,
      data: serialize({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentCode: student.studentCode,
          admissionNumber: student.admissionNumber,
          className: student.academic?.class?.name || "N/A",
          branchId: secureBranchId,
          schoolId: secureSchoolId
        },
        feeBreakdown: breakdown,
        collections: collections.map(c => ({
          id: c.id,
          receiptNumber: c.receiptNumber,
          amountPaid: Number(c.amountPaid || 0),
          lateFeePaid: Number(c.lateFeePaid || 0),
          convenienceFee: Number(c.convenienceFee || 0),
          totalPaid: Number(c.totalPaid || 0),
          paymentMode: c.paymentMode,
          paymentReference: c.paymentReference,
          paymentDate: c.paymentDate
        }))
      })
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * createParentRazorpayOrderAction
 * 
 * Secure parent portal action to create an order with Razorpay.
 */
export async function createParentRazorpayOrderAction(params: {
  amountPaid: number;
  studentId: string;
  selectedTerms: string[];
  lateFeePaid?: number;
}) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Parent session required.");

    // Verify mapping
    const mapping = await prismaBypass.studentGuardian.findFirst({
      where: {
        guardianId: identity.guardianId,
        studentId: params.studentId,
        activeStatus: "ACTIVE"
      }
    });
    if (!mapping) throw new Error("UNAUTHORIZED_ACCESS: You are not linked to this student.");

    const student = await prismaBypass.student.findUnique({
      where: { id: params.studentId },
      select: { schoolId: true }
    });
    if (!student) throw new Error("Student not found.");
    const schoolId = student.schoolId;

    // IDEMPOTENCY GUARD: Check if ANY term in this order is already paid
    const existingSuccessfulCollection = await prismaBypass.collection.findFirst({
      where: {
        studentId: params.studentId,
        status: "Success",
        allocatedTo: {
          path: ["terms"],
          array_contains: params.selectedTerms 
        }
      }
    });

    if (existingSuccessfulCollection) {
      throw new Error(`Double Payment Blocked: Term(s) ${params.selectedTerms.join(", ")} are already paid or in-process.`);
    }

    // 1.5% Gateway Fee + 18% GST (1.77% multiplier)
    const baseAmount = params.amountPaid;
    const lateFee = params.lateFeePaid || 0;
    
    const gatewayFee = (baseAmount + lateFee) * 0.015;
    const gst = gatewayFee * 0.18;
    const totalConvenience = gatewayFee + gst;
    const totalAmountIncludingFee = baseAmount + lateFee + totalConvenience;

    const order = await razorpay.orders.create({
      amount: Math.round(totalAmountIncludingFee * 100), // paisa
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        studentId: params.studentId,
        schoolId: schoolId,
        terms: params.selectedTerms.join(","),
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
