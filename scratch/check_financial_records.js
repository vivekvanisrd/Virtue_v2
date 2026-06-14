const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const countTotal = await prisma.financialRecord.count();
  const countWithComps = await prisma.financialRecord.count({
    where: {
      components: {
        some: {}
      }
    }
  });
  console.log('Total financial records:', countTotal);
  console.log('With components:', countWithComps);
  
  // Let's count students without components but with non-zero annualTuition
  const legacyOnly = await prisma.financialRecord.findMany({
    where: {
      components: {
        none: {}
      },
      OR: [
        { annualTuition: { gt: 0 } },
        { tuitionFee: { gt: 0 } }
      ]
    }
  });
  console.log('Legacy only financial records with tuition:', legacyOnly.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
