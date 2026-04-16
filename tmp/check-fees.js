const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fees = await prisma.feeStructure.findMany({
    select: { name: true, classId: true, schoolId: true }
  });
  console.log(JSON.stringify(fees, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
