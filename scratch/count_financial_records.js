const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const financialRecordsCount = await prisma.financialRecord.count();
    console.log("Total FinancialRecord entries in DB:", financialRecordsCount);

    const sample = await prisma.financialRecord.findFirst({
      include: {
        student: true,
        feeStructure: true,
        components: true
      }
    });
    console.log("Sample FinancialRecord:", JSON.stringify(sample, null, 2));

  } catch (error) {
    console.error("Failed to count financial records:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
