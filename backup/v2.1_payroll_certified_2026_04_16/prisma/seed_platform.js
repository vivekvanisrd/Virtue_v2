const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏛️ Seeding Platform Master Templates...');

  // 1. Platform Classes (Grades 1-12)
  const classes = [
    { name: 'Grade 1', level: 1 },
    { name: 'Grade 2', level: 2 },
    { name: 'Grade 3', level: 3 },
    { name: 'Grade 4', level: 4 },
    { name: 'Grade 5', level: 5 },
    { name: 'Grade 6', level: 6 },
    { name: 'Grade 7', level: 7 },
    { name: 'Grade 8', level: 8 },
    { name: 'Grade 9', level: 9 },
    { name: 'Grade 10', level: 10 },
    { name: 'Grade 11', level: 11 },
    { name: 'Grade 12', level: 12 },
    { name: 'Lower Kindergarten', level: -2 },
    { name: 'Upper Kindergarten', level: -1 },
    { name: 'Nursery', level: -3 },
  ];

  for (const c of classes) {
    await prisma.platformClass.upsert({
      where: { level: c.level },
      update: { name: c.name },
      create: {
        name: c.name,
        level: c.level,
        sections: {
          create: [
            { name: 'Section A' },
            { name: 'Section B' }
          ]
        }
      }
    });
  }

  // 2. Platform Academic Years
  const years = [
    { name: 'India Standard (April-March)', startMonth: 4, endMonth: 3 },
    { name: 'International (Sept-August)', startMonth: 9, endMonth: 8 },
    { name: 'Jan-Dec Standard', startMonth: 1, endMonth: 12 },
  ];

  for (const y of years) {
    await prisma.platformAcademicYear.upsert({
      where: { name: y.name },
      update: {},
      create: {
        name: y.name,
        startMonth: y.startMonth,
        endMonth: y.endMonth,
      }
    });
  }

  console.log('✅ Seeding complete. Platform Masters are ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
