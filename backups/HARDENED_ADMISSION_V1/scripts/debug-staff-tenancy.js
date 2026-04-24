const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    where: {
      OR: [
        { firstName: { contains: 'virtuetest', mode: 'insensitive' } },
        { firstName: { contains: 'Vibhushree', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      schoolId: true,
      branchId: true,
      role: true
    }
  });

  console.log('--- Staff Records ---');
  console.table(staff);

  if (staff.length > 0) {
    const schoolIds = [...new Set(staff.map(s => s.schoolId))];
    const branches = await prisma.branch.findMany({
      where: { schoolId: { in: schoolIds } }
    });
    console.log('\n--- Branches in these Schools ---');
    console.table(branches);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
