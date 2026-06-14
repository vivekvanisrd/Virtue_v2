const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const receipts = await prisma.journalEntry.findMany({
      where: { entryType: 'RECEIPT' },
      include: {
        lines: { include: { account: true } },
        ledgerEntries: { include: { student: true } }
      }
    });

    console.log(`Found ${receipts.length} receipt journal entries.\n`);

    for (const je of receipts) {
      console.log(`JournalEntry ID: ${je.id}`);
      console.log(`Date: ${je.entryDate.toDateString()}`);
      console.log(`Description: ${je.description}`);
      console.log(`Total Debit: ${je.totalDebit}`);
      
      // Let's find related ledger entry
      const relatedLedger = await prisma.ledgerEntry.findMany({
        where: {
          OR: [
            { journalEntryId: je.id },
            { reason: { contains: je.description || "" } }
          ]
        },
        include: { student: { include: { academic: true } } }
      });
      
      console.log(`Related Ledger Entries: ${relatedLedger.length}`);
      for (const le of relatedLedger) {
        console.log(`  - LedgerEntry ID: ${le.id}`);
        console.log(`    Student: ${le.student?.firstName} ${le.student?.lastName} (ID: ${le.studentId})`);
        console.log(`    Reason: ${le.reason}`);
        console.log(`    Amount: ${le.amount}`);
      }

      // Let's also check if there is an AcademicHistory for the student
      if (relatedLedger.length > 0) {
        const studentId = relatedLedger[0].studentId;
        const histories = await prisma.academicHistory.findMany({
          where: { studentId }
        });
        console.log(`  Student AcadHistories: ${histories.length}`);
        for (const h of histories) {
          console.log(`    - History ID: ${h.id} | Class ID: ${h.classId} | AY ID: ${h.academicYearId}`);
        }
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
