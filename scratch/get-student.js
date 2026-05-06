const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findFirst({
    where: { status: 'Active' },
    select: { id: true, firstName: true, lastName: true }
  });
  console.log(JSON.stringify(student, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
