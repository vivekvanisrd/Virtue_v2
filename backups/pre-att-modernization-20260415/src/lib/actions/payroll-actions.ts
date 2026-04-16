"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { getTenancyFilters } from "../utils/tenancy";
import crypto from "crypto";
import { PayrollEngine } from "../services/payroll-engine";
import { getMonthlyStaffAttendanceSummary } from "./attendance-actions";

interface SalarySnapshot {
  basicSalary: number;
  hraAmount: number;
  daAmount: number;
  specialAllowance: number;
  transportAllowance: number;
  isPFEnabled: boolean;
  isESIEnabled: boolean;
  isPTEnabled: boolean;
  department: string;
  designation: string;
}

type PrismaTransaction = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * PHASE 1: GENERATE DRAFT
 * -----------------------
 * Generates the official `PayrollRun` Draft and maps all `StaffProfessional` components into a frozen JSON snapshot.
 */
export async function generatePayrollDraftAction(month: number, year: number, totalWorkingDays: number, branchId: string, skipStatutory: boolean = false) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const schoolId = context.schoolId;

    // 1. Check for Existing Run
    const existingRun = await prisma.payrollRun.findUnique({
      where: { schoolId_month_year: { schoolId, month, year } }
    });
    if (existingRun) {
      const slips = await prisma.salarySlip.findMany({
          where: { payrollRunId: existingRun.id },
          include: { staff: true }
      });

      const serializedExisting = {
        ...existingRun,
        totalGross: Number(existingRun.totalGross || 0),
        totalNet: Number(existingRun.totalNet || 0),
        slips: slips.map((s: any) => ({
            ...s,
            baseAmount: Number(s.baseAmount || 0),
            arrears: Number(s.arrears || 0),
            grossSalary: Number(s.grossSalary || 0),
            netSalary: Number(s.netSalary || 0),
        }))
      };
      return { success: true, data: serializedExisting, message: "Draft resumed." };
    }

    const tenancy = getTenancyFilters(context);
    const targetBranch = branchId && branchId !== "GLOBAL" ? branchId : branchId;

    // 2. Fetch Attendance Summary for current branch
    const attendanceResult = await getMonthlyStaffAttendanceSummary(month, year, targetBranch);
    const attendanceSummary = attendanceResult.summary || {};

    // 3. Fetch Active Staff targeted for this branch/school
    const staffMembers = await prisma.staff.findMany({
      where: { 
        ...tenancy, 
        branchId: targetBranch,
        status: "Active" 
      },
      include: { 
        professional: true,
        advances: {
          where: { status: "Active", balance: { gt: 0 } }
        }
      }
    });

    if (staffMembers.length === 0) throw new Error("No active staff found to generate payroll.");

    // 4. Initiate Transaction
    const payrollRun = await prisma.$transaction(async (tx: PrismaTransaction) => {
      const run = await tx.payrollRun.create({
        data: {
          schoolId,
          branchId: targetBranch,
          month,
          year,
          status: "Draft",
          totalGross: 0,
          totalNet: 0,
          processedBy: context.staffId || "System",
          processedAt: new Date()
        }
      });

      const slips = staffMembers.map((staff: any) => {
        const prof = staff.professional;
        const staffAtt = attendanceSummary[staff.id] || { present: totalWorkingDays, absent: 0, lwp: 0 };
        
        // --- 1. MID-MONTH PRORATION ENGINE ---
        let dynamicWorkingDays = totalWorkingDays;
        
        if (prof?.dateOfJoining) {
          const joinDate = new Date(prof.dateOfJoining);
          if (joinDate.getFullYear() === year && joinDate.getMonth() + 1 === month) {
            const daysInMonth = new Date(year, month, 0).getDate();
            dynamicWorkingDays = daysInMonth - joinDate.getDate() + 1;
            dynamicWorkingDays = Math.min(dynamicWorkingDays, totalWorkingDays); 
          }
        }

        const breakdown = PayrollEngine.calculateStaffRemuneration(prof || {}, {
            skipStatutory,
            lwpDays: staffAtt.lwp,
            totalDays: totalWorkingDays
        });

        const snapshot: any = {
          ...breakdown,
          isPFEnabled: prof?.isPFEnabled || false,
          isESIEnabled: prof?.isESIEnabled || false,
          isPTEnabled: prof?.isPTEnabled || false,
          department: prof?.department || "Unassigned",
          designation: prof?.designation || "Unassigned",
        };

        const gross = breakdown.grossRemuneration;
        const net = breakdown.netSalary;
        let autoAdvanceRecovery = 0;
        if (staff.advances && staff.advances.length > 0) {
           const activeLoan = staff.advances[0];
           autoAdvanceRecovery = Math.min(Number(activeLoan.installment), Number(activeLoan.balance));
        }

        return {
          payrollRunId: run.id,
          staffId: staff.id,
          totalWorkingDays: totalWorkingDays, 
          attendedDays: staffAtt.present,
          paidLeaves: staffAtt.present - (dynamicWorkingDays - staffAtt.lwp), // Simplified
          lwpDays: staffAtt.lwp,
          payableDays: Math.max(0, totalWorkingDays - staffAtt.lwp),
          baseAmount: breakdown.basic,
          snapshot: snapshot,
          grossSalary: gross,
          netSalary: net - autoAdvanceRecovery,
          deductions: { ...breakdown.deductions, advanceRecovery: autoAdvanceRecovery },
          status: "Draft",
          branchId: staff.branchId
        };
      });

      await tx.salarySlip.createMany({ data: slips });

      // Aggregate Totals
      const totalGross = slips.reduce((sum, s) => sum + Number(s.grossSalary), 0);
      const totalNet = slips.reduce((sum, s) => sum + Number(s.netSalary), 0);

      const finalRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: { totalGross, totalNet }
      });

      return finalRun;
    });

    const slips = await prisma.salarySlip.findMany({
        where: { payrollRunId: payrollRun.id },
        include: { staff: true }
    });

    const serializedRun = {
      ...payrollRun,
      totalGross: Number(payrollRun.totalGross || 0),
      totalNet: Number(payrollRun.totalNet || 0),
      slips: slips.map((s: any) => ({
        ...s,
        baseAmount: Number(s.baseAmount || 0),
        arrears: Number(s.arrears || 0),
        grossSalary: Number(s.grossSalary || 0),
        netSalary: Number(s.netSalary || 0),
      }))
    };

    revalidatePath("/dashboard/salaries");
    return { success: true, data: serializedRun, message: `Draft generated for ${staffMembers.length} staff.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 1.5: SYNC MISSING STAFF
 * ----------------------------
 * Incremental sync for new staff members added after the payroll was first generated.
 */
export async function syncPayrollStaffAction(runId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const run = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { slips: { select: { staffId: true } } }
    });

    if (!run) throw new Error("Payroll run not found.");
    if (run.status !== "Draft") throw new Error("Staff sync is only allowed in Draft mode.");

    const existingStaffIds = new Set(run.slips.map((s: any) => s.staffId));
    
    // Fetch all active staff for this school/branch
    const tenancy = getTenancyFilters(context);
    const staffMembers = await prisma.staff.findMany({
      where: { 
        ...tenancy, 
        ...(run.branchId ? { branchId: run.branchId } : {}),
        status: "Active",
        id: { notIn: Array.from(existingStaffIds) } 
      },
      include: { 
        professional: true,
        advances: {
          where: { status: "Active", balance: { gt: 0 } }
        }
      }
    });

    if (staffMembers.length === 0) {
      return { success: true, message: "Sheet already synced with current staff list." };
    }

    // Generate slips for NEW staff only
    const newSlips = staffMembers.map((staff: any) => {
      const prof = staff.professional;
      const breakdown = PayrollEngine.calculateStaffRemuneration(prof || {});
      const totalWorkingDays = 30; // Standard month default
      
      const snapshot: any = {
        ...breakdown,
        isPFEnabled: prof?.isPFEnabled || false,
        isESIEnabled: prof?.isESIEnabled || false,
        isPTEnabled: prof?.isPTEnabled || false,
        department: (staff as any).department || "Unassigned",
        designation: (staff as any).designation || "Unassigned",
      };

      return {
        payrollRunId: run.id,
        staffId: staff.id,
        totalWorkingDays: totalWorkingDays,
        attendedDays: totalWorkingDays,
        baseAmount: breakdown.basic,
        snapshot: snapshot,
        grossSalary: breakdown.grossRemuneration,
        netSalary: breakdown.grossRemuneration,
        status: "Draft",
        branchId: staff.branchId
      };
    });

    await prisma.salarySlip.createMany({ data: newSlips });

    revalidatePath("/dashboard/salaries");
    return { success: true, count: newSlips.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function savePayrollDraftAction(payrollRunId: string, slipsUpdates: any[]) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    let totalGross = 0;
    let totalNet = 0;

    await prisma.$transaction(async (tx: PrismaTransaction) => {
      for (const slip of slipsUpdates) {
        // Strip out NaN/Nulls
        const safeGross = Number(slip.grossSalary) || 0;
        const safeNet = Number(slip.netSalary) || 0;

        totalGross += safeGross;
        totalNet += safeNet;

        await tx.salarySlip.update({
          where: { id: slip.id },
          data: {
            attendedDays: Number(slip.attendedDays) || 0,
            payableDays: Number(slip.payableDays) || 0,
            lwpDays: Number(slip.lwpDays) || 0,
            grossSalary: safeGross,
            netSalary: safeNet,
            deductions: slip.deductions
          }
        });
      }

      await tx.payrollRun.update({
        where: { id: payrollRunId },
        data: {
          totalGross,
          totalNet
        }
      });
    }, { timeout: 30000 });

    return { success: true, message: `Draft saved securely. Total Extracted Net: ${totalNet}` };
  } catch (error: any) {
    console.error("Save Draft Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * PHASE 3: LOCK AND DISBURSE (Ledger Integration)
 * -----------------------------------------------
 * Disburses salaries, seals cryptographic hash, and records financial journal entries.
 */
export async function finalizePayrollAction(payrollRunId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const fy = await prisma.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } });
    if (!fy) throw new Error("Active Financial Year not found.");

    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { slips: true }
    });

    if (!run) throw new Error("Payroll Run not found.");
    if (run.status !== "Draft" && run.status !== "Reviewed") throw new Error(`Run is already ${run.status}`);

    const entryCode = `SLRY-${run.month}-${run.year}-${Math.floor(Math.random() * 1000)}`;

    const result = await prisma.$transaction(async (tx: PrismaTransaction) => {
      // 1. Calculate Ledger Hash across all slips to freeze it & Seal Slips
      for (const slip of run.slips) {
        const hashSeed = `${slip.staffId}-${slip.netSalary}-${run.month}-${run.year}-${context.schoolId}`;
        const hash = crypto.createHash('sha256').update(hashSeed).digest('hex');

        await tx.salarySlip.update({
          where: { id: slip.id },
          data: { 
            status: "Approved",
            hash: hash 
          }
        });
      }
      
      // Update the main run to APPROVED/PAID
      await tx.payrollRun.update({
        where: { id: run.id },
        data: { 
            status: "Approved", 
            approvedBy: context.staffId || "System", 
            approvedAt: new Date(),
        }
      });

      // 2. Create Journal Entry automatically syncing to Accounting Core
      const journal = await tx.journalEntry.create({
        data: {
          entryCode,
          financialYearId: fy.id,
          schoolId: context.schoolId,
          entryType: "PAYROLL",
          description: `Staff Salaries Disbursement for ${run.month}/${run.year}`,
          totalDebit: run.totalNet,
          totalCredit: run.totalNet,
          lines: {
            create: [
              { accountId: await getAccountId(tx, context.schoolId, "4110"), debit: run.totalNet, credit: 0, description: "Salaries Expense" },
              { accountId: await getAccountId(tx, context.schoolId, "1110"), debit: 0, credit: run.totalNet, description: "Salaries Payout" }
            ]
          }
        }
      });

      // 3. Update Chart of Account Balances
      await tx.chartOfAccount.update({
        where: { schoolId_accountCode: { schoolId: context.schoolId, accountCode: "4110" } },
        data: { currentBalance: { increment: run.totalNet } }
      });
      await tx.chartOfAccount.update({
        where: { schoolId_accountCode: { schoolId: context.schoolId, accountCode: "1110" } },
        data: { currentBalance: { decrement: run.totalNet } }
      });

      return {
        ...journal,
        totalDebit: Number(journal.totalDebit),
        totalCredit: Number(journal.totalCredit)
      };
    }, { timeout: 30000 });

    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Disbursement Error:", error);
    return { success: false, error: error.message };
  }
}

async function getAccountId(tx: PrismaTransaction, schoolId: string, code: string) {
  const acc = await tx.chartOfAccount.findUnique({ where: { schoolId_accountCode: { schoolId, accountCode: code } } });
  if (!acc) throw new Error(`Chart of Account ${code} not found in repository.`);
  return acc.id;
}

/**
 * PHASE 4: CORPORATE BANK EXPORT MAPPER
 * -----------------------------------------------
 * Constructs the standardized CSV template payload natively tailored for Axis BANK
 * bulk payroll processing arrays.
 */
export async function exportBankCSVAction(payrollRunId: string, format: "GENERIC" | "AXIS_INTERNAL" | "AXIS_EXTERNAL" = "GENERIC", selectedIds?: string[]) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const run = await prisma.payrollRun.findUnique({
      where: { id: payrollRunId },
      include: { 
        branch: true,
        slips: {
          where: selectedIds ? { id: { in: selectedIds } } : undefined,
          include: {
            staff: {
              include: {
                bank: true
              }
            }
          }
        }
      }
    });

    if (!run) throw new Error("Payroll Run not found.");
    if (run.status !== "Approved" && run.status !== "Paid") {
        throw new Error(`Bank CSV can only be generated for finalized sheets. Please confirm and lock first.`);
    }

    const schoolDebitAccount = "915010023357136"; 
    let csvData = "";
    
    // Reference Prefix: VS-MAIN-03-2026-
    const branchCode = run.branch?.code || "MAIN";
    const mm = run.month.toString().padStart(2, "0");
    const yyyy = run.year.toString();
    const refPrefix = `VS-${branchCode}-${mm}-${yyyy}-`.toUpperCase();

    if (format === "AXIS_INTERNAL") {
       // --- AXIS INTERNAL (Within Axis) ---
       // Header: exactly 8 quoted columns + 2 empty
       const header = `"Debit Account Number  \n(Mandatory)","Transaction Amount\n(Mandatory)","Transaction Currency\n(Non-Mandatory)","Beneficiary Account Number\n(Mandatory)","Transaction Date\n(Mandatory)","Customer Reference Number\n(Mandatory)","Beneficiary Code\n(Non-Mandatory)","Beneficiary Name\n(Mandatory)",,\n`;
       csvData = header;
       
       const mm = run.month.toString().padStart(2, "0");
       const yyyy = run.year.toString();
       const refPrefix = `vs${mm}${yyyy}`; // Matching source: vs042006 (MMYYYY)

       let seq = 1;
       for (const slip of run.slips) {
         if (slip.netSalary <= 0) continue;
         const bank = slip.staff?.bank;
         if (!bank || !bank.accountNumber || !bank.ifscCode) continue;
         
         if (!bank.ifscCode.toUpperCase().startsWith("UTIB")) continue;

         const now = new Date();
         const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear().toString().slice(-2)}`; // D/M/YY
         const ref = `${refPrefix}${seq.toString().padStart(3, "0")}`;
         const name = bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`;
         
         // 8 Columns: DebitNum, Amount, Currency(Empty), BenAcct, Date, Ref, Code(Empty), Name, ,
         csvData += `${schoolDebitAccount},${Math.round(Number(slip.netSalary))},,${bank.accountNumber},${dateStr},${ref},,${name},,\n`;
         seq++;
       }
    } 
    else if (format === "AXIS_EXTERNAL") {
       // --- AXIS EXTERNAL (NEFT/IMPS) ---
       // Extended Header (29 columns exactly as per full source)
       const header = `"Debit Account Number\n(Mandatory)","Transaction Amount\n(Mandatory)","Transaction Currency\n(Non-Mandatory)","Beneficiary Name\n(Mandatory)","Beneficiary Account Number\n(Mandatory)","Beneficiary IFSC Code\n(Mandatory)","Transaction Date\n(Mandatory)","Payment Mode\n(Mandatory)",Customer Reference Number(Mandatory),"Beneficiary Nickname/Code\n(Mandatory)","Bank Account Type\n(Non-Mandatory)","Debit Narration\n(Non-Mandatory)","Credit Narration\n(Non-Mandatory)","Beneficiary Address 1\n(Non-Mandatory)","Beneficiary Address 2\n(Non-Mandatory)","Beneficiary Address 3\n(Non-Mandatory)","Beneficiary City\n(Non-Mandatory)","Beneficiary State\n(Non-Mandatory)","Beneficiary Pin Code\n(Non-Mandatory)","Beneficiary Bank Name\n(Non-Mandatory)","Beneficiary Email address 1\n(Non-Mandatory)","Beneficiary Email address 2\n(Non-Mandatory)","Beneficiary Mobile Number\n(Non-Mandatory)","Add Info1\n(Non-Mandatory)","Add Info2\n(Non-Mandatory)","Add Info3\n(Non-Mandatory)","Add Info4\n(Non-Mandatory)","Add Info5\n(Non-Mandatory)","Add Info6\n(Non-Mandatory)"\n`;
       csvData = header;
       
       const mm = run.month.toString().padStart(2, "0");
       const yyyy = run.year.toString();
       const refPrefix = `VA${mm}${yyyy}`; // Matching source: VA042026

       let seq = 1;
       for (const slip of run.slips) {
         if (slip.netSalary <= 0) continue;
         const bank = slip.staff?.bank;
         if (!bank || !bank.accountNumber || !bank.ifscCode) continue;

         if (bank.ifscCode.toUpperCase().startsWith("UTIB")) continue;

         const now = new Date();
         const dateStr = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth()+1).toString().padStart(2, "0")}/${now.getFullYear()}`; // DD/MM/YYYY
         const ref = `${refPrefix}${seq.toString().padStart(3, "0")}`;
         const name = bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`;
          const nickname = (slip.staff.firstName + (slip.staff.lastName || "")).replace(/[^a-zA-Z0-9]/g, "").substring(0, 15);
         const mode = "IMPS";

         // Exactly 29 columns: 
         // 1:Debit, 2:Amount, 3:Currency, 4:BenName, 5:Acct, 6:IFSC, 7:Date, 8:Mode, 9:Ref, 10:Nickname
         // 11-29: Empty Placeholders
         csvData += `${schoolDebitAccount},${Math.round(Number(slip.netSalary))},,${name},${bank.accountNumber},${bank.ifscCode},${dateStr},${mode},${ref},${nickname},,,,,,,,,,,,,,,,,,,\n`;
         seq++;
       }
    }
    else {
       // GENERIC TEMPLATE
       csvData = "BeneficiaryAccount,IFSCCode,BeneficiaryName,CreditAmount,Remark,BeneficiaryEmail,BeneficiaryPhone\n";
       for (const slip of run.slips) {
         if (slip.netSalary <= 0) continue;
         const bank = slip.staff?.bank;
         if (!bank || !bank.accountNumber || !bank.ifscCode) continue;

         const acct = bank.accountNumber;
         const ifsc = bank.ifscCode;
         const name = bank.accountName || `${slip.staff.firstName} ${slip.staff.lastName}`;
         const amount = Math.round(Number(slip.netSalary)).toString();
         const desc = `SALARY_${run.month}_${run.year}`;
         const email = slip.staff.email || "";
         const phone = slip.staff.phone || "";

         csvData += `"${acct}","${ifsc}","${name}","${amount}","${desc}","${email}","${phone}"\n`;
       }
    }

    return { success: true, csvData };
  } catch (error: any) {
    console.error("CSV Export Bank Mapper Error:", error);
    return { success: false, error: error.message };
  }
}
