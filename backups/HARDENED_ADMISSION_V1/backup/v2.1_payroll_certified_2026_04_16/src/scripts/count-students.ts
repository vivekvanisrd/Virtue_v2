import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalStudents = await prisma.student.count();
  console.log('Total Students in DB:', totalStudents);

  const bySchool = await prisma.student.groupBy({
    by: ['schoolId'],
    _count: {
      id: true
    }
  });
  console.log('Students by School:', bySchool);

  // Group by tenant (for academic data) to see if some are missing tenant info
  const academics = await prisma.academicRecord.groupBy({
    by: ['schoolId', 'branchId'],
    _count: {
      id: true
    }
  });
  console.log('Academic Records by Tenant:', academics);
}

main().finally(() => prisma.$disconnect());
