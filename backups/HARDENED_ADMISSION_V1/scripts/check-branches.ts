import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      branches: true
    }
  });

  console.log('--- Schools and Branches ---');
  schools.forEach(s => {
    console.log(`School: ${s.name} (ID: ${s.id})`);
    s.branches.forEach(b => {
      console.log(`  - Branch: ${b.name} (ID: ${b.id})`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
