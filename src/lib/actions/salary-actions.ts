"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "../utils/tenant-context";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * serialize
 * 
 * Safely converts Prisma-specific types (like Decimal) into plain JSON-serializable numbers.
 */
const serialize = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) 
      ? Number(value) 
      : value
  ));
};

/**
 * generatePayrollDraft
 * 
 * CORE PAYROLL ENGINE v1.0:
 * 1. Fetches all active staff with professional components.
 * 2. Calculates statutory deductions (PF/ESI/PT) based on institutional policy.
 * 3. Incorporates monthly advance installment deductions.
 * 4. Saves a 'DRAFT' Payroll Run for accountant review.
 */
export async function generatePayrollDraft(params: { month: number; year: number }) {
  try {
    const context = await getTenantContext();
    
    // 1. Fetch Active Staff with Financial Registry
    const staffList = await prisma.staff.findMany({
      where: { 
        schoolId: context.schoolId, 
        status: "Active",
        professional: { isNot: null } 
      },
      include: { 
        professional: true,
        advances: { where: { status: "Active" } }
      }
    });

    if (staffList.length === 0) throw new Error("No active staff with professional profiles found.");

    let totalGross = new Decimal(0);
    let totalNet = new Decimal(0);
    const slips = [];

    for (const member of staffList) {
      const prof = member.professional!;
      const basic = new Decimal(prof.basicSalary);
      const hra = new Decimal(prof.hraAmount || 0);
      const da = new Decimal(prof.daAmount || 0);
      const special = new Decimal(prof.specialAllowance || 0);
      const transport = new Decimal(prof.transportAllowance || 0);

      // Gross Calculation
      const gross = basic.plus(hra).plus(da).plus(special).plus(transport);

      // Deductions Calculation
      let pf = new Decimal(0);
      let esi = new Decimal(0);
      let pt = new Decimal(0);
      let advanceDeduction = new Decimal(0);

      if (prof.isPFEnabled) {
         // Standard 12% of Basic (Simplified Virtue Rule)
         pf = basic.times(0.12).toDecimalPlaces(2);
      }

      if (prof.isESIEnabled && gross.lessThanOrEqualTo(21000)) {
         // Standard 0.75% of Gross
         esi = gross.times(0.0075).toDecimalPlaces(2);
      }

      if (prof.isPTEnabled) {
         pt = new Decimal(200); // Standard Professional Tax Slab
      }

      // Check for active advances
      if (member.advances.length > 0) {
         for (const adv of member.advances) {
            const installment = new Decimal(adv.installment);
            const balance = new Decimal(adv.balance);
            const toDeduct = Decimal.min(installment, balance);
            advanceDeduction = advanceDeduction.plus(toDeduct);
         }
      }

      const totalDeductions = pf.plus(esi).plus(pt).plus(advanceDeduction);
      const net = gross.minus(totalDeductions);

      totalGross = totalGross.plus(gross);
      totalNet = totalNet.plus(net);

      slips.push({
        staffId: member.id,
        baseAmount: basic,
        grossSalary: gross,
        netSalary: net,
        allowances: { hra, da, special, transport },
        deductions: { pf, esi, pt, advance: advanceDeduction }
      });
    }

    // 2. Clear existing draft for this period if present
    await prisma.payrollRun.deleteMany({
      where: { schoolId: context.schoolId, month: params.month, year: params.year, status: "Draft" }
    });

    // 3. Create the Draft Run
    const run = await prisma.payrollRun.create({
      data: {
        schoolId: context.schoolId,
        month: params.month,
        year: params.year,
        totalGross,
        totalNet,
        status: "Draft",
        slips: {
          create: slips.map(s => ({
            staffId: s.staffId,
            baseAmount: s.baseAmount,
            grossSalary: s.grossSalary,
            netSalary: s.netSalary,
            allowances: s.allowances,
            deductions: s.deductions
          }))
        }
      },
      include: { slips: { include: { staff: true } } }
    });

    return { success: true, data: serialize(run) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * finalizePayrollRun
 * 
 * Manager Approval Engine:
 * 1. Locks the Draft.
 * 2. Deducts outstanding Advance balances.
 * 3. Posts Consolidated Salary Expense to Ledger.
 */
export async function finalizePayrollRun(runId: string) {
  try {
     const context = await getTenantContext();
     
     const run = await prisma.payrollRun.findUnique({
       where: { id: runId, schoolId: context.schoolId },
       include: { slips: true }
     });

     if (!run || run.status !== "Draft") throw new Error("Only draft payroll runs can be finalized.");

     await prisma.$transaction(async (tx: any) => {
        // 1. Update Status
        await tx.payrollRun.update({
          where: { id: runId },
          data: { status: "Approved", approvedBy: context.role, approvedAt: new Date() }
        });

        // 2. Process Advance Balances
        for (const slip of run.slips) {
           const deductions = slip.deductions as any;
           if (deductions && Number(deductions.advance) > 0) {
              const activeAdv = await tx.staffAdvance.findFirst({
                 where: { staffId: slip.staffId, status: "Active" }
              });
              if (activeAdv) {
                 const newBalance = new Decimal(activeAdv.balance).minus(new Decimal(deductions.advance));
                 await tx.staffAdvance.update({
                    where: { id: activeAdv.id },
                    data: { 
                      balance: newBalance,
                      status: newBalance.lessThanOrEqualTo(0) ? "Paid" : "Active"
                    }
                 });
              }
           }
        }

        // 3. LEDGER POSTING: Accrual Basis
        // Dr. Salary Expense (5100) | Cr. Salary Payable (2100)
        const expAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "5100" } });
        const payAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "2100" } });

        if (expAcc && payAcc) {
           const amount = run.totalNet;
           await tx.journalEntry.create({
              data: {
                 schoolId: context.schoolId,
                 financialYearId: (await tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })).id,
                 entryType: "PAYROLL",
                 totalDebit: amount,
                 totalCredit: amount,
                 description: `Payroll Accrual for ${run.month}/${run.year}`,
                 lines: {
                    create: [
                       { accountId: expAcc.id, debit: amount, credit: 0 },
                       { accountId: payAcc.id, debit: 0, credit: amount }
                    ]
                 }
              }
           });
           
           await tx.chartOfAccount.update({ where: { id: expAcc.id }, data: { currentBalance: { increment: amount } } });
           await tx.chartOfAccount.update({ where: { id: payAcc.id }, data: { currentBalance: { increment: amount } } });
        }
     });

     revalidatePath("/admin/salaries");
     return { success: true, message: "Payroll finalized and advances adjusted." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * recordSalaryDisbursement
 * 
 * Bank Transfer reconciliation:
 * Posts Dr. Salary Payable | Cr. Bank
 */
export async function recordSalaryDisbursement(runId: string, paymentMode: string, reference?: string) {
   try {
      const context = await getTenantContext();
      
      const run = await prisma.payrollRun.findUnique({
        where: { id: runId, schoolId: context.schoolId }
      });

      if (!run || run.status !== "Approved") throw new Error("Only approved runs can be disbursed.");

      await prisma.$transaction(async (tx: any) => {
         // 1. Update Status
         await tx.payrollRun.update({
            where: { id: runId },
            data: { status: "Paid", processedAt: new Date() }
         });

         await tx.salarySlip.updateMany({
            where: { payrollRunId: runId },
            data: { status: "Paid", paymentMode, paymentRef: reference, paidAt: new Date() }
         });

         // 2. LEDGER POSTING: Settlement
         const payAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "2100" } });
         const bankAcc = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1110" } });

         if (payAcc && bankAcc) {
            const amount = run.totalNet;
            await tx.journalEntry.create({
               data: {
                  schoolId: context.schoolId,
                  financialYearId: (await tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })).id,
                  entryType: "DISBURSEMENT",
                  totalDebit: amount,
                  totalCredit: amount,
                  description: `Salary Disbursement for ${run.month}/${run.year} via ${paymentMode}`,
                  lines: {
                     create: [
                        { accountId: payAcc.id, debit: amount, credit: 0 },
                        { accountId: bankAcc.id, debit: 0, credit: amount }
                     ]
                    }
               }
            });

            await tx.chartOfAccount.update({ where: { id: payAcc.id }, data: { currentBalance: { decrement: amount } } });
            await tx.chartOfAccount.update({ where: { id: bankAcc.id }, data: { currentBalance: { decrement: amount } } });
         }
      });

      revalidatePath("/admin/salaries");
      return { success: true, message: "Salaries disbursed successfully." };
   } catch (error: any) {
      return { success: false, error: error.message };
   }
}
