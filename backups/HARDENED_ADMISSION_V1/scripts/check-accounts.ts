import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { schoolId: "VIVES" },
      select: { id: true, accountName: true, accountCode: true },
      take: 100
    });
    console.log(JSON.stringify(accounts, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
