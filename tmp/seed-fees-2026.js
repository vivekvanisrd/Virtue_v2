const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SCHOOL_ID = 'VIVA';
const BRANCH_ID = 'VIVA-BR-01';
const ACADEMIC_YEAR_ID = 'VIVA-AY-2026';

const FEE_DATA = [
  { name: 'Nursery', fee: 26000, level: -2, code: 'NUR' },
  { name: 'LKG', fee: 28000, level: -1, code: 'LKG' },
  { name: 'UKG', fee: 30000, level: 0, code: 'UKG' },
  { name: 'Class 1', fee: 34000, level: 1, code: 'C1' },
  { name: 'Class 2', fee: 34000, level: 2, code: 'C2' },
  { name: 'Class 3', fee: 36000, level: 3, code: 'C3' },
  { name: 'Class 4', fee: 36000, level: 4, code: 'C4' },
  { name: 'Class 5', fee: 38000, level: 5, code: 'C5' },
  { name: 'Class 6', fee: 38000, level: 6, code: 'C6' },
  { name: 'Class 7', fee: 42000, level: 7, code: 'C7' },
  { name: 'Class 8', fee: 42000, level: 8, code: 'C8' },
  { name: 'Class 9', fee: 48000, level: 9, code: 'C9' },
  { name: 'Class 10', fee: 55000, level: 10, code: 'C10' }
];

async function main() {
  console.log('--- Initializing 2026-2027 Fee Engine ---');

  for (const item of FEE_DATA) {
    // 1. Ensure Class Exists
    const cls = await prisma.class.upsert({
      where: { id: item.code },
      update: { name: item.name, level: item.level },
      create: { 
        id: item.code, 
        name: item.name, 
        level: item.level 
      }
    });

    // 2. Create/Update Fee Structure for 2026-27
    const fee = await prisma.feeStructure.upsert({
      where: {
        schoolId_structureCode: {
          schoolId: SCHOOL_ID,
          structureCode: `FEE_2026_${item.code}`
        }
      },
      update: { 
        totalAmount: item.fee,
        name: `${item.name} 2026-27 Fee`,
        classId: cls.id,
        academicYearId: ACADEMIC_YEAR_ID
      },
      create: {
        schoolId: SCHOOL_ID,
        branchId: BRANCH_ID,
        structureCode: `FEE_2026_${item.code}`,
        name: `${item.name} 2026-27 Fee`,
        totalAmount: item.fee,
        classId: cls.id,
        academicYearId: ACADEMIC_YEAR_ID
      }
    });

    console.log(`✅ ${item.name}: Recorded ₹${item.fee} (Installments: ₹${item.fee*0.5}, ₹${item.fee*0.25}, ₹${item.fee*0.25})`);
  }

  console.log('--- Fee Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
