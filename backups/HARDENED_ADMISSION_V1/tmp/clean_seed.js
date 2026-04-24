const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAndSeed() {
  console.log('🧹 STARTING DATABASE CLEAN-UP...');
  
  try {
    // 1. Wipe current classes and sections to resolve the duplication
    // We use deleteMany to clear the slate
    await prisma.section.deleteMany({});
    await prisma.class.deleteMany({});
    console.log('✨ Database is now clean.');

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

    console.log('🏗️ SEEDING UNIQUE ACADEMIC STRUCTURE...');
    
    for (const c of classes) {
      await prisma.class.create({
        data: { 
          id: c.id,
          name: c.name,
          level: c.level
        }
      });

      await prisma.section.create({
        data: { 
          id: c.id + '-A',
          name: 'A',
          classId: c.id
        }
      });
    }

    console.log('✅ DATABASE SYNCED: Exactly 10 Classes and 10 Sections created.');
  } catch (err) {
    console.error('❌ CLEAN-UP FAILURE:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAndSeed();
