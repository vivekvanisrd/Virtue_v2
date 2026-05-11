const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    take: 10,
    select: { firstName: true, staffCode: true, status: true }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
