const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = [
    'student', 'staff', 'academicYear', 'financialYear', 'class', 'section',
    'financialRecord', 'studentFeeComponent', 'collection', 'ledgerEntry',
    'journalEntry', 'chartOfAccount', 'discount', 'discountType', 'feeStructure',
    'feeComponentMaster', 'feeTemplateComponent', 'academicHistory', 'activityLog'
  ];

  console.log('--- TABLE RECORD COUNTS ---');
  for (const m of models) {
    try {
      const count = await prisma[m].count();
      console.log(`${m}: ${count}`);
    } catch (e) {
      console.log(`${m}: Error: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
