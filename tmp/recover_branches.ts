
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recoverStudentBranches() {
  console.log("Searching for students with missing branch data in the 2026-27 registry...");

  try {
    const studentsWithNullBranch = await prisma.student.findMany({
      where: {
        branchId: null
      },
      include: {
        academic: true
      }
    });

    if (studentsWithNullBranch.length === 0) {
      console.log('No students found with missing branchId.');
    } else {
      console.log(`Found ${studentsWithNullBranch.length} students to recover.`);
      
      for (const student of studentsWithNullBranch) {
        if (student.academic && student.academic.branchId) {
          console.log(`Recovering branch for ${student.firstName} ${student.lastName}: ${student.academic.branchId}`);
          await prisma.student.update({
            where: { id: student.id },
            data: { branchId: student.academic.branchId }
          });
        }
      }
      console.log('Recovery completed successfully.');
    }
  } catch (error) {
    console.error('Error during branch recovery:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recoverStudentBranches();
