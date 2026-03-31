"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext, getTenancyFilters } from "../utils/tenant-context";
import { CounterService } from "../services/counter-service";
import { Decimal } from "@prisma/client/runtime/library";

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
 * recordFeeCollection
 * 
 * Atomic transaction to record payment with strict term-locking and waiver audit.
 */
export async function recordFeeCollection(params: {
  studentId: string;
  selectedTerms: string[]; // e.g. ["term1", "term2"]
  amountPaid: number;      // System-calculated sum of selected terms
  paymentMode: string;
  paymentReference?: string;
  lateFeePaid: number;
  lateFeeWaived: boolean;
  waiverReason?: string;
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

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: params.studentId,
          financialYearId: activeFY.id,
          schoolId: context.schoolId,
          branchId: context.branchId,
          amountPaid: params.amountPaid,
          lateFeePaid: params.lateFeePaid,
          totalPaid: params.amountPaid + params.lateFeePaid,
          paymentMode: params.paymentMode,
          paymentReference: params.paymentReference,
          collectedBy: context.role,
          status: "Success",
          allocatedTo: {
            terms: params.selectedTerms,
            lateFeeWaived: params.lateFeeWaived,
            waiverReason: params.waiverReason
          }
        }
      });

      // Advanced Ledger Posting (Component-Based)
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const tuitionAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4110" } });

      if (cashAcc && tuitionAcc) {
        const total = params.amountPaid + params.lateFeePaid;
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: total,
            totalCredit: total,
            description: `Fee Collection (${params.selectedTerms.join(', ')}) - Receipt: ${receiptNumber}`,
            lines: {
              create: [
                { accountId: cashAcc.id, debit: total, credit: 0 },
                { accountId: tuitionAcc.id, debit: 0, credit: total }
              ]
            }
          }
        });

        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: total } } });
      }

      return collection;
    });

    revalidatePath("/admin/fees");
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
