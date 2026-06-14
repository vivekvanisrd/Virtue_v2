const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nonTuition = await prisma.studentFeeComponent.findMany({
    where: {
      masterComponent: {
        name: {
          not: {
            contains: 'tuition',
            mode: 'insensitive'
          }
        }
      }
    },
    include: {
      masterComponent: true,
      financialRecord: {
        include: {
          student: true
        }
      }
    }
  });

  console.log('Total non-tuition components assigned to students:', nonTuition.length);
  nonTuition.slice(0, 10).forEach((c, idx) => {
    const student = c.financialRecord.student;
    console.log(`- Student: ${student.firstName} ${student.lastName}, Component: ${c.masterComponent.name}, Amount: ${c.baseAmount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
