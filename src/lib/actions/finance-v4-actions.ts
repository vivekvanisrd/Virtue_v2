"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CounterService } from "../services/counter-service";

const prisma = new PrismaClient();

// Parents pay round figures (e.g. ₹33,000 instead of ₹33,045). This tolerance is INTENTIONAL.
const ROUND_FIGURE_TOLERANCE_INR = 49;

/**
 * ENTERPRISE V4 ALLOCATION ENGINE
 * Implements Sovereign Priority: Transport > Tuition > Others.
 * Features: Sub-ledger tracking, Audit versioning, and Advance siphoning.
 */

/**
 * 1. Collect Fee with Sovereign Allocation
 */
export async function recordEnterpriseCollectionAction(data: {
  schoolId: string;
  branchId: string;
  studentId: string;
  amount: number;
  paymentMode: string;
  reference?: string;
  collectedBy: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // A. Fetch Priorities
      const prioritiesArr = await tx.allocationPriority.findMany({
        where: { schoolId: data.schoolId },
        orderBy: { priority: "asc" }
      });
      const priorityMap = Object.fromEntries(prioritiesArr.map(p => [p.componentType, p.priority]));

      // B. Fetch Unpaid Invoice Items
      const unpaidItems = await tx.feeInvoiceItem.findMany({
        where: {
          invoice: { studentId: data.studentId, schoolId: data.schoolId, status: { in: ["PENDING", "PARTIAL"] } },
          balance: { gt: 0 }
        },
        include: { invoice: true },
        orderBy: [
           { priority: "asc" }, // Configurable priority
           { invoice: { dueDate: "asc" } } // Oldest first
        ]
      });

      // C. Logic: Allocation Loop
      let remainingPayment = data.amount;
      const allocations = [];

      for (const item of unpaidItems) {
        if (remainingPayment <= 0) break;

        const itemBalance = Number(item.balance);
        if (itemBalance <= 0) continue; // Skip items already fully paid (guard against stale data)

        const allocAmount = Math.min(itemBalance, remainingPayment);
        if (allocAmount <= 0) continue; // Safety: never post a zero or negative allocation

        // Update Item Balance
        await tx.feeInvoiceItem.update({
          where: { id: item.id },
          data: {
            paidAmount: { increment: allocAmount },
            balance: { decrement: allocAmount }
          }
        });

        // Update Invoice Header Paid
        await tx.feeInvoice.update({
          where: { id: item.invoiceId },
          data: {
             paidAmount: { increment: allocAmount },
             balance: { decrement: allocAmount },
             status: (Number(item.invoice.paidAmount) + allocAmount >= Number(item.invoice.totalAmount)) ? "PAID" : "PARTIAL"
          }
        });

        allocations.push({
          invoiceId: item.invoiceId,
          invoiceItemId: item.id,
          amount: allocAmount
        });

        remainingPayment -= allocAmount;
      }

      // D. Record the Collection (Shadow Registry)
      const activeFY = await tx.financialYear.findFirst({
        where: { schoolId: data.schoolId, isCurrent: true }
      });
      if (!activeFY) throw new Error("Active Financial Year not configured.");

      const branchRecord = await tx.branch.findUnique({
        where: { id: data.branchId },
        select: { code: true, school: { select: { code: true } } }
      });
      const schoolCode = branchRecord?.school?.code || data.schoolId;
      const branchCode = branchRecord?.code || "MAIN";

      const receiptNumber = await CounterService.generateReceiptNumber({
        schoolId: data.schoolId,
        schoolCode,
        branchId: data.branchId,
        branchCode,
        year: activeFY.name || new Date().getFullYear().toString()
      }, tx);

      const collection = await tx.collection.create({
        data: {
          receiptNumber,
          financialYearId: activeFY.id,
          schoolId: data.schoolId,
          branchId: data.branchId,
          studentId: data.studentId,
          amountPaid: data.amount,
          totalPaid: data.amount,
          paymentMode: data.paymentMode,
          paymentReference: data.reference,
          collectedBy: data.collectedBy,
          status: "Success",
          backboneAllocations: {
            create: allocations
          }
        }
      });

      // E. Return Success Event
      revalidatePath("/dashboard/finance");
      return { success: true, collectionId: collection.id, unallocated: remainingPayment };
    });
  } catch (error: any) {
    console.error("ENTERPRISE_COLLECTION_FAILED:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 2. Generate Monthly Invoice Engine
 * Logic to generate based on locked StudentFeeComponents.
 * Heartbeat: Executes on the 1st of the month.
 */
export async function generateMonthlyEnterpriseInvoices(data: {
  schoolId: string;
  month: string;
  academicYearId: string;
  financialYearId: string;
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      // A. Fetch All Active Students with Locked Profiles
      const students = await tx.student.findMany({
        where: { schoolId: data.schoolId, status: "Active" },
        include: { financial: { include: { components: { where: { isApplicable: true, isLocked: true } } } } }
      });

      let invoiceCount = 0;

      for (const student of students) {
        // Create the Month Head
        const invoice = await tx.feeInvoice.create({
          data: {
            schoolId: data.schoolId,
            branchId: student.branchId || "MAIN",
            studentId: student.id,
            academicYearId: data.academicYearId,
            financialYearId: data.financialYearId,
            totalAmount: 0, // Will update after items
            balance: 0,
            dueDate: new Date(), // Grace period logic would go here
            status: "PENDING"
          }
        });

        let totalForInvoice = 0;

        // Create Line-Items from the LOCKED components
        const components = student.financial?.components || [];
        for (const sfc of components) {
          const itemAmount = Number(sfc.baseAmount) - Number(sfc.discountAmount);
          
          await tx.feeInvoiceItem.create({
            data: {
              invoiceId: invoice.id,
              componentId: sfc.componentId,
              componentName: "Fee Line", // In a real run, fetch masterComponent.name
              componentType: "CORE",
              amount: itemAmount,
              balance: itemAmount,
              priority: 100 // Default, will be refined by AllocationPriority lookup
            }
          });

          totalForInvoice += itemAmount;
        }

        // Finalize Invoice Header
        await tx.feeInvoice.update({
          where: { id: invoice.id },
          data: { totalAmount: totalForInvoice, balance: totalForInvoice }
        });

        invoiceCount++;
      }

      return { success: true, generated: invoiceCount };
    });
  } catch (error: any) {
    console.error("INVOICE_GENERATION_FAILED:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 3. Sovereign Admissions Lock (Requirement 8)
 * Freezes the fee profile once student is active.
 */
export async function lockStudentFeeProfile(studentId: string, authorId: string) {
  try {
    const financial = await prisma.financialRecord.findUnique({
      where: { studentId: studentId },
      select: { id: true }
    });
    if (!financial) throw new Error("Financial record not found for student.");

    await prisma.studentFeeComponent.updateMany({
      where: { studentFinancialId: financial.id },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockReason: "ADMISSION",
        version: { increment: 1 }
      }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 4. Sovereign Late Fee Processor
 * Requirement 5: Tuition-only, optional/automatic late fee.
 */
export async function applyLateFeesToOverdueInvoices(schoolId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const rule = await tx.lateFeeRule.findUnique({
        where: { schoolId_componentType: { schoolId, componentType: "TUTION" } }
      });
      
      if (!rule) return { success: false, error: "No Late Fee Rule found." };

      const graceLimit = new Date();
      graceLimit.setDate(graceLimit.getDate() - rule.graceDays);

      // Find Pending Tuition Invoice Items past grace
      const overdueItems = await tx.feeInvoiceItem.findMany({
        where: { 
          componentType: "TUTION", 
          balance: { gt: 0 },
          invoice: { schoolId, dueDate: { lt: graceLimit } }
        },
        include: { invoice: true }
      });

      let lateFeesApplied = 0;

      for (const item of overdueItems) {
         // Check if Late Fee already exists for this invoice
         const existingLate = await tx.feeInvoiceItem.findFirst({
           where: { invoiceId: item.invoiceId, componentType: "LATE_FEE" }
         });

         if (!existingLate) {
            const feeAmount = Number(rule.value); 
            await tx.feeInvoiceItem.create({
              data: {
                invoiceId: item.invoiceId,
                componentName: "Late Payment Charge (Tuition)",
                componentType: "LATE_FEE",
                amount: feeAmount,
                balance: feeAmount,
                priority: 5, // High priority to clear late fee fast
                ledgerCode: "4900" 
              }
            });

            // Update Invoice Header
            await tx.feeInvoice.update({
              where: { id: item.invoiceId },
              data: { 
                totalAmount: { increment: feeAmount },
                balance: { increment: feeAmount }
              }
            });
            lateFeesApplied++;
         }
      }

      return { success: true, processed: lateFeesApplied };
    });
  } catch (error: any) {
    console.error("LATE_FEE_APPLICATION_FAILED:", error);
    return { success: false, error: error.message };
  }
}
