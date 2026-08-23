import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.collection.count({
    where: { branchId: "VIVES-RCB" }
  });
  console.log(`Current Collection Count for VIVES-RCB in DB: ${count}`);

  const ledgersCount = await prisma.ledgerEntry.count({
    where: { branchId: "VIVES-RCB" }
  });
  console.log(`Current LedgerEntry Count for VIVES-RCB in DB: ${ledgersCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
