import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStudentFees() {
  const studentId = "0f10d072-4948-49f8-aa71-d22157e93cef";
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { financial: true, ledgerEntries: true }
  });
  console.log("Student:", student?.firstName, student?.lastName);
  console.log("Financial Profile:", student?.financial);
  process.exit(0);
}

checkStudentFees();
