
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugStudentDirectory() {
  const targetId = 'VIVA-MAIN-2026-27-STU-00014';
  console.log(`Searching for student with Admission Number: ${targetId}`);

  try {
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { admissionNumber: targetId },
          { registrationId: targetId }
        ]
      },
      include: {
        academic: true,
        history: true
      }
    });

    if (!student) {
      console.log('Student not found with that ID.');
    } else {
      console.log('--- Student Details ---');
      console.log(`Name: ${student.firstName} ${student.lastName}`);
      console.log(`School ID: ${student.schoolId}`);
      console.log(`Branch ID: ${student.branchId}`);
      console.log(`Status: ${student.status}`);
      if (student.academic) {
        console.log(`Academic Branch: ${student.academic.branchId}`);
        console.log(`Academic Year: ${student.academic.academicYear}`);
      }
    }

    // Check Branch VIVA-BR-01
    const branch = await prisma.branch.findUnique({
      where: { id: 'VIVA-BR-01' },
      select: { name: true, code: true }
    });
    console.log('\n--- Branch Details (VIVA-BR-01) ---');
    console.log(`Name: ${branch?.name}`);
    console.log(`Code: ${branch?.code}`);

    // Check recent branch 'MAIN'
    const mainBranch = await prisma.branch.findFirst({
      where: { code: 'MAIN' }
    });
    console.log('\n--- Branch with code MAIN ---');
    console.log(`ID: ${mainBranch?.id}`);
    console.log(`Name: ${mainBranch?.name}`);

  } catch (error) {
    console.error('Error debugging directory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugStudentDirectory();
