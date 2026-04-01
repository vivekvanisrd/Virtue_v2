const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.staff.updateMany({
    where: { 
      firstName: { 
        contains: 'virtuetest', 
        mode: 'insensitive' 
      } 
    },
    data: { 
      branchId: 'VIVA-BR-01' 
    }
  });
  console.log(`Updated ${result.count} staff records to branch VIVA-BR-01`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
