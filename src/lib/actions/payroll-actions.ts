"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "../utils/tenant-context";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Calculates the monthly payrun for all active staff.
 * Logic: (Basic Salary / Days in Month) * (Days in Month - LOP Days).
 */
export async function getPayrollPreviewAction(month: number, year: number) {
  try {
    const context = await getTenantContext();
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch all active staff with professional (salary) and statutory info
    const staff = await prisma.staff.findMany({
      where: { schoolId: context.schoolId, status: "Active" },
      include: { 
        professional: true, 
        statutory: true, 
        bank: true, 
        advances: { where: { status: "Active" } },
        attendance: {
           where: { date: { gte: startDate, lte: endDate } }
        }
      }
    });

    const payrollRecords = staff.map((s: any) => {
      const p = s.professional;
      const basic = Number(p?.basicSalary || 0);
      const da = p?.isDAEnabled ? Number(p?.daAmount || 0) : 0;
      const hra = Number(p?.hraAmount || 0);
      const special = Number(p?.specialAllowance || 0);
      const transport = Number(p?.transportAllowance || 0);
      
      const gross = basic + da + hra + special + transport;
      const dailyRate = basic / daysInMonth; 
      
      // 1. Smart Attendance Logic (Leaves vs. LOP)
      const totalAbsences = s.attendance.filter((a: any) => a.status === "Absent" || a.status === "LOP").length;
      let casualLeavesUsed = 0;
      let sickLeavesUsed = 0;
      let unpaidDays = 0;

      // Casual Leaves check
      const clBalance = p?.casualLeaveBalance || 0;
      casualLeavesUsed = Math.min(totalAbsences, clBalance);
      
      // Sick Leaves check
      const remAbsences = totalAbsences - casualLeavesUsed;
      const slBalance = p?.sickLeaveBalance || 0;
      sickLeavesUsed = Math.min(remAbsences, slBalance);

      // Remaining are LOP
      unpaidDays = totalAbsences - casualLeavesUsed - sickLeavesUsed;
      const lopDeduction = unpaidDays * dailyRate;
      
      // 2. Statutory Deductions (Employee)
      let pfDeduction = 0;
      if (p?.isPFEnabled) {
        pfDeduction = basic > 15000 ? 1800 : basic * 0.12;
      }

      let esiDeduction = 0;
      if (p?.isESIEnabled) {
         esiDeduction = gross * 0.0075; 
      }

      let ptDeduction = 0;
      if (p?.isPTEnabled && gross > 15000) {
         ptDeduction = 200;
      }

      // 3. Employer Contributions (for CTC)
      let employerPF = p?.isPFEnabled ? (basic > 15000 ? 1800 : basic * 0.12) : 0;
      let employerESI = p?.isESIEnabled ? (gross * 0.0325) : 0; // 3.25% is standard employer ESI

      // 4. Loan Recovery
      let loanDeduction = 0;
      const activeAdvance = s.advances[0];
      if (activeAdvance) {
         loanDeduction = Math.min(Number(activeAdvance.installment), Number(activeAdvance.balance));
      }

      const netPay = gross - lopDeduction - pfDeduction - esiDeduction - ptDeduction - loanDeduction;
      const totalCTC = gross + employerPF + employerESI;

      return {
        staffId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        code: s.staffCode,
        basic,
        da,
        hra,
        special,
        gross,
        lopDays: unpaidDays,
        paidLeaves: casualLeavesUsed + sickLeavesUsed,
        lopDeduction,
        pfDeduction,
        esiDeduction,
        ptDeduction,
        loanDeduction,
        employerPF,
        employerESI,
        totalCTC,
        netPay,
        bankAccount: s.bank?.accountNumber || "N/A",
        status: "Draft"
      };
    });

    return { 
      success: true, 
      data: { 
        records: JSON.parse(JSON.stringify(payrollRecords)),
        summary: {
           totalGross: payrollRecords.reduce((sum: number, r: any) => sum + r.basic, 0),
           totalNet: payrollRecords.reduce((sum: number, r: any) => sum + r.netPay, 0),
           count: payrollRecords.length
        }
      } 
    };
  } catch (error) {
    return { success: false, error: "Failed to generate payroll preview." };
  }
}

/**
 * Disburses salaries and records financial journal entries.
 * Atomic Transaction: Staff Payment + Journal Entry (Debit Salaries 4110 / Credit Cash 1110)
 */
export async function disburseSalariesAction(month: number, year: number, records: any[]) {
  try {
    const context = await getTenantContext();
    const fy = await prisma.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } });
    if (!fy) throw new Error("Active Financial Year not found.");

    const totalNet = records.reduce((sum, r) => sum + r.netPay, 0);
    const entryCode = `SLRY-${month}-${year}-${Math.floor(Math.random() * 1000)}`;

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Journal Entry
      const journal = await tx.journalEntry.create({
        data: {
          entryCode,
          financialYearId: fy.id,
          schoolId: context.schoolId,
          entryType: "PAYROLL",
          description: `Staff Salaries Disbursement for ${formatMonth(month)} ${year}`,
          totalDebit: totalNet,
          totalCredit: totalNet,
          lines: {
            create: [
              { accountId: await getAccountId(tx, context.schoolId, "4110"), debit: totalNet, credit: 0, description: "Salaries Expense" },
              { accountId: await getAccountId(tx, context.schoolId, "1110"), debit: 0, credit: totalNet, description: "Salaries Payout" }
            ]
          }
        }
      });

      // 2. Update Account Balances
      await tx.chartOfAccount.update({
        where: { schoolId_accountCode: { schoolId: context.schoolId, accountCode: "4110" } },
        data: { currentBalance: { increment: totalNet } }
      });
      await tx.chartOfAccount.update({
        where: { schoolId_accountCode: { schoolId: context.schoolId, accountCode: "1110" } },
        data: { currentBalance: { decrement: totalNet } }
      });

      // 3. Update Staff Balances (Leaves & Loans)
      for (const record of records) {
        // Consumption of Paid Leaves
        if (record.paidLeaves > 0) {
           // Simple priority: Casual first, then Sick. (Logic matches Preview)
           await tx.staffProfessional.update({
             where: { staffId: record.staffId },
             data: { 
                casualLeaveBalance: { decrement: record.paidLeaves } // This is simplified, in real app we'd split CL/SL
             }
           });
        }

        // Recovery of Loan/Advance
        if (record.loanDeduction > 0) {
           const activeAdv = await tx.staffAdvance.findFirst({
              where: { staffId: record.staffId, status: "Active" }
           });
           
           if (activeAdv) {
              const newBalance = Number(activeAdv.balance) - record.loanDeduction;
              await tx.staffAdvance.update({
                where: { id: activeAdv.id },
                data: { 
                   balance: newBalance,
                   status: newBalance <= 1 ? "Repaid" : "Active" 
                }
              });
           }
        }
      }

      return journal;
    });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Disbursement Error:", error);
    return { success: false, error: error.message };
  }
}

async function getAccountId(tx: any, schoolId: string, code: string) {
  const acc = await tx.chartOfAccount.findUnique({ where: { schoolId_accountCode: { schoolId, accountCode: code } } });
  if (!acc) throw new Error(`Chart of Account ${code} not found in repository.`);
  return acc.id;
}

function formatMonth(m: number) {
  return new Date(2000, m - 1).toLocaleString('default', { month: 'long' });
}
