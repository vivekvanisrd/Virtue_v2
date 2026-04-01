const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 BOOTING DEEP AUDIT: VIRTUE_V2 TENANCY');
  
  try {
    // 1. Audit Schools
    const schools = await prisma.school.findMany();
    console.log('\n--- 🏫 REGISTERED SCHOOLS ---');
    if (schools.length === 0) {
      console.log('❌ CRITICAL: No schools found in the database.');
    } else {
      schools.forEach(s => {
        console.log(`ID: ${s.id} | NAME: ${s.name} | CODE: ${s.code}`);
      });
    }

    // 2. Audit Classes
    const classes = await prisma.schoolClass.findMany({
      include: { _count: { select: { sections: true, academicrecords: true } } }
    });
    console.log('\n--- 📚 REGISTERED CLASSES ---');
    if (classes.length === 0) {
      console.log('❌ CRITICAL: No classes found in the database.');
    } else {
      classes.forEach(c => {
        console.log(`ID: ${c.id} | NAME: ${c.name} | SCHOOL_ID: ${c.schoolId} | SECTIONS: ${c._count.sections}`);
      });
    }

    // 3. Audit Sections (Orphans check)
    const sections = await prisma.section.findMany();
    console.log('\n--- 📁 REGISTERED SECTIONS ---');
    console.log(`TOTAL SECTIONS: ${sections.length}`);

  } catch (err) {
    console.error('❌ DIAGNOSTIC FAILURE:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
