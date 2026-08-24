import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteStudentCascaded(studentId: string) {
  await prisma.academicRecord.deleteMany({ where: { studentId } });
  await prisma.familyDetail.deleteMany({ where: { studentId } });
  await prisma.address.deleteMany({ where: { studentId } });
  await prisma.financialRecord.deleteMany({ where: { studentId } });
  await prisma.medicalRecord.deleteMany({ where: { studentId } });
  await prisma.bankDetail.deleteMany({ where: { studentId } });
  await prisma.previousSchool.deleteMany({ where: { studentId } });
  await prisma.student.deleteMany({ where: { id: studentId } });
}

async function main() {
  console.log("🔍 Cleaning Zero-Receipt Secondary Duplicate Profiles while preserving Siblings...\n");

  const students = await prisma.student.findMany({
    where: { branchId: "VIVES-RCB" },
    include: {
      family: true,
      collections: true
    }
  });

  // Group by (Normalized Name + Normalized Phone)
  const map = new Map<string, typeof students>();

  students.forEach(s => {
    const fName = s.firstName.trim().toLowerCase().replace(/[^a-z]/g, "");
    const phone = s.family?.fatherPhone?.replace(/[^0-9]/g, "") || "";
    if (fName && phone) {
      const key = `${fName}_${phone}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
  });

  let cleanedCount = 0;

  for (const [key, group] of map.entries()) {
    if (group.length > 1) {
      // Find receipt-holding student
      const primary = group.find(s => s.collections.length > 0) || group[0];
      const secondaries = group.filter(s => s.id !== primary.id);

      for (const sec of secondaries) {
        if (sec.collections.length === 0) {
          console.log(`🧹 Cleaning zero-receipt secondary profile: "${sec.firstName}" (${sec.admissionNumber}, ID: ${sec.id}) -> Primary: "${primary.firstName}" (${primary.admissionNumber})`);
          await deleteStudentCascaded(sec.id);
          cleanedCount++;
        }
      }
    }
  }

  console.log(`\n✅ Cleaned ${cleanedCount} zero-receipt secondary duplicate profiles!`);
  const finalStudents = await prisma.student.count({ where: { branchId: "VIVES-RCB" } });
  const finalCollections = await prisma.collection.count({ where: { student: { branchId: "VIVES-RCB" } } });
  console.log(`📌 Post-Clean Registry Summary:`);
  console.log(`   - Pure Active Register Roster: ${finalStudents} Students`);
  console.log(`   - Total Ingested Receipts: ${finalCollections}`);
}

main().finally(() => prisma.$disconnect());
