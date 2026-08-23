import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CLEANING 2 DRAFT JUNK RECORDS ===");

  const idsToDelete = [
    "325c71d8-7145-4ca8-96bd-81941dc90baf",
    "cf67e81f-a2e4-4f16-bb09-6c87e3b4c5c4"
  ];

  console.log(`Deleting ${idsToDelete.length} junk draft records...`);
  await prisma.academicRecord.deleteMany({ where: { studentId: { in: idsToDelete } } });
  await prisma.familyDetail.deleteMany({ where: { studentId: { in: idsToDelete } } });
  await prisma.transportDetail.deleteMany({ where: { studentId: { in: idsToDelete } } });
  await prisma.financialRecord.deleteMany({ where: { studentId: { in: idsToDelete } } });
  await prisma.student.deleteMany({ where: { id: { in: idsToDelete } } });
  console.log("Cleanup complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
