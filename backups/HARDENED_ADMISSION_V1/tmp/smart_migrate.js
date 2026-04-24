const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function smartMigrate() {
  console.log('🔄 STARTING SMART DATA CONSOLIDATION...');

  const classMap = [
    { name: 'Class 1', masterId: 'C1', level: 1 },
    { name: 'Class 2', masterId: 'C2', level: 2 },
    { name: 'Class 3', masterId: 'C3', level: 3 },
    { name: 'Class 4', masterId: 'C4', level: 4 },
    { name: 'Class 5', masterId: 'C5', level: 5 },
    { name: 'Class 6', masterId: 'C6', level: 6 },
    { name: 'Class 7', masterId: 'C7', level: 7 },
    { name: 'Class 8', masterId: 'C8', level: 8 },
    { name: 'Class 9', masterId: 'C9', level: 9 },
    { name: 'Class 10', masterId: 'C10', level: 10 },
  ];

  try {
    for (const item of classMap) {
      console.log(`\n🧵 Processing ${item.name}...`);
      
      // 1. Ensure Master exists
      const master = await prisma.class.upsert({
        where: { id: item.masterId },
        update: { name: item.name, level: item.level },
        create: { id: item.masterId, name: item.name, level: item.level }
      });

      // 2. Find ALL duplicates for this name (excluding the Master itself)
      const duplicates = await prisma.class.findMany({
        where: { 
          name: item.name,
          id: { not: item.masterId }
        }
      });

      if (duplicates.length > 0) {
        const dupIds = duplicates.map(d => d.id);
        console.log(`   🔸 Migrating data from ${duplicates.length} duplicates: ${dupIds.join(', ')}`);

        // 3. Update all Foreign Key references to the Master
        await prisma.academicRecord.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });
        await prisma.academicHistory.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });
        await prisma.studentAttendance.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });
        await prisma.feeStructure.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });
        await prisma.subject.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });
        
        // 4. Special handling for Sections (migrate and delete duplicates)
        await prisma.section.updateMany({ where: { classId: { in: dupIds } }, data: { classId: master.id } });

        // 5. Safely delete the orphaned duplicates
        await prisma.class.deleteMany({ where: { id: { in: dupIds } } });
        console.log(`   ✅ Duplicates for ${item.name} removed.`);
      } else {
        console.log(`   ✨ No duplicates found for ${item.name}.`);
      }
    }

    console.log('\n🏆 DATABASE CONSOLIDATION COMPLETE: Your Class Hub is now unique.');
  } catch (err) {
    console.error('❌ MIGRATION FAILURE:', err);
  } finally {
    await prisma.$disconnect();
  }
}

smartMigrate();
