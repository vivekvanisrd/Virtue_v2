import { prismaBypass } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Checking AcademicRecord formats in database...");
  const records = await prismaBypass.academicRecord.findMany({
    take: 5,
    include: {
      student: true,
      class: true
    }
  });

  for (const r of records) {
    console.log(`Student: ${r.student.firstName} ${r.student.lastName}`);
    console.log(`- classId: ${r.classId} (${r.class?.name || "No Class"})`);
    console.log(`- academicYear: ${r.academicYear}`);
    console.log("---");
  }

  const allYears = await prismaBypass.academicYear.findMany();
  console.log("\nAcademicYears in database:");
  for (const y of allYears) {
    console.log(`- ID: ${y.id}, Name: ${y.name}`);
  }
}

main().catch(console.error);
