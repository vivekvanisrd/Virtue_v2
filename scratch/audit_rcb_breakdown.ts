import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rcbStudents = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      createdAt: true
    }
  });

  console.log(`Total VIVES-RCB Students in DB: ${rcbStudents.length}`);

  const pastedSynthetic = rcbStudents.filter(s => s.admissionNumber?.startsWith("ADM-PASTED"));
  const edgeSynthetic = rcbStudents.filter(s => s.admissionNumber?.startsWith("ADM-EDGE"));
  const noAdm = rcbStudents.filter(s => s.admissionNumber === "NO_ADM_NO" || !s.admissionNumber);
  const regularStudents = rcbStudents.filter(s => !s.admissionNumber?.startsWith("ADM-PASTED") && !s.admissionNumber?.startsWith("ADM-EDGE") && s.admissionNumber !== "NO_ADM_NO");

  console.log(`Regular Admission Number Students (e.g. VR..., TEMP...): ${regularStudents.length}`);
  console.log(`ADM-PASTED synthetic prefix: ${pastedSynthetic.length}`);
  console.log(`ADM-EDGE synthetic prefix: ${edgeSynthetic.length}`);
  console.log(`NO_ADM_NO synthetic prefix: ${noAdm.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
