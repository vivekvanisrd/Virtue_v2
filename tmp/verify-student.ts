import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const latestStudent = await prisma.student.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      family: true,
      academic: true
    }
  });
  
  console.log(JSON.stringify(latestStudent, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
