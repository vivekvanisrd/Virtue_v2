/**
 * RECOVERY SCRIPT
 * 
 * Recovers missing Razorpay payments that were received by webhook
 * but never saved to DB due to the session bug.
 * 
 * Run: node tmp/recover_all.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Payments confirmed as Captured in Razorpay but missing from DB
const MISSING_PAYMENTS = [
  { paymentId: 'pay_SYKTynJRaScyWf', note: 'Recent - pay_SYKTynJRaScyWf' },
  { paymentId: 'pay_SYJmkcun9QH628', note: 'Studen2 S2' },
];

async function recoverPayment(paymentId) {
  console.log(`\n--- Recovering ${paymentId} ---`);

  // Step 1: Already settled?
  const existing = await p.collection.findFirst({ where: { paymentReference: paymentId } });
  if (existing) {
    console.log(`  ✅ Already in DB as collection ${existing.id}`);
    return;
  }

  // Step 2: Find which student this belongs to from activity logs or known data
  // We'll check the activity logs for any clue 
  const logs = await p.activityLog.findMany({
    where: { details: { contains: paymentId } },
    orderBy: { id: 'asc' }
  });
  console.log(`  Webhook logs found: ${logs.length}`);
  logs.forEach(l => console.log(`    [${l.createdAt.toISOString()}] ${l.action} | ${l.entityId}`));

  console.log(`  ❌ NOT in DB — needs manual assignment`);
  console.log(`  ACTION REQUIRED: Find student in Razorpay dashboard for ${paymentId}`);
  console.log(`  Then run: node tmp/settle_one.js ${paymentId} <studentId> <termId> <amount>`);
}

async function listAllMissingPayments() {
  console.log('\n=== ALL COLLECTIONS EVER RECORDED ===');
  const all = await p.collection.findMany({
    where: { paymentMode: 'Razorpay', status: 'Success' },
    include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    orderBy: { id: 'desc' }
  });
  all.forEach(c => {
    console.log(`  ✅ ${c.paymentReference} | ${c.student.firstName} ${c.student.lastName} | ₹${c.totalPaid}`);
  });
  console.log(`\nTotal Razorpay settlements in DB: ${all.length}`);
}

async function main() {
  await listAllMissingPayments();
  for (const payment of MISSING_PAYMENTS) {
    await recoverPayment(payment.paymentId);
  }
  console.log('\n=== DONE ===');
}

main().finally(() => p.$disconnect());
