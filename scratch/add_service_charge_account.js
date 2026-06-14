const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const schoolId = "VIVES";
    const branchId = "VIVES-MAIN";
    
    // Check if account 4500 exists
    const existing = await prisma.chartOfAccount.findUnique({
      where: { schoolId_accountCode: { schoolId, accountCode: "4500" } }
    });
    
    if (existing) {
      console.log("Account 4500 already exists:", existing);
    } else {
      const created = await prisma.chartOfAccount.create({
        data: {
          schoolId,
          branchId: null,
          accountCode: "4500",
          accountName: "Service Charges & Gateway Fees",
          accountType: "INCOME",
          currentBalance: 0
        }
      });
      console.log("Created Account 4500:", created);
    }
  } catch (error) {
    console.error("Error creating account 4500:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
