import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== INSPECTING 6 STUDENTS MISSING ACADEMIC RECORDS ===");

  const missingAcademic = await prisma.student.findMany({
    where: { branchId: BRANCH_ID, academic: null },
    include: { financial: true }
  });

  console.log(`Found ${missingAcademic.length} students without StudentAcademic profile:`);
  for (const s of missingAcademic) {
    console.log(`- ID: ${s.id} | AdmNo: ${s.admissionNumber} | Name: ${s.firstName} ${s.lastName} | Status: ${s.status}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
