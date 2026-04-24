
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRecentStudents() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  console.log(`Checking students added after: ${oneHourAgo.toISOString()}`);

  try {
    const students = await prisma.student.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        registrationId: true,
        admissionNumber: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (students.length === 0) {
      console.log('No students found in the last 1 hour.');
    } else {
      console.log(`Found ${students.length} students:`);
      console.table(students.map(s => ({
        Name: `${s.firstName} ${s.lastName}`,
        RegID: s.registrationId,
        AdmNo: s.admissionNumber,
        Time: s.createdAt.toLocaleTimeString(),
      })));
    }
  } catch (error) {
    console.error('Error fetching recent students:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentStudents();
