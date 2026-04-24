const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const classes = [
    { id: 'C1', name: 'Class 1', level: 1 },
    { id: 'C2', name: 'Class 2', level: 2 },
    { id: 'C3', name: 'Class 3', level: 3 },
    { id: 'C4', name: 'Class 4', level: 4 },
    { id: 'C5', name: 'Class 5', level: 5 },
    { id: 'C6', name: 'Class 6', level: 6 },
    { id: 'C7', name: 'Class 7', level: 7 },
    { id: 'C8', name: 'Class 8', level: 8 },
    { id: 'C9', name: 'Class 9', level: 9 },
    { id: 'C10', name: 'Class 10', level: 10 },
  ];

  console.log('🏗️ SEEDING SYSTEM-WIDE CLASSES...');
  
  for (const c of classes) {
    // 1. Create/Update the Global Class
    await prisma.class.upsert({
      where: { id: c.id },
      update: { level: c.level, name: c.name },
      create: { 
        id: c.id,
        name: c.name,
        level: c.level
      }
    });

    // 2. Create Section A for each Class
    await prisma.section.upsert({
      where: { id: c.id + '-A' },
      update: {},
      create: { 
        id: c.id + '-A',
        name: 'A',
        classId: c.id
      }
    });
  }

  console.log('✅ Omni-Seed Complete! Classes are now live.');
}

seed()
  .catch(e => console.error('❌ SEED FAILURE:', e.message))
  .finally(() => prisma.$disconnect());
