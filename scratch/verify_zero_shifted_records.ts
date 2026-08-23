import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BRANCH_ID = "VIVES-RCB";

async function main() {
  console.log("=== VERIFYING M.PREKSHA, M.VEDANSH & ZERO SHIFTED RECORDS IN DB ===");

  const preksha = await prisma.student.findFirst({
    where: { branchId: BRANCH_ID, firstName: { contains: "PREKSHA" } },
    include: { family: true, collections: true, academic: { include: { class: true } } }
  });

  console.log("\n1. M.PREKSHA Profile in DB:");
  console.log(`- ID: ${preksha?.id}`);
  console.log(`- Student Name (firstName): "${preksha?.firstName}"`);
  console.log(`- Father Name (fatherName): "${preksha?.family?.fatherName}"`);
  console.log(`- Father Phone (fatherPhone): "${preksha?.family?.fatherPhone}"`);
  console.log(`- Class: "${preksha?.academic?.class?.name}"`);

  const vedansh = await prisma.student.findFirst({
    where: { branchId: BRANCH_ID, firstName: { contains: "VEDANSH" } },
    include: { family: true, collections: true, academic: { include: { class: true } } }
  });

  console.log("\n2. M.VEDANSH Profile in DB:");
  console.log(`- ID: ${vedansh?.id}`);
  console.log(`- Student Name (firstName): "${vedansh?.firstName}"`);
  console.log(`- Father Name (fatherName): "${vedansh?.family?.fatherName}"`);
  console.log(`- Father Phone (fatherPhone): "${vedansh?.family?.fatherPhone}"`);
  console.log(`- Class: "${vedansh?.academic?.class?.name}"`);

  // Scan all students in VIVES-RCB to ensure NO fatherName is a phone number
  const allStudents = await prisma.student.findMany({
    where: { branchId: BRANCH_ID },
    include: { family: true }
  });

  let phoneAsFatherCount = 0;
  for (const s of allStudents) {
    const father = (s.family?.fatherName || "").trim();
    if (/^\d{8,12}$/.test(father)) {
      phoneAsFatherCount++;
      console.log(`⚠️ Warning record: ID=${s.id}, Name="${s.firstName}", Father="${father}"`);
    }
  }

  console.log(`\nScan Result: Found ${phoneAsFatherCount} records with phone number as father name.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
