const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const receipts = await prisma.journalEntry.findMany({
      where: { entryType: 'RECEIPT' },
      include: {
        lines: { include: { account: true } }
      },
      orderBy: { entryDate: 'asc' }
    });

    for (const je of receipts) {
      console.log(`JE ID: ${je.id} | Date: ${je.entryDate.toDateString()} | Desc: ${je.description} | Total Debit: ${je.totalDebit}`);
      for (const line of je.lines) {
        console.log(`  Line ID: ${line.id}`);
        console.log(`    Account: ${line.account.accountName} (${line.account.accountCode})`);
        console.log(`    Debit: ${line.debit} | Credit: ${line.credit}`);
        console.log(`    Line Desc: ${line.description}`);
      }
      console.log("---------------------------------------------------\n");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
