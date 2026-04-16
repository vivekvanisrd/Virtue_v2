
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStudentIDs() {
  console.log("Checking last 10 students in the database...");

  try {
    const students = await prisma.student.findMany({
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationId: true,
        admissionNumber: true,
        studentCode: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (students.length === 0) {
      console.log('No students found.');
    } else {
      console.log(`Found ${students.length} students:`);
      console.table(students.map(s => ({
        Name: `${s.firstName} ${s.lastName}`,
        RegID: s.registrationId,
        AdmNo: s.admissionNumber,
        StuCode: s.studentCode,
        Time: s.createdAt.toISOString(),
      })));
    }
  } catch (error) {
    console.error('Error fetching students:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudentIDs();
