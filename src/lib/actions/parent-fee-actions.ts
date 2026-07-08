"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function getStudentFeeLedgerAction(studentId: string) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Parent session expired." };
    }

    // 🛡️ SECURITY: Verify sibling linkage (prevent cross-family leaks)
    const linkage = await prismaBypass.studentGuardian.findFirst({
      where: {
        studentId,
        guardianId: identity.guardianId,
        activeStatus: "ACTIVE"
      }
    });
    if (!linkage) {
      return { success: false, error: "ACCESS_DENIED: Student profile is not linked to your parent account." };
    }

    // 1. Fetch all Invoices for this Student
    const invoices = await prismaBypass.feeInvoice.findMany({
      where: { studentId },
      include: { items: true },
      orderBy: { generatedAt: "desc" }
    });

    // 2. Fetch all Collections (Receipts) for this Student
    const collections = await prismaBypass.collection.findMany({
      where: { studentId, status: "Success" },
      orderBy: { paymentDate: "desc" }
    });

    // 3. Fetch Ledger Entries
    const ledgerEntries = await prismaBypass.ledgerEntry.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" }
    });

    // 4. Calculate Paid & Outstanding Summary
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    invoices.forEach((inv: any) => {
      totalInvoiced += Number(inv.totalAmount || 0);
      totalOutstanding += Number(inv.balance || 0);
    });

    collections.forEach((col: any) => {
      totalPaid += Number(col.amountPaid || 0);
    });

    // Map installment schedule based on invoices
    const installments = invoices.map((inv: any) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.totalAmount || 0),
      balance: Number(inv.balance || 0),
      dueDate: inv.dueDate,
      status: Number(inv.balance || 0) <= 0 ? "PAID" : "PARTIAL_OR_UNPAID"
    }));

    // Map past receipts
    const receipts = collections.map((col: any) => ({
      receiptId: col.id,
      receiptNumber: col.receiptNumber,
      amountPaid: Number(col.amountPaid || 0),
      paymentMode: col.paymentMode,
      paymentReference: col.paymentReference || "N/A",
      date: col.paymentDate
    }));

    return {
      success: true,
      summary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding
      },
      installments,
      receipts,
      ledger: ledgerEntries
    };
  } catch (error: any) {
    console.error("Get Student Fee Ledger Error:", error);
    return { success: false, error: "Failed to load fee ledger details." };
  }
}
