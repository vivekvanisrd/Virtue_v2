import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function dualIdAudit() {
  console.log('--- VIRTUE V2: DUAL-ID FINAL COMPLIANCE AUDIT ---');

  const samples = await prisma.student.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      firstName: true,
      registrationId: true,
      studentCode: true,
      admissionNumber: true
    }
  });

  console.log('\n[1] Dynamic Dual-ID Integrity Check:');
  console.table(samples);

  console.log('\n[2] Perpetual Sequence Check (Registration):');
  const regCounter = await prisma.tenancyCounter.findFirst({
    where: { type: "REGISTRATION", year: "GLOBAL" }
  });
  console.log(` - Global Registration Sequence: LastValue=${regCounter?.lastValue}`);

  console.log('\n[3] Annual Reset Sequence Check (Student Code):');
  const stuCounter = await prisma.tenancyCounter.findFirst({
    where: { type: "STUDENT", year: "2026-27" }
  });
  console.log(` - 2026-27 Student Sequence: LastValue=${stuCounter?.lastValue}`);

  console.log('\n--- AUDIT COMPLETE: DUAL-ID V2.2 ACTIVE ---');
}

dualIdAudit().catch(console.error).finally(() => prisma.$disconnect());
