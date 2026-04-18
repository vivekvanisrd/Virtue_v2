import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAcademicState() {
  console.log("🔍 [AUDIT] Starting Academic Registry Scan...");
  
  const classCount = await prisma.class.count();
  const sectionCount = await prisma.section.count();
  const academicYears = await prisma.academicYear.findMany({ select: { name: true, isCurrent: true, schoolId: true } });
  
  console.log(`📋 Total Classes in DB: ${classCount}`);
  console.log(`📋 Total Sections in DB: ${sectionCount}`);
  console.log(`📅 Academic Years found:`, academicYears);

  if (classCount === 0) {
    console.warn("⚠️ [AUDIT] WARNING: No Classes found. The institution is in a 'Pre-Genesis' state.");
  } else {
    const samples = await prisma.class.findMany({ take: 5, include: { sections: true } });
    console.log("展示 (Samples):", JSON.stringify(samples, null, 2));
  }
}

checkAcademicState()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
