const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== ALL JOURNAL ENTRIES ===");
    const jes = await prisma.journalEntry.findMany({
      include: {
        lines: {
          include: {
            account: true
          }
        }
      }
    });

    for (const je of jes) {
      console.log(`\nJE ID: ${je.id} | Code: ${je.entryCode} | Type: ${je.entryType} | Date: ${je.entryDate} | Desc: ${je.description} | Debit: ${je.totalDebit} | Credit: ${je.totalCredit}`);
      for (const line of je.lines) {
        console.log(`  Line - Account: ${line.account.accountName} (${line.account.accountCode}) | Debit: ${line.debit} | Credit: ${line.credit} | Desc: ${line.description}`);
      }
    }

    console.log("\n=== ALL LEDGER ENTRIES ===");
    const les = await prisma.ledgerEntry.findMany({
      include: {
        student: true
      }
    });
    for (const le of les) {
      console.log(`LE ID: ${le.id} | Student: ${le.student.firstName} ${le.student.lastName} | Amount: ${le.amount} | Type: ${le.type} | Reason: ${le.reason} | Created: ${le.createdAt}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
