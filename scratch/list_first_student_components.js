const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    take: 5,
    include: {
      financial: {
        include: {
          components: {
            include: {
              masterComponent: true
            }
          }
        }
      }
    }
  });

  students.forEach((s, idx) => {
    console.log(`Student ${idx + 1}: ${s.firstName} ${s.lastName}`);
    if (s.financial) {
      console.log('  Financial Record ID:', s.financial.id);
      if (s.financial.components) {
        console.log('  Components count:', s.financial.components.length);
        s.financial.components.forEach(c => {
          console.log(`    - Name: ${c.masterComponent.name}, Type: ${c.masterComponent.type}, Amount: ${c.baseAmount}`);
        });
      } else {
        console.log('  No components');
      }
    } else {
      console.log('  No financial record');
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
