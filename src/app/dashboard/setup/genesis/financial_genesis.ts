import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const SCHOOL_ID = "VIVES"; 
  const BRANCH_ID = "VIVES-MAIN"; // Reddy Colony Branch
  const FY_NAME = "FY 2026-27";

  console.log('🚀 [GENESIS] Initializing Unified Financial Backbone...');

  // 1. Identify context
  const fy = await prisma.financialYear.findFirst({
    where: { schoolId: SCHOOL_ID, isCurrent: true }
  });
  if (!fy) throw new Error("Active Financial Year 2026-27 not found. Please ensure Academic Genesis is complete.");

  const branch = await prisma.branch.findFirst({ where: { schoolId: SCHOOL_ID } });
  const targetBranchId = branch?.id || BRANCH_ID;

  // 2. [PHASE 1] Provision Chart of Accounts (The Ledger)
  const coaData = [
    { code: '1110', name: 'Cash in Hand', type: 'ASSET' },
    { code: '1120', name: 'Main Bank Account', type: 'ASSET' },
    { code: '1200', name: 'Student Receivables', type: 'ASSET' },
    { code: '2100', name: 'Advance Fees', type: 'LIABILITY' },
    { code: '4100', name: 'Tuition Income', type: 'INCOME' },
    { code: '4200', name: 'Admission Income', type: 'INCOME' },
    { code: '4300', name: 'Transport Income', type: 'INCOME' },
    { code: '5100', name: 'Staff Salaries', type: 'EXPENSE' },
    { code: '5200', name: 'Maintenance & Utility', type: 'EXPENSE' }
  ];

  console.log('--- Seeding Chart of Accounts ---');
  for (const item of coaData) {
    await prisma.chartOfAccount.upsert({
      where: { schoolId_accountCode: { schoolId: SCHOOL_ID, accountCode: item.code } },
      update: { accountName: item.name, accountType: item.type },
      create: {
        schoolId: SCHOOL_ID,
        branchId: targetBranchId,
        accountCode: item.code,
        accountName: item.name,
        accountType: item.type,
        currentBalance: 0
      }
    });
    console.log(`✅ [COA] ${item.code} - ${item.name} provisioned.`);
  }

  // 3. [PHASE 2] Seed Fee Component Master
  const feeMasters = [
    { name: 'Tuition Fee', type: 'CORE', isOneTime: false, accountCode: '4100' },
    { name: 'Admission Fee', type: 'CORE', isOneTime: true, accountCode: '4200' },
    { name: 'Transport Fee', type: 'ANCILLARY', isOneTime: false, accountCode: '4300' },
    { name: 'Activity & Lab Fee', type: 'ANCILLARY', isOneTime: false, accountCode: '4100' }
  ];

  console.log('--- Seeding Fee Component Master ---');
  for (const fm of feeMasters) {
    await prisma.feeComponentMaster.upsert({
      where: { schoolId_branchId_name: { schoolId: SCHOOL_ID, branchId: targetBranchId, name: fm.name } },
      update: { type: fm.type, isOneTime: fm.isOneTime, accountCode: fm.accountCode },
      create: {
        schoolId: SCHOOL_ID,
        branchId: targetBranchId,
        name: fm.name,
        type: fm.type,
        isOneTime: fm.isOneTime,
        accountCode: fm.accountCode
      }
    });
    console.log(`✅ [FEE_MASTER] ${fm.name} registered.`);
  }

  // 4. [PHASE 3] Create Master Fee Templates (Primary & Secondary)
  // We need to fetch the IDs from the masters we just created
  const masters = await prisma.feeComponentMaster.findMany({ where: { schoolId: SCHOOL_ID } });
  const tuition = masters.find(m => m.name === 'Tuition Fee');
  const admission = masters.find(m => m.name === 'Admission Fee');
  const activity = masters.find(m => m.name === 'Activity & Lab Fee');

  console.log('--- Creating Standard Fee Templates ---');
  const academicYears = await prisma.academicYear.findMany({ where: { schoolId: SCHOOL_ID } });
  const ay = academicYears.find(y => y.isCurrent) || academicYears[0];

  const templates = [
    { name: 'Standard Primary (Gr 1-5)', total: 35000, components: [
      { id: tuition?.id, amt: 25000, type: 'TERM' },
      { id: admission?.id, amt: 5000, type: 'ONE_TIME' },
      { id: activity?.id, amt: 5000, type: 'TERM' }
    ]},
    { name: 'Standard Secondary (Gr 6-10)', total: 45000, components: [
      { id: tuition?.id, amt: 35000, type: 'TERM' },
      { id: admission?.id, amt: 5000, type: 'ONE_TIME' },
      { id: activity?.id, amt: 5000, type: 'TERM' }
    ]}
  ];

  for (const t of templates) {
    if (t.components.some(c => !c.id)) continue;

    const structure = await prisma.feeStructure.create({
      data: {
        schoolId: SCHOOL_ID,
        branchId: targetBranchId,
        name: t.name,
        academicYearId: ay.id,
        totalAmount: t.total,
        components: {
          create: t.components.map(c => ({
            schoolId: SCHOOL_ID,
            branchId: targetBranchId,
            componentId: c.id!,
            amount: c.amt,
            scheduleType: c.type
          }))
        }
      }
    });
    console.log(`✅ [TEMPLATE] ${t.name} created. Total: ₹${t.total}`);
  }

  console.log('🏁 [GENESIS_COMPLETE] Financial Backbone is now ACTIVE and CONSOLIDATED.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
