const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("📡 [DATA-DUMP] Investigating school 'VIVA'...");
  
  const branches = await prisma.branch.findMany({ where: { schoolId: 'VIVA' } });
  console.log("\n--- BRANCHES ---");
  console.table(branches.map(b => ({ id: b.id, name: b.name, code: b.code })));

  const students = await prisma.student.findMany({ 
    where: { schoolId: 'VIVA' },
    include: { academic: true }
  });
  console.log("\n--- STUDENTS ---");
  console.table(students.map(s => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    schoolId: s.schoolId,
    branchId: s.academic?.branchId || 'MISSING'
  })));

  const staff = await prisma.staff.findMany({
    where: { schoolId: 'VIVA' }
  });
  console.log("\n--- STAFF ---");
  console.table(staff.map(s => ({
    id: s.id,
    name: s.firstName,
    role: s.role,
    branchId: s.branchId
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
