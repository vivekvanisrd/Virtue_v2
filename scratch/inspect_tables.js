const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const counts = {
      school: await prisma.school.count(),
      branch: await prisma.branch.count(),
      student: await prisma.student.count(),
      academicRecord: await prisma.academicRecord.count(),
      financialRecord: await prisma.financialRecord.count(),
      collection: await prisma.collection.count(),
      ledgerEntry: await prisma.ledgerEntry.count(),
      journalEntry: await prisma.journalEntry.count(),
      journalLine: await prisma.journalLine.count(),
      chartOfAccount: await prisma.chartOfAccount.count()
    };
    console.log("=== TABLE COUNTS ===");
    console.log(JSON.stringify(counts, null, 2));

    if (counts.collection > 0) {
      console.log("\n=== FIRST 5 COLLECTIONS ===");
      const cols = await prisma.collection.findMany({ take: 5 });
      console.log(JSON.stringify(cols, null, 2));
    } else {
      console.log("\nNo collections found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
