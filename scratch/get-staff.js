const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findFirst({
    where: { status: 'Active' },
    select: { id: true, email: true, schoolId: true, branchId: true, role: true }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
