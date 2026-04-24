const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("📡 [DEEP-DATA-DUMP] Investigating 'VIVA' Student-Academic Integrity...");
  
  const studentData = await prisma.student.findMany({ 
    where: { schoolId: 'VIVA' },
    include: { academic: true }
  });

  console.log("\n--- STUDENT vs ACADEMIC ALIGNMENT ---");
  console.table(studentData.map(s => ({
    name: `${s.firstName} ${s.lastName}`,
    studentId: s.id,
    studentSchool: s.schoolId,
    academicSchool: s.academic?.schoolId || 'MISSING',
    academicBranch: s.academic?.branchId || 'MISSING'
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
