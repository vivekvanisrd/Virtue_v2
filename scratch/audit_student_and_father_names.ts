import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== AUDITING STUDENT NAMES VS FATHER NAMES IN VIVES-RCB ===");

  const students = await prisma.student.findMany({
    where: { branchId: BRANCH_ID },
    include: {
      family: true,
      collections: true,
      academic: { include: { class: true } }
    },
    take: 30
  });

  console.log(`Inspecting first 30 student records out of total in DB:`);
  for (const s of students) {
    console.log(`\nID: ${s.id} | AdmNo: ${s.admissionNumber}`);
    console.log(`  Student Name in DB: "${s.firstName}" "${s.lastName}"`);
    console.log(`  Father Name in DB:  "${s.family?.fatherName}"`);
    console.log(`  Mother Name in DB:  "${s.family?.motherName}"`);
    console.log(`  Class: ${s.academic?.class?.name || "N/A"} | Collections: ${s.collections.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
