import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const student = await prisma.student.findUnique({
    where: { id: "3c745abc-126e-43bb-bf65-7b975ec19895" },
    include: {
      academic: true,
      financial: { include: { components: true } },
      collections: { where: { status: "Success" } },
      history: true
    }
  });
  console.log(JSON.stringify(student, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
