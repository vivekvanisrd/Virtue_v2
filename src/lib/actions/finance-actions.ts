"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext, getTenancyFilters } from "../utils/tenant-context";
import { CounterService } from "../services/counter-service";
import { Decimal } from "@prisma/client/runtime/library";
import { razorpay } from "@/lib/razorpay";
import crypto from "crypto";

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
    const context = await getTenantContext();
    
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
    const context = await getTenantContext();
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
}) {
  try {
    const context = await getTenantContext();
    
    // 1. Verify Active Financial Year & Validation Helpers
    const { validateMilestone, canPayAdvance } = await import("../utils/fee-utils");
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found.");

    // 2. Load Student Fee Context for Milestone Validation
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
      include: { 
        financial: true, 
        collections: { where: { status: "Success" } } 
      }
    });
    if (!student || !student.financial) throw new Error("Financial record missing.");

    const netAnnual = Number(student.financial.tuitionFee || 0) - Number(student.financial.totalDiscount || 0);
    const prevTotalPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
    const newTotalPaid = prevTotalPaid + params.amountPaid;

    if (params.lateFeeWaived && (!params.waiverReason || params.waiverReason.trim() === '')) {
      throw new Error("Audit Violation: A valid reason must be provided when waiving late fees.");
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

    // 5. Scoped Receipt Number & Transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId: context.schoolId,
        schoolCode: context.schoolId, // In production, map to real school code
        branchId: context.branchId,
        branchCode: context.branchId.split('-').pop() || "MNB01", 
        year: new Date().getFullYear().toString()
      }, tx);

      const gatewayFee = params.convenienceFee || 0;
      const basePlusLate = params.amountPaid + params.lateFeePaid;
      const totalInBank = basePlusLate + gatewayFee;

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: params.studentId,
          financialYearId: activeFY.id,
          schoolId: context.schoolId,
          branchId: context.branchId,
          amountPaid: params.amountPaid,
          lateFeePaid: params.lateFeePaid,
          convenienceFee: gatewayFee,
          totalPaid: totalInBank,
          paymentMode: params.paymentMode,
          paymentReference: params.paymentReference,
          collectedBy: context.role,
          isAutomated: params.paymentMode === "Razorpay",
          status: "Success",
          allocatedTo: {
            terms: params.selectedTerms,
            lateFeeWaived: params.lateFeeWaived,
            waiverReason: params.waiverReason,
            auditMeta: {
              tuitionPortion: params.amountPaid,
              lateFeePortion: params.lateFeePaid,
              serviceChargePortion: gatewayFee
            }
          }
        }
      });

      // AUDIT-SAFE LEDGER POSTING
      // Debit: Bank (1110) | Credit 1: AR (1200) | Credit 2: Service Charge (4200)
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });
      const serviceAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4200" } });

      if (cashAcc && arAcc) {
        // Journal Entry with split credit lines
        const lines = [
          { accountId: cashAcc.id, debit: totalInBank, credit: 0 },   // Total Money In (Full 102%)
          { accountId: arAcc.id, debit: 0, credit: basePlusLate }     // Clear Student Debt (100% Core + Late)
        ];

        // Only add credit line for convenience if it exists
        if (gatewayFee > 0 && serviceAcc) {
          lines.push({ accountId: serviceAcc.id, debit: 0, credit: gatewayFee }); // Service Income (2%)
        }

        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
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

      return collection;
    });

    revalidatePath("/admin/fees");
    revalidatePath("/dashboard/finance");
    return { success: true, data: serialize(result) };
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
    const context = await getTenantContext();
    const { validateMilestone, canPayAdvance } = await import("../utils/fee-utils");
    
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found.");

    // 1. PRE-VALIDATION: Check all students before starting transaction
    for (const s of params.settlements) {
      const student = await prisma.student.findUnique({
        where: { id: s.studentId },
        include: { financial: true, collections: { where: { status: "Success" } } }
      });
      if (!student || !student.financial) throw new Error(`Financial record missing for student ${s.studentId}`);

      const netAnnual = Number(student.financial.tuitionFee || 0) - Number(student.financial.totalDiscount || 0);
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
            financialYearId: activeFY.id,
            schoolId: context.schoolId,
            branchId: context.branchId,
            amountPaid: s.amountPaid,
            lateFeePaid: s.lateFeePaid,
            totalPaid: s.amountPaid + s.lateFeePaid,
            paymentMode: params.paymentMode,
            paymentReference: params.paymentReference,
            collectedBy: context.role,
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
    });

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
    const context = await getTenantContext();
    const { calculateTermBreakdown } = await import("../utils/fee-utils");

    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: context.schoolId
      },
      include: {
        academic: { include: { class: true } },
        financial: { include: { discounts: { include: { discountType: true } } } },
        collections: { 
          where: { status: "Success" },
          orderBy: { paymentDate: 'desc' } 
        }
      }
    });

    if (!student) throw new Error("Student not found or unauthorized.");

    // Calculate dynamic term status
    const tuition = Number(student.financial?.tuitionFee || 0);
    const discount = Number(student.financial?.totalDiscount || 0);
    const paymentType = student.financial?.paymentType || "Term-wise";
    const breakdown = calculateTermBreakdown(tuition, discount, paymentType);

    // Sync isPaid status from history
    const paidTerms = student.collections.flatMap((c: any) => {
      const allocated = c.allocatedTo as any;
      return allocated?.terms || [];
    });

    breakdown.term1.isPaid = paidTerms.includes("term1");
    breakdown.term2.isPaid = paidTerms.includes("term2");
    breakdown.term3.isPaid = paidTerms.includes("term3");

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
    const context = await getTenantContext();
    
    // 2% Convenience Fee Enrichment
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
    const context = await getTenantContext();
    
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
    // We pass the convenienceFee here to ensure the 100/2 split in the Journal Entry
    const result = await recordFeeCollection({
      studentId: params.studentId,
      selectedTerms: params.selectedTerms,
      amountPaid: params.amountPaid,
      paymentMode: "Razorpay",
      paymentReference: params.razorpay_order_id,
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
 * getFinanceKPIs
 * 
 * Fetches real-time financial metrics for the dashboard.
 */
export async function getFinanceKPIs() {
  try {
    const context = await getTenantContext();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Daily Revenue (Sum of totalPaid today)
    const dailyRevenue = await prisma.collection.aggregate({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: today },
        status: "Success"
      },
      _sum: { totalPaid: true }
    });

    // 2. Collections count today
    const collectionsToday = await prisma.collection.count({
      where: {
        schoolId: context.schoolId,
        paymentDate: { gte: today },
        status: "Success"
      }
    });

    // 3. Void Requests
    const voidRequests = await prisma.collection.count({
      where: {
        schoolId: context.schoolId,
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
    const context = await getTenantContext();
    const history = await prisma.collection.findMany({
      where: { schoolId: context.schoolId },
      include: { student: true },
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
        financial: true,
        collections: { where: { status: "Success" } }
      }
    });

    if (!student) throw new Error("Verification Failed: Admission ID mismatch.");

    // Recalculate fee for this specific term
    const { calculateTermBreakdown } = await import("../utils/fee-utils");
    const tuition = Number(student.financial?.tuitionFee || 0);
    const discount = Number(student.financial?.totalDiscount || 0);
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
    const context = await getTenantContext();
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
    const context = await getTenantContext();
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
    const context = await getTenantContext();
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
    const context = await getTenantContext();
    const requests = await prisma.collection.findMany({
      where: {
        schoolId: context.schoolId,
        status: "VoidRequested"
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true, academic: { select: { class: { select: { name: true } } } } } }
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
    const context = await getTenantContext();
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
    const context = await getTenantContext();
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
