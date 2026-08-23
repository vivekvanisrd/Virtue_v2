import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== DEEP INVESTIGATION OF 6 UNLINKED STUDENT RECORDS ===");

  const targetNames = ["SAANVIKA", "MOKSHITHA", "HARSHAVARDHAN", "SAHASRA", "HARI CHANDANA", "4TH"];

  for (const name of targetNames) {
    const matches = await prisma.student.findMany({
      where: {
        branchId: BRANCH_ID,
        OR: [
          { firstName: { contains: name } },
          { lastName: { contains: name } },
          { admissionNumber: { contains: name } }
        ]
      },
      include: { academic: { include: { class: true } }, financial: true, collections: true }
    });

    console.log(`\nMatches for "${name}" (${matches.length} found):`);
    for (const m of matches) {
      console.log(`- Student ID: ${m.id}`);
      console.log(`  AdmNo: ${m.admissionNumber} | Name: ${m.firstName} ${m.lastName}`);
      console.log(`  Academic: Class=${m.academic?.class?.name || "NONE"}, Section=${m.academic?.sectionId || "NONE"}`);
      console.log(`  Collections Count: ${m.collections.length}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
