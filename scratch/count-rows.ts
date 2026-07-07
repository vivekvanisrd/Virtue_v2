import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("📊 [DB_DIAGNOSTIC] Counting rows in key tables...");
  const [students, components, templateComponents, financialRecords, ledgerEntries, collections] = await Promise.all([
    prisma.student.count(),
    prisma.studentFeeComponent.count(),
    prisma.feeTemplateComponent.count(),
    prisma.financialRecord.count(),
    prisma.ledgerEntry.count(),
    prisma.collection.count()
  ]);

  console.log("Row Counts:\n", {
    Student: students,
    StudentFeeComponent: components,
    FeeTemplateComponent: templateComponents,
    FinancialRecord: financialRecords,
    LedgerEntry: ledgerEntries,
    Collection: collections
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
