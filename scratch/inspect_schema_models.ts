import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INSPECTING SCHEMA & RELATIONS ===");

  // Check 6 students missing academic profile
  const missingAcademic = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB", academic: null },
    include: { financial: true }
  });

  console.log(`\n1. Missing Academic Students Detail (${missingAcademic.length}):`);
  for (const s of missingAcademic) {
    console.log(`- ID: ${s.id} | AdmNo: ${s.admissionNumber} | Name: ${s.firstName} ${s.lastName}`);
  }

  // Check an example student WITH academic profile
  const withAcademic = await prisma.student.findFirst({
    where: { branchId: "VIVES-RCB", academic: { isNot: null } },
    include: { academic: { include: { class: true, section: true } } }
  });

  console.log("\n2. Sample Student WITH Academic Record:");
  console.log(JSON.stringify(withAcademic?.academic, null, 2));

  // Check active Academic Year for VIVES-RCB
  const activeAY = await prisma.academicYear.findFirst({
    where: { schoolId: "VIVES", isCurrent: true }
  });
  console.log("\n3. Active Academic Year:", activeAY);
}

main().catch(console.error).finally(() => prisma.$disconnect());
