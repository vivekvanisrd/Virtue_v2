import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const students = await prisma.student.findMany({
    take: 5,
    include: {
      academic: { include: { class: true } },
      family: true
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(students, null, 2));
}
main().finally(() => prisma.$disconnect());
