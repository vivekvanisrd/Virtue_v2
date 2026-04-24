import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const pavan = await prisma.staff.findFirst({
    where: { 
      firstName: { contains: 'Pavan' },
      lastName: { contains: 'Kumar' }
    },
    include: { school: true, branch: true }
  });

  if (!pavan) {
    console.log('Pavan not found');
    return;
  }

  console.log('--- Pavan Kumar Record ---');
  console.log(`ID: ${pavan.id}`);
  console.log(`Email: ${pavan.email}`);
  console.log(`Role: ${pavan.role}`);
  console.log(`School: ${pavan.school?.name} (ID: ${pavan.schoolId})`);
  console.log(`Branch: ${pavan.branch?.name} (ID: ${pavan.branchId})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
