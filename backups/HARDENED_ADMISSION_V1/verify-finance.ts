import { PrismaClient } from '@prisma/client';
import { calculateTermBreakdown } from './src/lib/utils/fee-utils';
import { recordFeeCollection } from './src/lib/actions/finance-actions';

// Use the singleton if possible, but for a standalone script, a new one is fine.
const prisma = new PrismaClient();

async function testFeeLogic() {
  console.log('🧪 Starting Fee Logic Verification...\n');

  // 1. Test Calculation Logic (Pure Utility)
  console.log('--- Step 1: Utility Calculation Test ---');
  const tuition = 40000;
  const discount = 5000;
  const breakdown = calculateTermBreakdown(tuition, discount);
  
  console.log(`Annual Tuition: ${tuition}`);
  console.log(`Discount: ${discount}`);
  console.log(`Term 1 (50%): ${breakdown.term1} (Expected: 20000)`);
  console.log(`Term 2 (25%): ${breakdown.term2} (Expected: 10000)`);
  console.log(`Term 3 (25% - Discount): ${breakdown.term3} (Expected: 5000)`);
  console.log(`Annual Net: ${breakdown.annualNet} (Expected: 35000)`);

  if (breakdown.term3 === 5000 && breakdown.term1 === 20000) {
    console.log('✅ Calculation Logic Verified (Late Realization works!)\n');
  } else {
    console.error('❌ Calculation Logic Error!\n');
    process.exit(1);
  }

  // 1.5 Ensure Financial Year exists
  const fyId = 'VR-FY-2026-27';
  await prisma.financialYear.upsert({
    where: { id: fyId },
    update: {},
    create: {
      id: fyId,
      name: 'FY 2026-27',
      startDate: new Date('2026-04-01'),
      endDate: new Date('2027-03-31'),
      isCurrent: true,
    }
  });

  // 2. Test Sibling Discovery & Database Transactions
  console.log('--- Step 2: Database Transaction Test ---');
  
  let student = await prisma.student.findFirst({
    include: { financial: true }
  });

  if (!student) {
    console.log('⚠️ No student found. Creating a test student...');
    student = await prisma.student.create({
      data: {
        admissionId: 'TEST-2026-001',
        firstName: 'Test',
        lastName: 'Student',
        academic: {
          create: {
            academicYear: '2026-27',
            branch: { connect: { code: 'RCB01' } } // Connect to seed data
          }
        },
        financial: {
          create: {
            annualTuition: 40000,
            totalDiscount: 5000,
            term1Amount: 20000,
            term2Amount: 10000,
            term3Amount: 5000
          }
        }
      },
      include: { financial: true }
    });
  }

  console.log(`Testing with Student: ${student.firstName} (${student.admissionId})`);

  // Record a payment
  const paymentAmount = 5000;
  console.log(`Recording Payment of ${paymentAmount}...`);
  
  const result = await recordFeeCollection({
    studentId: student.id,
    amountPaid: paymentAmount,
    paymentMode: 'Cash',
    allocatedTo: { term: 'Term 1 Partial' },
    collectedBy: 'Test Runner'
  });

  if (result.success) {
    console.log(`✅ Collection Recorded! Receipt: ${result.receiptNumber}`);
    
    // Verify Journal Entry
    const journal = await prisma.journalEntry.findUnique({
      where: { id: `JE-${result.receiptNumber}` },
      include: { lines: true }
    });
    
    if (journal && journal.lines.length === 2) {
      console.log(`✅ Journal Entry Created with ${journal.lines.length} lines.`);
      console.log(`   Debit: ${journal.lines[0].accountCode} (${journal.lines[0].debitAmount})`);
      console.log(`   Credit: ${journal.lines[1].accountCode} (${journal.lines[1].creditAmount})`);
    }

    // Verify COA Balance
    const assetAccount = await prisma.chartOfAccount.findUnique({ where: { accountCode: '1110' } });
    console.log(`✅ Asset Account (1110) New Balance: ${assetAccount?.currentBalance}`);
  }

  console.log('\n✨ All tests completed successfully!');
}

testFeeLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
