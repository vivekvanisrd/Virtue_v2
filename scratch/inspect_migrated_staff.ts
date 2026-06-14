import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    where: {
      OR: [
        { firstName: { contains: 'Swetha', mode: 'insensitive' } },
        { lastName: { contains: 'Swetha', mode: 'insensitive' } },
        { firstName: { contains: 'Vibhushree', mode: 'insensitive' } },
        { lastName: { contains: 'Vibhushree', mode: 'insensitive' } },
        { firstName: { contains: 'Jangampet', mode: 'insensitive' } },
        { firstName: { contains: 'Sambayagari', mode: 'insensitive' } }
      ]
    },
    include: {
      school: true,
      branch: true
    }
  });

  console.log('--- Inspected Staff ---');
  staff.forEach(s => {
    console.log(`Name: ${s.firstName} ${s.lastName}`);
    console.log(`  - ID: ${s.id}`);
    console.log(`  - Staff Code: ${s.staffCode}`);
    console.log(`  - Role: ${s.role}`);
    console.log(`  - School: ${s.school?.name} (${s.schoolId})`);
    console.log(`  - Branch: ${s.branch?.name} (${s.branchId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
