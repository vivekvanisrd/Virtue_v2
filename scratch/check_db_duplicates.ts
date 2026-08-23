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

  const byAdm: Record<string, typeof rcbStudents> = {};
  for (const s of rcbStudents) {
    const key = (s.admissionNumber || "NO_ADM").trim().toUpperCase();
    if (!byAdm[key]) byAdm[key] = [];
    byAdm[key].push(s);
  }

  const multiDuplicates: Array<{ adm: string; count: number; names: string[] }> = [];
  for (const [adm, list] of Object.entries(byAdm)) {
    if (list.length > 1) {
      multiDuplicates.push({
        adm,
        count: list.length,
        names: list.map(x => `${x.firstName} ${x.lastName}`)
      });
    }
  }

  console.log(`Total Unique Admission Numbers in DB for VIVES-RCB: ${Object.keys(byAdm).length}`);
  console.log(`Admission Numbers with multiple DB records: ${multiDuplicates.length}`);
  if (multiDuplicates.length > 0) {
    console.log("Sample Multi-Record Admission Numbers:", JSON.stringify(multiDuplicates.slice(0, 15), null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
