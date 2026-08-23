import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.collection.findFirst({
    where: { branchId: "VIVES-RCB" }
  });
  console.log("Sample Collection Record in DB:");
  console.log("status =", JSON.stringify(sample?.status));
  console.log("isDeleted =", JSON.stringify(sample?.isDeleted));

  const distinctStatuses = await prisma.collection.groupBy({
    by: ['status'],
    where: { branchId: "VIVES-RCB" },
    _count: true
  });
  console.log("Distinct statuses in DB:", distinctStatuses);
}

main().catch(console.error).finally(() => prisma.$disconnect());
