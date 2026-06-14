const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const structures = await prisma.feeStructure.findMany({
    include: {
      class: true,
      components: {
        include: {
          masterComponent: true
        }
      }
    }
  });

  console.log('Total Fee Structures:', structures.length);
  structures.forEach((s, idx) => {
    console.log(`\nStructure ${idx + 1}: ${s.name} (Class: ${s.class ? s.class.name : 'N/A'}, Total: ${s.totalAmount})`);
    s.components.forEach(c => {
      console.log(`  - Component: ${c.masterComponent.name}, Type: ${c.masterComponent.type}, Amount: ${c.amount}, Schedule: ${c.scheduleType}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
