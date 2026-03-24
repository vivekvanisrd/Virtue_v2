import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const aadhaar = "879545614124";
  const students = await prisma.student.findMany({
    where: { aadhaarNumber: aadhaar },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      schoolId: true,
      studentCode: true
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
