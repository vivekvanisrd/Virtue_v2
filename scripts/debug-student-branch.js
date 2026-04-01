const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.academicRecord.findMany({
    where: { schoolId: 'VIVA' },
    select: {
      studentId: true,
      branchId: true,
      student: { select: { firstName: true, lastName: true } }
    }
  });

  console.log('--- Student Branch Mapping ---');
  console.table(records.map(r => ({
    name: `${r.student.firstName} ${r.student.lastName}`,
    branchId: r.branchId
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
