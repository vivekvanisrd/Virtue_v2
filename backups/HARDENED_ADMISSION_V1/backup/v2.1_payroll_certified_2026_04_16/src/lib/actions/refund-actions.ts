"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * createCreditNoteAction
 * 
 * The Authorized Refund System (Elite V3).
 * Generates a non-deletable CN-... ledger entry to reverse revenue.
 */
export async function createCreditNoteAction(data: {
  studentId: string;
  originalReceiptNo: string;
  amount: number;
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // 1. Generate CN Sequence with School-Branch Prefix
    const [school, branch, count] = await Promise.all([
      prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } }),
      prisma.branch.findUnique({ where: { id: context.branchId || "" }, select: { branchCode: true } }),
      prisma.creditNote.count({ where: { schoolId: context.schoolId } })
    ]);

    const schoolPrefix = school?.code || "SCH";
    const branchPrefix = branch?.branchCode || "BR";
    const cnNumber = `${schoolPrefix}-${branchPrefix}-CN-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    // 2. Atomic Transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const creditNote = await tx.creditNote.create({
        data: {
          ...data,
          cnNumber,
          schoolId: context.schoolId,
          branchId: context.branchId
        }
      });

      // 3. Accounting Integration (V3 Logic)
      // Debit: Revenue (4100 / 4110), Credit: Cash/Bank (1110)
      const transRevAcc = await tx.chartOfAccount.findFirst({ 
        where: { schoolId: context.schoolId, accountCode: "4100" } 
      });
      const cashAcc = await tx.chartOfAccount.findFirst({ 
        where: { schoolId: context.schoolId, accountCode: "1110" } 
      });

      if (transRevAcc && cashAcc) {
        await tx.journalEntry.create({
          data: {
            schoolId: context.schoolId,
            financialYearId: "FY2026",
            entryType: "CREDIT_NOTE",
            totalDebit: data.amount,
            totalCredit: data.amount,
            description: `Refund Issued: ${cnNumber} (Orig: ${data.originalReceiptNo})`,
            lines: {
              create: [
                { accountId: transRevAcc.id, debit: data.amount, credit: 0 },
                { accountId: cashAcc.id, debit: 0, credit: data.amount },
              ]
            }
          }
        });
        
        // Adjust Balances
        await tx.chartOfAccount.update({ where: { id: transRevAcc.id }, data: { currentBalance: { decrement: data.amount } } });
        await tx.chartOfAccount.update({ where: { id: cashAcc.id }, data: { currentBalance: { decrement: data.amount } } });
      }

      return creditNote;
    });

    revalidatePath("/admin/management/refunds");
    return { 
      success: true, 
      data: {
        ...result,
        amount: Number(result.amount)
      } 
    };
  } catch (error: any) {
    return { success: false, error: "Refund processing failure: " + error.message };
  }
}
