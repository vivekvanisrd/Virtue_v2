import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== FIXING SHIFTED RECORDS FOR M.PREKSHA AND M.VEDANSH ===");

  // 1. Fix M.PREKSHA
  await prisma.student.update({
    where: { id: "1d37b2f6-50ae-40b1-8f9c-8ece5cc2f4d6" },
    data: {
      firstName: "M.PREKSHA",
      lastName: "",
      admissionNumber: "VR-PREKSHA"
    }
  });
  await prisma.familyDetail.update({
    where: { studentId: "1d37b2f6-50ae-40b1-8f9c-8ece5cc2f4d6" },
    data: {
      fatherName: "M.VIJAY BHASKAR",
      fatherPhone: "9398023070"
    }
  });

  // 2. Fix M.VEDANSH
  await prisma.student.update({
    where: { id: "8b5a9a2a-50c8-4d00-9704-d2682e1fc284" },
    data: {
      firstName: "M.VEDANSH",
      lastName: "",
      admissionNumber: "VR-VEDANSH"
    }
  });
  await prisma.familyDetail.update({
    where: { studentId: "8b5a9a2a-50c8-4d00-9704-d2682e1fc284" },
    data: {
      fatherName: "M.LINGAM",
      fatherPhone: "9948128928"
    }
  });

  console.log("Successfully fixed shifted records for M.PREKSHA and M.VEDANSH!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
