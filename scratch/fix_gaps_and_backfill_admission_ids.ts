import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== FIXING DISCOVERED GAPS & BACKFILLING ADMISSION IDs ===");

  // Step 1: Clean up the 6 orphaned duplicate records
  const orphanedIds = [
    "f4d83733-5a35-4909-8ea6-e7cb98c00d33", // G.SAANVIKA (Father: G.SUBHASH)
    "003bf2bf-9e58-4606-bba4-32307ab324a3", // CH.MOKSHITHA (Father: CH.SRIKANTH)
    "c9fc9ccc-a77e-49df-8a25-c673af850cdc", // B.HARSHAVARDHAN (Father: B.RAVI)
    "7417f0ad-46ed-458e-b466-6853f69a4690", // C.SAHASRA (Father: C.MADHU SUDHAN)
    "6661ceab-dbbe-4c57-9f4c-133516b2fef2", // RCB 4TH
    "5330d483-3396-4168-b653-33d42f8b590b"  // N.HARI CHANDANA (Father: N.SRISHAILAM)
  ];

  console.log("Cleaning up 6 orphaned duplicate draft student records...");
  await prisma.familyDetail.deleteMany({ where: { studentId: { in: orphanedIds } } });
  await prisma.transportDetail.deleteMany({ where: { studentId: { in: orphanedIds } } });
  await prisma.financialRecord.deleteMany({ where: { studentId: { in: orphanedIds } } });
  await prisma.student.deleteMany({ where: { id: { in: orphanedIds } } });
  console.log("Successfully removed 6 orphaned draft records.");

  // Step 2: Backfill admissionId on all Collections
  console.log("\nBackfilling admissionId for all Collections in VIVES-RCB...");
  const collections = await prisma.collection.findMany({
    where: { branchId: BRANCH_ID },
    include: { student: { include: { academic: true } } }
  });

  let backfilledCount = 0;
  for (const c of collections) {
    const academicId = c.student?.academic?.id;
    if (academicId && !c.admissionId) {
      await prisma.collection.update({
        where: { id: c.id },
        data: { admissionId: academicId }
      });
      backfilledCount++;
    }
  }

  console.log(`Successfully backfilled admissionId on ${backfilledCount} / ${collections.length} Collections.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
