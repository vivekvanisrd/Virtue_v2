"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext, getTenancyFilters } from "../utils/tenant-context";
import { CounterService } from "../services/counter-service";

/**
 * findPotentialSiblings
 * 
 * Uses Sibling Discovery Logic (Phone/Address matching) within the same school.
 */
export async function findPotentialSiblings(studentId: string) {
  try {
    const context = await getTenantContext();
    
    const targetStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: { family: true, address: true }
    });

    if (!targetStudent) throw new Error("Student not found.");

    const siblings = await prisma.student.findMany({
      where: {
        schoolId: context.schoolId, // Strict isolation
        id: { not: studentId },
        OR: [
          { phone: targetStudent.phone },
          { family: { fatherPhone: targetStudent.family?.fatherPhone } },
          { family: { motherPhone: targetStudent.family?.motherPhone } },
          { address: { permanentAddress: targetStudent.address?.permanentAddress } }
        ]
      }
    });

    return { success: true, data: siblings };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * recordFeeCollection
 * 
 * Atomic transaction to record payment and update ledger with tenancy guards.
 */
export async function recordFeeCollection(params: {
  studentId: string;
  amountPaid: number;
  paymentMode: string;
  paymentReference?: string;
  lateFeePaid?: number;
}) {
  try {
    const context = await getTenantContext();
    
    // 1. Get and Verify Active Financial Year for the school
    const activeFY = await prisma.financialYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });
    if (!activeFY) throw new Error("Active Financial Year not found for this school.");

    // 2. Scoped Receipt Number
    const receiptNumber = await CounterService.generateReceiptNumber({
      schoolId: context.schoolId,
      schoolCode: context.schoolId, // Using schoolId as schoolCode here for simplicity in this legacy call
      branchId: context.branchId,
      branchCode: context.branchId.split('-').pop() || "MNB01", 
      year: new Date().getFullYear().toString()
    });

    // 3. Atomic Financial Operation
    const result = await prisma.$transaction(async (tx) => {
      // Create Collection Record
      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          studentId: params.studentId,
          financialYearId: activeFY.id,
          schoolId: context.schoolId,
          branchId: context.branchId,
          amountPaid: params.amountPaid,
          lateFeePaid: params.lateFeePaid || 0,
          totalPaid: params.amountPaid + (params.lateFeePaid || 0),
          paymentMode: params.paymentMode,
          paymentReference: params.paymentReference,
          collectedBy: context.role, // Simple audit
        }
      });

      // Simple Double-Entry Mock (Needs real COA codes in production)
      const cashAccountId = await tx.chartOfAccount.findFirst({
        where: { schoolId: context.schoolId, accountType: "Asset", accountName: { contains: "Cash" } }
      });
      const incomeAccountId = await tx.chartOfAccount.findFirst({
        where: { schoolId: context.schoolId, accountType: "Income", accountName: { contains: "Fees" } }
      });

      if (cashAccountId && incomeAccountId) {
        // Create Journal Entry
        const journal = await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            entryDate: new Date(),
            description: `Fee Collection - Receipt ${receiptNumber}`,
            financialYearId: activeFY.id,
            entryType: "RECEIPT",
            totalDebit: params.amountPaid,
            totalCredit: params.amountPaid,
            lines: {
              create: [
                { accountId: cashAccountId.id, debit: params.amountPaid, credit: 0 },
                { accountId: incomeAccountId.id, debit: 0, credit: params.amountPaid }
              ]
            }
          }
        });

        // Update COA Balances
        await tx.chartOfAccount.update({
          where: { id: cashAccountId.id },
          data: { currentBalance: { increment: params.amountPaid } }
        });
        await tx.chartOfAccount.update({
          where: { id: incomeAccountId.id },
          data: { currentBalance: { increment: params.amountPaid } }
        });

        // Link Collection to Journal
        await tx.collection.update({
          where: { id: collection.id },
          data: { journalEntryId: journal.id }
        });
      }

      return collection;
    });

    try {
      revalidatePath("/admin/fees");
    } catch (e) {
      // Ignore in non-Next environments
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Collection Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * getStudentFeeStatus with Tenancy Guard
 */
export async function getStudentFeeStatus(studentId: string) {
  try {
    const context = await getTenantContext();

    const student = await prisma.student.findFirst({
      where: { 
        id: studentId,
        schoolId: context.schoolId
      },
      include: {
        academic: { include: { class: true } },
        financial: { include: { discounts: { include: { discountType: true } } } },
        collections: { orderBy: { paymentDate: 'desc' } }
      }
    });

    if (!student) throw new Error("Student not found or unauthorized.");

    return { success: true, data: student };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
