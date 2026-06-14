const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    where: { firstName: { contains: "Sneha", mode: "insensitive" } },
    select: { id: true, firstName: true, lastName: true, registrationId: true, status: true, studentCode: true, admissionNumber: true }
  });
  console.log("Students matching Sneha:");
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
