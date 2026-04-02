/**
 * SETTLE_ONE — Manual payment recovery
 * 
 * Lists all students so we can match the payment.
 * Run: node tmp/list_students.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const students = await p.student.findMany({
    include: {
      financial: true,
      collections: { where: { status: 'Success' }, orderBy: { id: 'desc' } }
    },
    orderBy: { firstName: 'asc' }
  });

  console.log('\n=== ALL STUDENTS WITH FEE INFO ===\n');
  students.forEach(s => {
    const paid = s.collections.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
    const tuition = Number(s.financial?.tuitionFee || 0);
    console.log(`ID: ${s.id}`);
    console.log(`  Name: ${s.firstName} ${s.lastName} | Adm: ${s.admissionNumber}`);
    console.log(`  Tuition: ₹${tuition} | Paid: ₹${paid} | Outstanding: ₹${tuition - paid}`);
    console.log(`  Recent Payments: ${s.collections.map(c => c.paymentReference || 'cash').join(', ') || 'None'}`);
    console.log('');
  });
}

main().finally(() => p.$disconnect());
