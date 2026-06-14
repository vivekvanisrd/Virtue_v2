const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allComps = await prisma.studentFeeComponent.findMany({
    include: {
      masterComponent: true,
      financialRecord: {
        include: {
          student: true
        }
      }
    }
  });

  const nonTuition = allComps.filter(c => 
    !c.masterComponent.name.toLowerCase().includes('tuition')
  );

  console.log('Total student components:', allComps.length);
  console.log('Total non-tuition components assigned to students:', nonTuition.length);
  
  // Count by name
  const counts = {};
  nonTuition.forEach(c => {
    counts[c.masterComponent.name] = (counts[c.masterComponent.name] || 0) + 1;
  });
  console.log('Non-tuition component breakdown:', counts);

  nonTuition.slice(0, 10).forEach((c, idx) => {
    const student = c.financialRecord.student;
    console.log(`- Student: ${student.firstName} ${student.lastName}, Component: ${c.masterComponent.name}, Amount: ${c.baseAmount}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
