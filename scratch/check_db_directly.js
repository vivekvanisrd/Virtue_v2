const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== RAW SQL CHECK ON COLLECTION TABLE ===");
    const rawCountResult = await prisma.$queryRaw`SELECT COUNT(*) FROM "Collection"`;
    console.log("Raw count in Collection table:", rawCountResult);

    const rawCollections = await prisma.$queryRaw`SELECT * FROM "Collection" LIMIT 5`;
    console.log("Raw collections rows:", rawCollections);

    console.log("\n=== RAW SQL CHECK ON JOURNAL ENTRY ===");
    const jeCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "JournalEntry"`;
    console.log("Raw count in JournalEntry table:", jeCount);

    const rawJEs = await prisma.$queryRaw`SELECT id, "entryType", description FROM "JournalEntry" WHERE "entryType" = 'RECEIPT'`;
    console.log("Receipt Journal Entries in db:", rawJEs);
  } catch (err) {
    console.error("Error executing raw query:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
