const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.student.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log("Status distribution:", counts);

  const regIds = await prisma.student.findMany({
    where: { registrationId: { not: null } },
    select: { id: true, firstName: true, lastName: true, registrationId: true, status: true }
  });
  console.log(`Students with registrationId: ${regIds.length}`);
  for (const s of regIds.slice(0, 15)) {
    console.log(`Name: ${s.firstName} ${s.lastName} | Reg: ${s.registrationId} | Status: ${s.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
