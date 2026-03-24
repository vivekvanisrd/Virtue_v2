import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    where: {
      firstName: { contains: 'Pandu', mode: 'insensitive' }
    }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main().finally(() => prisma.$disconnect());
