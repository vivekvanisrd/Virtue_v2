const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    select: { email: true, role: true, schoolId: true }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
