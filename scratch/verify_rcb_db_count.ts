import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rcbBranch = await prisma.branch.findFirst({
    where: { code: "RCB" }
  });

  const allRcbStudents = await prisma.student.findMany({
    where: { branchId: rcbBranch?.id },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      createdAt: true
    }
  });

  console.log(`Total DB Students for VIVES-RCB: ${allRcbStudents.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
