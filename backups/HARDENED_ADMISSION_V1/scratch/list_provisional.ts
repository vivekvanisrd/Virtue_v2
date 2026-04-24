import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function list() {
  const students = await prisma.student.findMany({
    where: { status: "Provisional" },
    select: { id: true, firstName: true, lastName: true, registrationId: true }
  });
  console.log(JSON.stringify(students, null, 2));
}

list().catch(console.error).finally(() => prisma.$disconnect());
