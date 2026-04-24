const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function repair() {
  const studentId = 'cd31fd8d-1e3b-4bac-a904-65723d87997b';
  
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { academic: true }
  });

  if (!student || !student.academic) {
    console.error("Student or AcademicRecord not found!");
    process.exit(1);
  }

  const activeAY = await prisma.academicYear.findFirst({
    where: { schoolId: student.schoolId, isCurrent: true }
  });

  if (!activeAY) {
    console.error("Current Academic Year not found!");
    process.exit(1);
  }

  const history = await prisma.academicHistory.create({
    data: {
      id: crypto.randomUUID(),
      studentId: student.id,
      schoolId: student.schoolId,
      branchId: student.branchId,
      academicYearId: activeAY.id,
      classId: student.academic.classId,
      sectionId: student.academic.sectionId,
      admissionNumber: student.admissionNumber,
      studentCode: student.studentCode,
      admissionDate: student.academic.admissionDate || new Date(),
      promotionStatus: "NEW_ADMISSION",
      isGenesis: true
    }
  });

  console.log("Repair Success! AcademicHistory created:", history.id);
}

repair().catch(console.error).finally(() => prisma.$disconnect());
