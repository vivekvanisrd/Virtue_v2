import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fullHealthCheck() {
  console.log('--- VIRTUE V2 DATABASE COMPLIANCE AUDIT (HARDENED V2.1) ---');

  // 1. BRANCH AUDIT
  console.log('\n[1] Branch Integrity:');
  const branches = await prisma.branch.findMany({ select: { id: true, name: true, code: true } });
  branches.forEach(b => console.log(` - ${b.name}: Code="${b.code}"`));

  // 2. STUDENT IDENTITIES
  console.log('\n[2] Student Identity Samples (Latest 3):');
  const students = await prisma.student.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { academic: { include: { branch: true } } }
  });
  students.forEach(s => {
    console.log(` - ${s.firstName}: Code=${s.studentCode}, Adm=${s.admissionNumber}, Branch=${s.academic?.branch.code}`);
  });

  // 3. STAFF IDENTITIES
  console.log('\n[3] Staff Identity Samples (Latest 3):');
  const staff = await prisma.staff.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { branch: true }
  });
  staff.forEach(s => {
    console.log(` - ${s.name}: Code=${s.staffCode}, Role=${s.role}, Branch=${s.branch.code}`);
  });

  // 4. FINANCIAL RECEIPT IDENTITIES
  console.log('\n[4] Financial Receipt Samples (Latest 3):');
  const receipts = await prisma.collection.findMany({
    take: 3,
    orderBy: { id: 'desc' },
    include: { branch: true }
  });
  receipts.forEach(r => {
    console.log(` - Receipt: No=${r.receiptNumber}, Amount=${r.amount}, Branch=${r.branch.code}`);
  });

  // 5. COUNTER SERVICE STATE
  console.log('\n[5] Tenancy Counter Sequences (Active 2026-27):');
  const counters = await prisma.tenancyCounter.findMany({
    where: { year: '2026-27' },
    orderBy: { type: 'asc' }
  });
  counters.forEach(c => {
    console.log(` - ${c.type}: LastValue=${c.lastValue}, Branch=${c.branchId}`);
  });

  // 6. PAYROLL INTEGRITY
  console.log('\n[6] Payroll Sealing (SHA256 Status):');
  const slips = await prisma.salarySlip.findMany({
    take: 3,
    where: { hash: { not: null } },
    include: { payrollRun: true }
  });
  if (slips.length > 0) {
      slips.forEach(s => {
          console.log(` - ${s.employeeName} (${s.month}/${s.year}): Sealed Hash=${s.hash?.substring(0, 16)}...`);
      });
  } else {
      console.log(' - No sealed salary slips found in DB.');
  }

  console.log('\n--- AUDIT COMPLETE ---');
}

fullHealthCheck().catch(console.error).finally(() => prisma.$disconnect());
