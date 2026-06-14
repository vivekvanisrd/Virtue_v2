const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { status: { in: ["Provisional", "PROVISIONAL", "provisional"] } },
    select: { id: true, firstName: true, lastName: true, registrationId: true, status: true, studentCode: true, admissionNumber: true }
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
