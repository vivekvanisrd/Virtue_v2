import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const student = await prisma.student.findUnique({
    where: { id: "3c745abc-126e-43bb-bf65-7b97548bd83b" },
    include: {
      financial: true,
      collections: { where: { status: "Success" } }
    }
  });
  console.log(JSON.stringify(student, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
