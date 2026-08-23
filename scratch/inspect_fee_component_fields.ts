import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.studentFeeComponent.findFirst();
  console.log("StudentFeeComponent Sample:", sample);

  const sampleDiscount = await prisma.discount.findFirst();
  console.log("Discount Sample:", sampleDiscount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
