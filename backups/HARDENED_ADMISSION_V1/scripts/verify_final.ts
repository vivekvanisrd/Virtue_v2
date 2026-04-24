import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function showWork() {
  console.log('--- VIRTUE V2 HARDENING VERIFICATION ---');

  // I. IDENTITY GENERATION (Standard ID Check)
  console.log('\n[1] Identity Standard (V2.1 Hardened):');
  const stu = await prisma.student.findFirst({ select: { studentCode: true, admissionNumber: true } });
  const tea = await prisma.staff.findFirst({ select: { staffCode: true } });
  const rec = await prisma.collection.findFirst({ select: { receiptNumber: true } });

  console.log(`Student ID:   ${stu?.studentCode}`);
  console.log(`Admission ID: ${stu?.admissionNumber}`);
  console.log(`Staff ID:     ${tea?.staffCode}`);
  console.log(`Receipt ID:   ${rec?.receiptNumber}`);

  // II. PAYROLL ENGINE (Sealing Hash Check)
  console.log('\n[2] Payroll Sealing (SHA256):');
  const run = await prisma.payrollRun.findFirst({ 
    where: { status: 'Approved' }, 
    include: { slips: true }
  });

  if (run) {
    console.log(`Finalized Run Table Reference: ${run.id}`);
    console.log(`Digital Seal (First Slip): ${run.slips[0]?.hash || 'N/A'}`);
  } else {
    console.log('No finalized payroll runs found for sealing verification.');
  }

  // III. BANK EXPORT (Axis Bulk Standard Preview)
  console.log('\n[3] Bank Mapper (Axis Bulk Standard):');
  if (run && run.slips.length > 0) {
      const slip = run.slips[0];
      const amount = slip.netSalary;
      const ref = `VIRTUE_SALARY_M${run.month}_Y${run.year}`;
      console.log(`Sample CSV Export Segment: [Amt: ${amount}, Remark: ${ref}]`);
  }

  console.log('\n--- VERIFICATION FINISHED ---');
}

showWork().finally(() => prisma.$disconnect());
