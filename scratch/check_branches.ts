import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    select: { id: true, name: true, code: true }
  });
  console.log("Branches in DB:", branches);

  const studentsByBranch = await prisma.student.groupBy({
    by: ['branchId'],
    _count: { id: true }
  });
  console.log("Students by Branch:", studentsByBranch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
