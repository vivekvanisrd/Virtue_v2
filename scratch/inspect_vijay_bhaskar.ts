import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== INSPECTING M.VIJAY BHASKAR & M.PREKSHA IN DB ===");

  const students = await prisma.student.findMany({
    where: {
      branchId: BRANCH_ID,
      OR: [
        { firstName: { contains: "VIJAY" } },
        { lastName: { contains: "VIJAY" } },
        { firstName: { contains: "PREKSHA" } },
        { lastName: { contains: "PREKSHA" } },
        { admissionNumber: { contains: "PREKSHA" } },
        { admissionNumber: { contains: "VIJAY" } }
      ]
    },
    include: {
      family: true,
      collections: true,
      academic: { include: { class: true } }
    }
  });

  console.log(`Found ${students.length} student records related to VIJAY / PREKSHA:`);
  for (const s of students) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Student ID: ${s.id}`);
    console.log(`AdmNo (admissionNumber): "${s.admissionNumber}"`);
    console.log(`Student Name (firstName/lastName): "${s.firstName}" "${s.lastName}"`);
    console.log(`Father Name (family.fatherName): "${s.family?.fatherName}"`);
    console.log(`Class: "${s.academic?.class?.name}"`);
    console.log(`Collections Count: ${s.collections.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
