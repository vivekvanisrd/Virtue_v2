import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function audit() {
  const staff = await prisma.staff.findMany({
    take: 5,
    include: { branch: true, school: true }
  });
  
  const students = await prisma.student.findMany({
    take: 5,
    include: { academic: { include: { branch: true } }, school: true }
  });
  
  const results = {
    staff: staff.map(s => ({
      oldId: s.staffCode,
      school: s.school.code,
      branch: s.branch.code,
      role: s.role
    })),
    students: students.map(s => ({
      oldAdm: s.admissionNumber,
      oldCode: s.studentCode,
      school: s.school.code,
      branch: s.academic?.branch?.code,
      year: s.academic?.academicYear // This is currently the ID, need to resolve to name
    }))
  };
  
  console.log(JSON.stringify(results, null, 2));
}

audit().finally(() => prisma.$disconnect());
