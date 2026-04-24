const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  try {
    console.log("--- DATA COMPATIBILITY AUDIT ---");
    
    // 1. Enrollment Density
    const students = await prisma.student.count();
    const studentsWithSchool = await prisma.student.count({ where: { NOT: { schoolId: "" } } });
    const studentsWithAcademic = await prisma.student.count({ where: { academic: { isNot: null } } });
    const studentsWithFinancial = await prisma.student.count({ where: { financial: { isNot: null } } });

    console.log(`Total Students: ${students}`);
    console.log(`Students with schoolId: ${studentsWithSchool}`);
    console.log(`Students with AcademicRecord: ${studentsWithAcademic}`);
    console.log(`Students with FinancialRecord: ${studentsWithFinancial}`);

    // 2. Class/Section Density
    const academicRecords = await prisma.academicRecord.findMany({
      select: { classId: true, sectionId: true }
    });
    const orphans = academicRecords.filter(r => !r.classId).length;
    console.log(`Academic Records without Class: ${orphans}`);

    // 3. Duplicate Checks
    const dupes = await prisma.$queryRaw`SELECT "admissionNumber", COUNT(*) FROM "Student" GROUP BY "admissionNumber" HAVING COUNT(*) > 1`;
    console.log(`Duplicate Admission Numbers: ${Array.isArray(dupes) ? dupes.length : 0}`);

    process.exit(0);
  } catch (err) {
    console.error("Audit Error:", err);
    process.exit(1);
  }
}

audit();
