import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING TENANCY COUNTERS FOR VIVES / VIVES-RCB ===");

  const counters = await prisma.tenancyCounter.findMany({
    where: { schoolId: "VIVES", branchId: "VIVES-RCB" }
  });

  console.log(`Found ${counters.length} active counters:`);
  for (const c of counters) {
    console.log(`- Type: [${c.type.padEnd(20)}] Year: [${c.year.padEnd(8)}] LastValue: ${c.lastValue}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
