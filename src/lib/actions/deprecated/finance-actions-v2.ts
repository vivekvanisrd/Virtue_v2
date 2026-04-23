"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { Decimal } from "@prisma/client/runtime/library";
import { revalidatePath } from "next/cache";

// Static imports for Server Action stability
import { validateMilestone } from "../utils/fee-utils";
import { CounterService } from "../services/counter-service";
import { ST_PROVISIONAL, ST_CONFIRMED } from "../constants/admission-statuses";

/**
 * serialize
 * 
 * Safely converts Prisma-specific types (like Decimal) into plain JSON-serializable numbers
 */
const serialize = <T>(data: T): T => {
  if (!data) return data;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    // 1. Handle Decimal (Prisma)
    if (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) {
      return Number(value);
    }
    // 2. Handle BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }));
};

/**
 * getStudentFeeStatusV2
 * 
 * SOVEREIGN V2: POINT-OF-SALE SENSING
 * This function retrieves the complete fee landscape for a student.
 * It combines actual dues with the school's global fee templates to ensure
 * that boxes for "everything" (Admission, Transport, etc.) are always visible.
 */
export async function getStudentFeeStatusV2(studentId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    const { calculateTermBreakdown } = await import("../utils/fee-utils");

    // 1. Fetch the Student with full financial context
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: context.schoolId },
      include: {
        academic: { include: { class: true } },
        financial: { 
          include: { 
            components: { include: { masterComponent: true } },
            feeStructure: { include: { components: { include: { masterComponent: true } } } }
          } 
        },
        ledgerEntries: { where: { type: "CHARGE" } },
        collections: { 
          where: { status: "Success" },
          orderBy: { paymentDate: 'desc' } 
        }
      }
    });

    if (!student) throw new Error("Student not found.");

    // 2. Fetch ALL Master Components for the School (The "POS List")
    // This allows us to show boxes for fees that weren't assigned to the student yet.
    const masters = await prisma.feeComponentMaster.findMany({
      where: { schoolId: context.schoolId }
    });

    // 3. Calculate Tuition Breakdown (Standard Logic)
    const annualTuition = Number(student.financial?.annualTuition || 0);
    const totalDiscount = Number(student.financial?.totalDiscount || 0);
    const paymentType = student.financial?.paymentType || "Term-wise";
    const breakdown = calculateTermBreakdown(annualTuition, totalDiscount, paymentType);

    // 4. Track Paid Items
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

    // 5. UNIVERSAL ANCILLARY MAPPING (The POS Grid)
    const ancillary: Record<string, any> = {};

    // First, populate with ALL Master Components as ₹0 placeholders
    masters.forEach(m => {
       const name = m.name.toLowerCase();
       if (name.includes("tuition")) return; // Tuition is handled by terms

       let key = "";
       if (name.includes("admission")) key = "admissionFee";
       else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
       else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
       else if (name.includes("library")) key = "libraryFee";
       else if (name.includes("exam")) key = "examFee";
       else if (name.includes("computer")) key = "computerFee";
       else key = `master_${m.id}`;

       ancillary[key] = {
          amount: 0,
          isPaid: paidTerms.includes(key) || paidTerms.includes(m.name),
          label: m.name,
          masterId: m.id,
          isAdHoc: true
       };
    });

    // Second, OVERLAY with Template Data (Desired State)
    if (student.financial?.feeStructure?.components) {
       student.financial.feeStructure.components.forEach((comp: any) => {
          const name = comp.masterComponent?.name?.toLowerCase() || "";
          if (name.includes("tuition")) return;

          let key = "";
          if (name.includes("admission")) key = "admissionFee";
          else if (name.includes("caution") || name.includes("deposit")) key = "cautionDeposit";
          else if (name.includes("transport") || name.includes("bus")) key = "transportFee";
          else if (name.includes("library")) key = "libraryFee";
          else if (name.includes("exam")) key = "examFee";
          else if (name.includes("computer")) key = "computerFee";
          else return; // only standard keys for now

          if (ancillary[key]) {
             ancillary[key].amount = Number(comp.amount);
             ancillary[key].isAdHoc = false;
          }
       });
    }

    // Third, OVERLAY with Actual Ledger Charges (Sensed Reality)
    if (student.ledgerEntries) {
       student.ledgerEntries.forEach((entry: any) => {
          const reason = entry.reason.toLowerCase();
          if (reason.includes("tuition") || reason.includes("term ")) return;

          let key = "";
          if (reason.includes("admission")) key = "admissionFee";
          else if (reason.includes("caution") || reason.includes("deposit")) key = "cautionDeposit";
          else if (reason.includes("transport") || reason.includes("bus")) key = "transportFee";
          else if (reason.includes("library")) key = "libraryFee";
          else if (reason.includes("exam")) key = "examFee";

          if (key && ancillary[key]) {
             ancillary[key].amount = Number(entry.amount);
             ancillary[key].isAdHoc = false;
          }
       });
    }

    breakdown.ancillary = ancillary;

    return { 
      success: true, 
      data: serialize({
        ...student,
        feeBreakdown: breakdown
      })
    };

  } catch (error: any) {
    console.error("V2_FEE_STATUS_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * recordConsolidatedCollectionV2
 * 
 * SOVEREIGN V2: CONSOLIDATED SETTLEMENT ENGINE
 * Processes multiple students and multiple fee categories (Tuition + Ancillary) in one atomic transaction.
 * 
 * Features:
 * 1. Atomic Settlement: All students or none.
 * 2. Automated Ledger Posting: Real-time COA updates.
 * 3. Identity Elevation: Promotes Provisional students to Confirmed upon milestone clearance.
 * 4. Idempotency: Protects against double-billing.
 */
export async function recordConsolidatedCollectionV2(params: {
  settlements: {
    studentId: string;
    selectedItems: string[]; // Mixed keys: term1, term2, admissionFee, transportFee, etc.
    amounts: Record<string, number>; // Maps key to amount (important for ad-hoc)
  }[];
  paymentMode: string;
  paymentReference?: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const context = identity;

    // 1. Resolve Financial Year
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("No active financial year found.");

    // 2. Idempotency Check
    if (params.paymentReference) {
      const existing = await prisma.collection.findFirst({
        where: { 
          schoolId: context.schoolId,
          paymentReference: params.paymentReference,
          status: "Success"
        }
      });
      if (existing) return { success: true, data: serialize(existing), message: "IDEMPOTENT_SKIPPED" };
    }

    // 3. ATOMIC TRANSACTION
    const result = await prisma.$transaction(async (tx: any) => {
      const collections = [];
      let consolidatedTotal = 0;

      for (const s of params.settlements) {
        // A. Load Student Context
        const student = await tx.student.findUnique({
          where: { id: s.studentId },
          include: { 
            financial: true, 
            collections: { where: { status: "Success" } } 
          }
        });

        if (!student) throw new Error(`Student ${s.studentId} not found.`);

        // B. Calculate Totals for this Student
        const tuitionTerms = s.selectedItems.filter(item => item.startsWith("term"));
        const ancillaryItems = s.selectedItems.filter(item => !item.startsWith("term"));

        const studentTotal = s.selectedItems.reduce((sum, item) => sum + (s.amounts[item] || 0), 0);
        consolidatedTotal += studentTotal;

        // C. Milestone Validation (Tuition specific)
        if (tuitionTerms.length > 0) {
           const netAnnual = Number(student.financial?.annualTuition || 0) - Number(student.financial?.totalDiscount || 0);
           const prevPaid = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0);
           const newTotal = prevPaid + studentTotal; // Approximate for milestone check

           for (const term of tuitionTerms) {
              const milestone = validateMilestone(term, newTotal, netAnnual);
              // Note: We are lenient on ad-hoc V2 hub, but can enforce if needed.
           }
        }

        // D. Generate Receipt Number
        const admission = await tx.academicHistory.findFirst({
            where: { studentId: s.studentId, schoolId: context.schoolId },
            include: { branch: { include: { school: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const receiptNumber = await CounterService.generateReceiptNumber({
            schoolId: context.schoolId,
            schoolCode: admission?.branch?.school?.code || "SCH",
            branchId: context.branchId,
            branchCode: admission?.branch?.code || "BR",
            year: activeFY.name
        }, tx);

        // E. Create Collection
        const collection = await tx.collection.create({
          data: {
            receiptNumber,
            studentId: s.studentId,
            admissionId: admission?.id,
            financialYearId: activeFY.id,
            schoolId: context.schoolId,
            branchId: context.branchId,
            amountPaid: studentTotal,
            totalPaid: studentTotal,
            paymentMode: params.paymentMode,
            paymentReference: params.paymentReference,
            collectedBy: context.name || context.role,
            status: "Success",
            allocatedTo: {
              items: s.selectedItems,
              breakdown: s.amounts,
              v2: true
            }
          }
        });

        // F. PROMOTION LOGIC (Identity Elevation)
        if (student.status === ST_PROVISIONAL && student.financial) {
           const plan = student.financial.paymentType || "Term-wise";
           const threshold = plan === "Annual" 
              ? Number(student.financial.annualTuition || 0)
              : Number(student.financial.term1Amount || 0);

           const totalSettled = student.collections.reduce((sum: number, c: any) => sum + Number(c.amountPaid), 0) + studentTotal;

           if (totalSettled >= (threshold - 1) && threshold > 0) {
              const ayName = admission?.academicYearId || activeFY.name;
              
              const admissionNumber = await CounterService.generateAdmissionNumber({
                 schoolId: context.schoolId,
                 schoolCode: admission?.branch?.school?.code || "SCH",
                 branchId: context.branchId,
                 branchCode: admission?.branch?.code || "BR",
                 year: ayName
              }, tx);

              const studentCode = await CounterService.generateStudentCode({
                 schoolId: context.schoolId,
                 schoolCode: admission?.branch?.school?.code || "SCH",
                 branchId: context.branchId,
                 branchCode: admission?.branch?.code || "BR",
                 year: ayName
              }, tx);

              await tx.student.update({
                 where: { id: student.id },
                 data: { 
                   status: ST_CONFIRMED,
                   admissionNumber,
                   studentCode
                 }
              });
           }
        }

        collections.push({
          id: collection.id,
          receiptNumber: collection.receiptNumber
        });
      }

      // G. CONSOLIDATED LEDGER POSTING
      const cashAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });
      const arAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

      if (cashAcc && arAcc) {
         await tx.journalEntry.create({
           data: {
             schoolId: context.schoolId,
             branchId: context.branchId,
             financialYearId: activeFY.id,
             entryType: "RECEIPT",
             totalDebit: consolidatedTotal,
             totalCredit: consolidatedTotal,
             description: `V2 Batch Settlement (${params.settlements.length} profiles) - Ref: ${params.paymentReference || 'INTERNAL'}`,
             lines: {
               create: [
                 { accountId: cashAcc.id, debit: consolidatedTotal, credit: 0 },
                 { accountId: arAcc.id, debit: 0, credit: consolidatedTotal }
               ]
             }
           }
         });

         await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { increment: consolidatedTotal } } });
         await tx.chartOfAccount.update({ where: { id: arAcc.id }, data: { currentBalance: { decrement: consolidatedTotal } } });
      }

      return collections;
    }, { maxWait: 10000, timeout: 30000 });

    revalidatePath("/dashboard/finance/collect");
    
    return { success: true, data: serialize(result) };

  } catch (error: any) {
    console.error("V2_SETTLEMENT_ERROR:", error);
    return { success: false, error: error.message };
  }
}

