const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ledgers = await prisma.ledgerEntry.findMany();
  console.log('--- LEDGER ENTRIES ---');
  console.log(JSON.stringify(ledgers, null, 2));

  const journals = await prisma.journalEntry.findMany({
    include: {
      lines: {
        include: {
          account: true
        }
      }
    }
  });
  console.log('\n--- JOURNAL ENTRIES ---');
  journals.forEach((j, idx) => {
    console.log(`Journal ${idx + 1}: ${j.description} (Type: ${j.entryType}, Debit: ${j.totalDebit}, Credit: ${j.totalCredit})`);
    j.lines.forEach(l => {
      console.log(`  - Account: ${l.account.accountName} (${l.account.accountCode}), Debit: ${l.debit}, Credit: ${l.credit}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
