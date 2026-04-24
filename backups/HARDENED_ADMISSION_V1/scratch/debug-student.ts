import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugStudent() {
  console.log("🔍 Auditing Test Student: VIVES-VIVESRCB-2026-27-STU-00006");
  try {
    const student = await prisma.student.findFirst({
      where: { 
        OR: [
          { admissionNumber: 'VIVES-VIVESRCB-2026-27-STU-00006' },
          { firstName: 'Test' }
        ]
      },
      include: {
        ledgerEntries: true,
        academic: true,
        financial: true
      }
    });

    if (student) {
      console.log("✅ Student Found!");
      console.log(`Status: ${student.status}`);
      console.log(`SchoolId: ${student.schoolId}`);
      console.log(`BranchId: ${student.branchId}`);
      console.log(`Ledger Counts: ${student.ledgerEntries.length}`);
      
      const totalCharge = student.ledgerEntries
        .filter(l => l.type === 'CHARGE')
        .reduce((sum, l) => sum + Number(l.amount), 0);
      
      console.log(`Total Charges in Ledger: ${totalCharge}`);
      
      // Check for Branch-Specific Stats filters
      const hubStatsCount = await prisma.student.count({
        where: { schoolId: student.schoolId, branchId: student.branchId, status: 'Active' }
      });
      console.log(`Hub Stats matching (Active): ${hubStatsCount}`);
      
      const anyStatsCount = await prisma.student.count({
        where: { schoolId: student.schoolId, branchId: student.branchId }
      });
      console.log(`Hub Stats matching (Any Status): ${anyStatsCount}`);
      
    } else {
      console.log("❌ Student Not Found!");
    }
  } catch (err) {
    console.error("Diagnostic Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

debugStudent();
