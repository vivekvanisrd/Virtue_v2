const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { schoolId: "VIVES" },
      orderBy: { accountCode: "asc" }
    });
    console.log("ACCOUNTS_START");
    console.log(JSON.stringify(accounts.map(a => ({ id: a.id, code: a.accountCode, name: a.name, type: a.type })), null, 2));
    console.log("ACCOUNTS_END");
  } catch (error) {
    console.error("Error querying accounts:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
