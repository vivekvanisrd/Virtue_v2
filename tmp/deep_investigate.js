const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function investigate() {
  console.log('\n======== DEEP INVESTIGATION: pay_SYKTynJRaScyWf ========\n');
  
  // 1. All activity logs for this payment
  const logs = await p.activityLog.findMany({
    where: { details: { contains: 'pay_SYKTynJRaScyWf' } },
    orderBy: { id: 'asc' }
  });
  console.log('=== WEBHOOK AUDIT TRAIL ===');
  logs.forEach(l => {
    console.log(`  [${l.createdAt.toISOString()}] ${l.action} | Event: ${l.entityId}`);
    console.log(`    Detail: ${l.details}`);
  });
  
  // 2. Did it land in collections?
  const coll = await p.collection.findFirst({
    where: { paymentReference: 'pay_SYKTynJRaScyWf' }
  });
  console.log('\n=== COLLECTION RECORD ===');
  console.log(coll ? JSON.stringify(coll, null, 2) : '  ❌ NOT FOUND IN DB');

  // 3. What student does this payment belong to? Inspect Razorpay notes via activity log
  // Check the decoded order to find studentId
  const recentOrders = await p.activityLog.findMany({
    where: { 
      action: 'RECEIVED',
      entityType: 'WEBHOOK'
    },
    orderBy: { id: 'desc' },
    take: 20
  });
  console.log('\n=== RECENT 20 WEBHOOK EVENTS ===');
  recentOrders.forEach(l => {
    console.log(`  [${l.createdAt.toISOString()}] ${l.entityId} | ${l.details}`);
  });

  // 4. Check for failed settlement logs 
  const failLogs = await p.activityLog.findMany({
    where: { action: { in: ['FAILED', 'ERROR', 'REJECTED', 'RECONCILED_MANUALLY', 'AUTO_SETTLED'] } },
    orderBy: { id: 'desc' },
    take: 10
  });
  console.log('\n=== SETTLEMENT OUTCOME LOGS (last 10) ===');
  failLogs.forEach(l => {
    console.log(`  [${l.createdAt.toISOString()}] ${l.action} | ${l.details}`);  
  });

  // 5. Check all recent Collections (last 10)
  const allCollections = await p.collection.findMany({
    orderBy: { id: 'desc' },
    take: 10,
    include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } }
  });
  console.log('\n=== LAST 10 COLLECTIONS IN DB ===');
  allCollections.forEach(c => {
    console.log(`  [${c.id}] ${c.student.firstName} ${c.student.lastName} | ${c.paymentMode} | Ref: ${c.paymentReference} | ₹${c.totalPaid} | ${c.status}`);
  });
}

investigate().finally(() => p.$disconnect());
