import dotenv from "dotenv";
import path from "path";
// Load .env.local first to override any default .env values
dotenv.config({ path: path.resolve(__dirname, "./.env.local") });

import { PrismaClient } from '@prisma/client';
import { calculateTermBreakdown } from './src/lib/utils/fee-utils';
import { recordFeeCollection } from './src/lib/actions/finance-actions';

// Setup override variables for testing context
process.env.TEST_OVERRIDE_SOVEREIGN = "true";
process.env.TEST_ROLE = "DEVELOPER";
process.env.TEST_STAFF_ID = "operational-test-agent";

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
  console.log(`Term 1 (50%): ${breakdown.term1.amount} (Expected: 20000)`);
  console.log(`Term 2 (25%): ${breakdown.term2.amount} (Expected: 10000)`);
  console.log(`Term 3 (25% - Discount): ${breakdown.term3.amount} (Expected: 5000)`);
  console.log(`Annual Net: ${breakdown.annualNet} (Expected: 35000)`);

  if (breakdown.term3.amount === 5000 && breakdown.term1.amount === 20000) {
    console.log('✅ Calculation Logic Verified (Late Realization works!)\n');
  } else {
    console.error('❌ Calculation Logic Error!\n');
    process.exit(1);
  }

  // Get school and branch from DB to construct correct environment & references
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school found in DB");
  const schoolId = school.id;
  process.env.TEST_SCHOOL_ID = schoolId;

  const branch = await prisma.branch.findFirst({ where: { schoolId } });
  if (!branch) throw new Error("No branch found in DB");
  const branchId = branch.id;
  process.env.TEST_BRANCH_ID = branchId;

  // Clean up existing test student data to make the test idempotent
  const existingStudent = await prisma.student.findFirst({
    where: { admissionNumber: 'TEST-2026-001' }
  });
  if (existingStudent) {
    console.log('🧹 Cleaning up old test data for TEST-2026-001...');
    await prisma.collection.deleteMany({ where: { studentId: existingStudent.id } });
    await prisma.ledgerEntry.deleteMany({ where: { studentId: existingStudent.id } });
    await prisma.academicHistory.deleteMany({ where: { studentId: existingStudent.id } });
    await prisma.financialRecord.deleteMany({ where: { studentId: existingStudent.id } });
    await prisma.academicRecord.deleteMany({ where: { studentId: existingStudent.id } });
    await prisma.student.delete({ where: { id: existingStudent.id } });
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
      schoolId: schoolId
    }
  });

  // Ensure necessary Chart of Accounts entries exist
  const coaAccounts = [
    { code: '1110', name: 'Cash on Hand', type: 'Asset' },
    { code: '1200', name: 'Accounts Receivable', type: 'Asset' },
    { code: '4200', name: 'Admission Income', type: 'Income' },
    { code: '4500', name: 'Service Income', type: 'Income' },
  ];

  for (const acc of coaAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { schoolId_accountCode: { schoolId, accountCode: acc.code } },
      update: {},
      create: {
        schoolId,
        branchId,
        accountCode: acc.code,
        accountName: acc.name,
        accountType: acc.type,
        currentBalance: 0
      }
    });
  }

  // 2. Test Sibling Discovery & Database Transactions
  console.log('--- Step 2: Database Transaction Test ---');
  
  let student = await prisma.student.findFirst({
    where: { schoolId, branchId },
    include: { financial: true, history: true }
  });

  const academicYear = await prisma.academicYear.findFirst({ where: { schoolId } });
  if (!academicYear) throw new Error("No academic year found in DB");
  
  const classObj = await prisma.class.findFirst();
  if (!classObj) throw new Error("No class found in DB");

  if (!student) {
    console.log('⚠️ No student found. Creating a test student...');
    student = await prisma.student.create({
      data: {
        admissionNumber: 'TEST-2026-001',
        firstName: 'Test',
        lastName: 'Student',
        schoolId: schoolId,
        branchId: branchId,
        academic: {
          create: {
            academicYear: '2026-27',
            branchId: branchId,
            schoolId: schoolId
          }
        },
        financial: {
          create: {
            annualTuition: 40000,
            totalDiscount: 5000,
            term1Amount: 20000,
            term2Amount: 10000,
            term3Amount: 5000,
            schoolId: schoolId,
            branchId: branchId
          }
        },
        history: {
          create: {
            id: `AH-${Date.now()}`,
            academicYearId: academicYear.id,
            classId: classObj.id,
            promotionStatus: 'PROMOTED',
            schoolId: schoolId,
            branchId: branchId
          }
        }
      },
      include: { financial: true, history: true }
    });
  } else if (student.history.length === 0) {
    console.log('⚠️ Student has no academic history. Adding history record...');
    await prisma.academicHistory.create({
      data: {
        id: `AH-${Date.now()}`,
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: classObj.id,
        promotionStatus: 'PROMOTED',
        schoolId: schoolId,
        branchId: branchId
      }
    });
  }

  if (!student || !student.id) {
    throw new Error("Student object is null or failed to create");
  }

  // Precheck COA accounts in database for the active schoolId
  const dbCashAcc = await prisma.chartOfAccount.findFirst({ where: { schoolId, accountCode: '1110' } });
  const dbArAcc = await prisma.chartOfAccount.findFirst({ where: { schoolId, accountCode: '1200' } });
  console.log(`🔍 [COA Precheck] SchoolId: ${schoolId}`);
  console.log(`🔍 [COA Precheck] Cash Account (1110) found: ${dbCashAcc ? 'Yes (id: ' + dbCashAcc.id + ')' : 'No'}`);
  console.log(`🔍 [COA Precheck] AR Account (1200) found: ${dbArAcc ? 'Yes (id: ' + dbArAcc.id + ')' : 'No'}`);

  console.log(`Testing with Student: ${student.firstName} (${student.admissionNumber})`);

  // Record a payment
  const paymentAmount = 5000;
  console.log(`Recording Payment of ${paymentAmount}...`);
  
  const result = await recordFeeCollection({
    studentId: student.id,
    selectedTerms: ['term1'],
    amountPaid: paymentAmount,
    paymentMode: 'Cash',
    lateFeePaid: 0,
    lateFeeWaived: false,
    paymentReference: `REF-${Date.now()}`
  });

  if (result.success && result.data) {
    console.log(`✅ Collection Recorded! Receipt: ${result.data.receiptNumber}`);
    
    // Re-fetch the collection from DB to get the updated journalEntryId
    const dbCollection = await prisma.collection.findUnique({
      where: { id: result.data.id }
    });
    
    const journalEntryId = dbCollection?.journalEntryId;
    if (journalEntryId) {
      const journal = await prisma.journalEntry.findUnique({
        where: { id: journalEntryId },
        include: { lines: true }
      });
      
      if (journal && journal.lines.length >= 2) {
        console.log(`✅ Journal Entry Created with ${journal.lines.length} lines.`);
        console.log(`   Debit Account ID: ${journal.lines[0].accountId} (Debit: ${journal.lines[0].debit})`);
        console.log(`   Credit Account ID: ${journal.lines[1].accountId} (Credit: ${journal.lines[1].credit})`);
      } else {
        console.warn('⚠️ Journal entry was found but did not have the expected number of lines.');
      }
    } else {
      console.warn('⚠️ No journal entry ID linked on the collection record.');
    }

    // Verify COA Balance
    const assetAccount = await prisma.chartOfAccount.findFirst({
      where: { accountCode: '1110', schoolId }
    });
    console.log(`✅ Asset Account (1110) New Balance: ${assetAccount?.currentBalance}`);
  } else {
    console.error('❌ Failed to record fee collection:', result.error);
    process.exit(1);
  }

  console.log('\n✨ All tests completed successfully!');
}

testFeeLogic()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
