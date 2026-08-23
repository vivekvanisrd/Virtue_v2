import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== SCANNING FOR INVERTED NAME & SHIFTED FIELD RECORDS IN VIVES-RCB ===");

  const allStudents = await prisma.student.findMany({
    where: { branchId: BRANCH_ID },
    include: {
      family: true,
      collections: true,
      academic: { include: { class: true } }
    }
  });

  const invertedList: any[] = [];
  for (const s of allStudents) {
    const father = (s.family?.fatherName || "").trim();
    const adm = (s.admissionNumber || "").trim();
    const isFatherPhone = /^\d{8,12}$/.test(father); // If fatherName is just a phone number!
    const isAdmName = !adm.startsWith("VR") && !adm.startsWith("VS") && !adm.startsWith("VM") && !adm.startsWith("TEMP");

    if (isFatherPhone || isAdmName) {
      invertedList.push(s);
    }
  }

  console.log(`Found ${invertedList.length} inverted / shifted student records:`);
  for (const s of invertedList) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`Student ID: ${s.id}`);
    console.log(`  admNo in DB:     "${s.admissionNumber}"`);
    console.log(`  Name in DB:      "${s.firstName} ${s.lastName}"`);
    console.log(`  Father in DB:    "${s.family?.fatherName}"`);
    console.log(`  Collections:     ${s.collections.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
