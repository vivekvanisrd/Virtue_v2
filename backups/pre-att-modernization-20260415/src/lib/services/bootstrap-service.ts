import prisma from "@/lib/prisma";

export const STANDARD_COA = [
  // ASSETS (1000s)
  { accountCode: "1110", accountName: "Cash in Hand", accountType: "Asset" },
  { accountCode: "1120", accountName: "Main Bank Account", accountType: "Asset" },
  { accountCode: "1210", accountName: "Fees Receivable", accountType: "Asset" },
  { accountCode: "1310", accountName: "Inventory (Stationery/Uniforms)", accountType: "Asset" },
  
  // LIABILITIES (2000s)
  { accountCode: "2110", accountName: "Salary Payable", accountType: "Liability" },
  { accountCode: "2210", accountName: "Caution Deposit (Refundable)", accountType: "Liability" },
  { accountCode: "2310", accountName: "Unearned Revenue", accountType: "Liability" },
  
  // INCOME (3000s)
  { accountCode: "3110", accountName: "Tuition Fees", accountType: "Income" },
  { accountCode: "3120", accountName: "Admission Fees", accountType: "Income" },
  { accountCode: "3130", accountName: "Transport Fees", accountType: "Income" },
  { accountCode: "3140", accountName: "Examination Fees", accountType: "Income" },
  { accountCode: "3210", accountName: "Miscellaneous Income", accountType: "Income" },
  
  // EXPENSE (4000s)
  { accountCode: "4110", accountName: "Staff Salaries", accountType: "Expense" },
  { accountCode: "4120", accountName: "Rent & Utilities", accountType: "Expense" },
  { accountCode: "4130", accountName: "Repairs & Maintenance", accountType: "Expense" },
  { accountCode: "4210", accountName: "School Events", accountType: "Expense" },
  { accountCode: "4310", accountName: "Marketing & Advertisements", accountType: "Expense" },
];

export class BootstrapService {
  /**
   * bootstrap
   * 
   * Ensures all mandatory administrative entities exist for a school.
   * Idempotent: Only creates missing records.
   */
  static async bootstrap(schoolId: string, branchId?: string) {
    console.log(`[BOOTSTRAP] Commencing professional initialization for School: ${schoolId}`);
    
    const results = {
      academicYear: false,
      financialYear: false,
      branch: false,
      coaCount: 0
    };

    // 1. Ensure Branch exists (Default to RCB01 if none provided)
    const bid = branchId || `BR-${schoolId}-01`;
    const branch = await prisma.branch.upsert({
      where: { schoolId_code: { schoolId, code: bid.split('-').pop() || "MAIN" } },
      update: {},
      create: {
        id: bid,
        schoolId,
        name: "Main Branch",
        code: bid.split('-').pop() || "MAIN"
      }
    });
    results.branch = !!branch;

    // 2. Ensure Academic Year (2026-27 Default)
    const ay = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
    if (!ay) {
      const newAY = await prisma.academicYear.create({
        data: {
          id: `AY-${schoolId}-2026-27`,
          schoolId,
          name: "2026-27",
          startDate: new Date("2026-06-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true
        }
      });
      console.log(`[BOOTSTRAP] Created Academic Year: ${newAY.name}`);
      results.academicYear = true;
    }

    // 3. Ensure Financial Year (2026-27 Default)
    const fy = await prisma.financialYear.findFirst({
      where: { schoolId, isCurrent: true }
    });
    if (!fy) {
      const newFY = await prisma.financialYear.create({
        data: {
          id: `FY-${schoolId}-2026-27`,
          schoolId,
          name: "FY 2026-27",
          startDate: new Date("2026-04-01"),
          endDate: new Date("2027-03-31"),
          isCurrent: true
        }
      });
      console.log(`[BOOTSTRAP] Created Financial Year: ${newFY.name}`);
      results.financialYear = true;
    }

    // 4. Ensure Chart of Accounts (COA)
    for (const item of STANDARD_COA) {
      const existing = await prisma.chartOfAccount.findUnique({
        where: { schoolId_accountCode: { schoolId, accountCode: item.accountCode } }
      });
      if (!existing) {
        await prisma.chartOfAccount.create({
          data: {
            schoolId,
            branchId: branch.id,
            accountCode: item.accountCode,
            accountName: item.accountName,
            accountType: item.accountType
          }
        });
        results.coaCount++;
      }
    }

    console.log(`[BOOTSTRAP] Synchronization complete. Added ${results.coaCount} accounts.`);
    return results;
  }
}
