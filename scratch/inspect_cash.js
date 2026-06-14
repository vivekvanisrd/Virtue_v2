const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== CHART OF ACCOUNTS ===");
    const accounts = await prisma.chartOfAccount.findMany();
    for (const acc of accounts) {
      console.log(`Code: ${acc.accountCode} | Name: ${acc.accountName} | Balance: ${acc.currentBalance} | Type: ${acc.accountType}`);
    }

    console.log("\n=== COLLECTIONS BY PAYMENT MODE ===");
    const paymentModes = await prisma.collection.groupBy({
      by: ['paymentMode'],
      _count: { id: true },
      _sum: { totalPaid: true, amountPaid: true }
    });
    for (const mode of paymentModes) {
      console.log(`Mode: ${mode.paymentMode} | Count: ${mode._count.id} | Sum totalPaid: ${mode._sum.totalPaid} | Sum amountPaid: ${mode._sum.amountPaid}`);
    }

    console.log("\n=== CASH COLLECTIONS DETAILS (FIRST 10) ===");
    const cashCols = await prisma.collection.findMany({
      where: {
        paymentMode: {
          equals: 'Cash',
          mode: 'insensitive'
        }
      },
      take: 10,
      include: {
        journalEntry: {
          include: {
            lines: {
              include: {
                account: true
              }
            }
          }
        }
      }
    });

    for (const col of cashCols) {
      console.log(`\nCollection Receipt: ${col.receiptNumber} | Amount: ${col.totalPaid} | Date: ${col.paymentDate} | Status: ${col.status} | Deleted: ${col.isDeleted}`);
      if (col.journalEntry) {
        console.log(`  Journal Entry: ${col.journalEntry.id} | Type: ${col.journalEntry.entryType}`);
        for (const line of col.journalEntry.lines) {
          console.log(`    Line - Account: ${line.account.accountName} (${line.account.accountCode}) | Debit: ${line.debit} | Credit: ${line.credit}`);
        }
      } else {
        console.log(`  NO JOURNAL ENTRY ASSIGNED (journalEntryId: ${col.journalEntryId})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
