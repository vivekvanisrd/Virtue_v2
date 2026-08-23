import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== COMPARING DB RECORDS WITH EXACT SCREENSHOT MASTER DATA ===");

  const targetAdmNos = [
    "TEMP001", "TEMP002", "TEMP004", "TEMP005", "TEMP006", "TEMP007", "TEMP008", "TEMP009",
    "TEMP011", "TEMP012", "TEMP013", "TEMPO10", "VM0581", "VR0018-26", "VR0024-25",
    "VR0036-26", "VR0037-26", "VR0039-26", "VR0040-26", "VR0041-26", "VR0042-26", "VR0043-26",
    "VR0044-26", "VR0046-26", "VR0048-26", "VR0050-26", "VR0051-26", "VR0052-26"
  ];

  for (const admNo of targetAdmNos) {
    const matches = await prisma.student.findMany({
      where: {
        branchId: BRANCH_ID,
        OR: [
          { admissionNumber: admNo },
          { admissionNumber: { contains: admNo } }
        ]
      },
      include: {
        family: true,
        collections: true,
        academic: { include: { class: true } }
      }
    });

    console.log(`\n------------------------------------------------------------`);
    console.log(`Target Register ID: "${admNo}" | Matches Found in DB: ${matches.length}`);
    for (const s of matches) {
      console.log(`- Student ID: ${s.id}`);
      console.log(`  admissionNumber in DB: "${s.admissionNumber}"`);
      console.log(`  firstName in DB:       "${s.firstName}"`);
      console.log(`  lastName in DB:        "${s.lastName}"`);
      console.log(`  fatherName in DB:      "${s.family?.fatherName}"`);
      console.log(`  Class in DB:           "${s.academic?.class?.name}"`);
      console.log(`  Collections Count:     ${s.collections.length}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
