import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDues(registrationId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { registrationId },
      include: {
        financial: true,
        ledgerEntries: true,
        collections: true
      }
    });

    if (!student) {
      console.log("❌ Student not found.");
      return;
    }

    console.log(`--- Dues Audit for ${registrationId} ---`);
    console.log(`Student Name: ${student.firstName} ${student.lastName}`);
    
    // 1. Calculation via Financial Record (Annual Tuition)
    const annualTuition = Number(student.financial?.annualTuition || 0);
    const totalPaid = student.collections.reduce((acc, c) => acc + Number(c.amountPaid || 0), 0);
    const duesByFinancial = annualTuition - totalPaid;
    
    console.log(`\n[Financial Record View]`);
    console.log(`  Annual Tuition: ₹${annualTuition}`);
    console.log(`  Total Paid:     ₹${totalPaid}`);
    console.log(`  Expected Dues:  ₹${duesByFinancial}`);

    // 2. Calculation via Ledger (The Source of Truth)
    const charges = student.ledgerEntries.filter(e => e.type === 'CHARGE').reduce((acc, e) => acc + Number(e.amount), 0);
    const payments = student.ledgerEntries.filter(e => e.type === 'PAYMENT').reduce((acc, e) => acc + Number(e.amount), 0);
    const discounts = student.ledgerEntries.filter(e => e.type === 'DISCOUNT').reduce((acc, e) => acc + Number(e.amount), 0);
    const duesByLedger = charges - payments - discounts;

    console.log(`\n[Ledger View]`);
    console.log(`  Total Charges:   ₹${charges}`);
    console.log(`  Total Payments:  ₹${payments}`);
    console.log(`  Total Discounts: ₹${discounts}`);
    console.log(`  Net Balance Due: ₹${duesByLedger}`);

    // 3. Check for UI bug (totalAnnualFee vs annualTuition)
    console.log(`\n[UI Compatibility Check]`);
    console.log(`  student.financial.totalAnnualFee: ${(student.financial as any).totalAnnualFee ?? 'UNDEFINED'}`);
    console.log(`  student.financial.annualTuition:  ${student.financial?.annualTuition ?? 'UNDEFINED'}`);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDues('VIVES-RCB-2026-27-PROV-00005');
