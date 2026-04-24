"use server";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * SOVEREIGN FINANCIAL GENESIS BRIDGE
 * Safely triggers the institutional foundation from the UI.
 * Hardened with Idempotency - WILL NOT damage existing data.
 */
export async function initializeInstitutionAction() {
  const SCHOOL_ID = "VIVES"; 
  const BRANCH_ID = "VIVES-MAIN"; 

  try {
    console.log('🛡️ [SAFETY_CHECK] Verifying Financial Integrity...');

    // 1. Forensic Check: Detect existing data
    const coaCount = await prisma.chartOfAccount.count({ where: { schoolId: SCHOOL_ID } });
    const masterCount = await prisma.feeComponentMaster.count({ where: { schoolId: SCHOOL_ID } });

    // 2. Perform Intelligent Seeding (COA)
    const coaData = [
      { code: '1110', name: 'Cash in Hand', type: 'ASSET' },
      { code: '1120', name: 'Main Bank Account', type: 'ASSET' },
      { code: '1200', name: 'Student Receivables', type: 'ASSET' },
      { code: '2100', name: 'Advance Fees', type: 'LIABILITY' },
      { code: '4100', name: 'Tuition Income', type: 'INCOME' },
      { code: '4200', name: 'Admission Income', type: 'INCOME' },
      { code: '4300', name: 'Transport Income', type: 'INCOME' }
    ];

    for (const item of coaData) {
      await prisma.chartOfAccount.upsert({
        where: { schoolId_accountCode: { schoolId: SCHOOL_ID, accountCode: item.code } },
        update: {}, // DO NOT CHANGE EXISTING DATA
        create: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          accountCode: item.code,
          accountName: item.name,
          accountType: item.type,
          currentBalance: 0
        }
      });
    }

    // 3. Perform Intelligent Seeding (Fee Components)
    const feeMasters = [
      { name: 'Tuition Fee', type: 'CORE', isOneTime: false, accountCode: '4100' },
      { name: 'Admission Fee', type: 'CORE', isOneTime: true, accountCode: '4200' },
      { name: 'Transport Fee', type: 'ANCILLARY', isOneTime: false, accountCode: '4300' }
    ];

    for (const fm of feeMasters) {
      await prisma.feeComponentMaster.upsert({
        where: { schoolId_branchId_name: { schoolId: SCHOOL_ID, branchId: BRANCH_ID, name: fm.name } },
        update: {}, // DO NOT CHANGE EXISTING DATA
        create: {
          schoolId: SCHOOL_ID,
          branchId: BRANCH_ID,
          name: fm.name,
          type: fm.type,
          isOneTime: fm.isOneTime,
          accountCode: fm.accountCode
        }
      });
    }

    return { success: true, coaFound: coaCount, mastersFound: masterCount };
  } catch (error: any) {
    console.error("GENESIS_FAILED:", error);
    return { success: false, error: error.message };
  }
}
