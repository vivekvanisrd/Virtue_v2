import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    include: {
      school: true,
      branch: true
    }
  });

  console.log('--- Staff Records ---');
  staff.forEach(s => {
    console.log(`Name: ${s.firstName} ${s.lastName} (ID: ${s.id})`);
    console.log(`  - Staff Code: ${s.staffCode}`);
    console.log(`  - Role: ${s.role}`);
    console.log(`  - School: ${s.school?.name} (ID: ${s.schoolId})`);
    console.log(`  - Branch: ${s.branch?.name} (ID: ${s.branchId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
