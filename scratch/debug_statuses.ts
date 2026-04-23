import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debug() {
  const statuses = await prisma.student.groupBy({
    by: ['status'],
    _count: { _all: true }
  });
  console.log("Unique Statuses:", JSON.stringify(statuses, null, 2));

  const priya = await prisma.student.findFirst({
    where: { firstName: { contains: "Priya", mode: 'insensitive' } }
  });
  console.log("Priya's full record:", JSON.stringify(priya, null, 2));
}

debug().catch(console.error).finally(() => prisma.$disconnect());
