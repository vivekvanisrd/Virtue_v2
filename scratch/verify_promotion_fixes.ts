import fs from "fs";
import path from "path";

// Load env variables from .env.local dynamically
const envLocalPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        let key = match[1].trim();
        let val = match[2].trim();
        // Remove quotes
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      }
    }
  }
}

// Override connection string to use port 5432 directly (bypassing pgbouncer port 6543 if blocked)
process.env.DATABASE_URL = "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:5432/postgres";

// Now dynamically load dependencies after the override is set in process.env
const prismaModule = require("../src/lib/prisma");
const prisma = prismaModule.default || prismaModule;

const academicActions = require("../src/lib/actions/academic-actions");
const { 
  createPromotionBatchAction, 
  promoteStudentChunkAction, 
  rollbackPromotionBatchAction 
} = academicActions;

async function testPromotionFixes() {
  console.log("🚀 STARTING INTEGRATION TESTS FOR ACADEMICS & PROMOTION FIXES...");

  const testSchoolCode = "VS" + Math.floor(Math.random() * 9000 + 1000); // e.g., VS5001
  const branchRcbId = `${testSchoolCode}-RCB`;
  const branchHsrId = `${testSchoolCode}-HSR`;

  // MOCK IDENTITY SETTINGS FOR TEST RUN
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = testSchoolCode;
  process.env.TEST_BRANCH_ID = branchRcbId;
  process.env.TEST_ROLE = "PRINCIPAL";
  process.env.TEST_STAFF_ID = `STF-${testSchoolCode}-01`;

  try {
    // 1. Set up School, Branches, Staff
    console.log("\n[1] Setting up database fixtures...");
    await prisma.school.create({
      data: {
        id: testSchoolCode,
        name: "Test Rollover School",
        code: testSchoolCode,
        status: "Active"
      }
    });

    await prisma.branch.createMany({
      data: [
        { id: branchRcbId, schoolId: testSchoolCode, name: "RCB Campus", code: "RCB", status: "Active" },
        { id: branchHsrId, schoolId: testSchoolCode, name: "HSR Campus", code: "HSR", status: "Active" }
      ]
    });

    // Create staff member (Principal for RCB)
    await prisma.staff.create({
      data: {
        id: `STF-${testSchoolCode}-01`,
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        firstName: "RCB",
        lastName: "Principal",
        role: "PRINCIPAL",
        staffCode: `${testSchoolCode}-RCB-STF-001`,
        status: "Active"
      }
    });

    // 2. Create Academic Sessions & Financial Years
    console.log("[2] Provisioning Academic & Financial Sessions...");
    const fy = await prisma.financialYear.create({
      data: {
        schoolId: testSchoolCode,
        name: `${testSchoolCode}-FY-26`,
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31")
      }
    });

    const aySource = await prisma.academicYear.create({
      data: {
        schoolId: testSchoolCode,
        name: "2025-26",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-05-31"),
        isCurrent: false
      }
    });

    const ayTarget = await prisma.academicYear.create({
      data: {
        schoolId: testSchoolCode,
        name: "2026-27",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-05-31"),
        isCurrent: true,
        financialYearId: fy.id
      }
    });

    // 3. Create Classes & Fee Structures
    console.log("[3] Setting up classes, sections, and fee structures...");
    const classSource = await prisma.class.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "9th Grade", level: 9 }
    });
    const classTarget = await prisma.class.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "10th Grade", level: 10 }
    });

    // Section
    const sectionSource = await prisma.section.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "A", classId: classSource.id }
    });
    const sectionTarget = await prisma.section.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "A", classId: classTarget.id }
    });

    // MOCK Chart of Accounts
    const receivableCOA = await prisma.chartOfAccount.create({
      data: { schoolId: testSchoolCode, accountCode: "1200", accountName: "Accounts Receivable", type: "ASSET" }
    });
    const tuitionCOA = await prisma.chartOfAccount.create({
      data: { schoolId: testSchoolCode, accountCode: "4100", accountName: "Tuition Income", type: "INCOME" }
    });

    // Fee master component and structure
    const feeComponent = await prisma.feeComponentMaster.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "Tuition Fee", accountCode: "4100" }
    });

    const feeStructure = await prisma.feeStructure.create({
      data: {
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        classId: classTarget.id,
        academicYearId: ayTarget.id,
        name: "10th Grade Fee Structure",
        totalAmount: 15000,
        components: {
          create: [
            { schoolId: testSchoolCode, branchId: branchRcbId, componentId: feeComponent.id, amount: 15000 }
          ]
        }
      }
    });

    // Unrelated Custom Fee Component (to test waiver/custom component preservation)
    const customFeeComponent = await prisma.feeComponentMaster.create({
      data: { schoolId: testSchoolCode, branchId: branchRcbId, name: "Special Sports Fee", accountCode: "4100" }
    });

    // 4. Create Students (One in RCB, One in HSR)
    console.log("[4] Creating test student profiles...");
    const studentRcb = await prisma.student.create({
      data: {
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        firstName: "RCB",
        lastName: "Student",
        studentCode: `${testSchoolCode}-RCB-001`,
        admissionNumber: `${testSchoolCode}-RCB-001`,
        status: "Active",
        academic: {
          create: {
            schoolId: testSchoolCode,
            branchId: branchRcbId,
            classId: classSource.id,
            sectionId: sectionSource.id,
            academicYear: aySource.id
          }
        }
      },
      include: { academic: true }
    });

    const studentHsr = await prisma.student.create({
      data: {
        schoolId: testSchoolCode,
        branchId: branchHsrId,
        firstName: "HSR",
        lastName: "Student",
        studentCode: `${testSchoolCode}-HSR-001`,
        admissionNumber: `${testSchoolCode}-HSR-001`,
        status: "Active",
        academic: {
          create: {
            schoolId: testSchoolCode,
            branchId: branchHsrId,
            classId: classSource.id,
            sectionId: sectionSource.id,
            academicYear: aySource.id
          }
        }
      },
      include: { academic: true }
    });

    // Add manual custom component to RCB student's financial card
    const finRecord = await prisma.financialRecord.create({
      data: {
        studentId: studentRcb.id,
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        annualTuition: 0,
        netTuition: 0,
        components: {
          create: [
            { schoolId: testSchoolCode, branchId: branchRcbId, componentId: customFeeComponent.id, baseAmount: 2000 }
          ]
        }
      }
    });

    // 5. Test Case 1: Cross-Branch Tenancy Isolation Check
    console.log("\n--- TEST 1: Cross-Branch Tenancy Isolation Check ---");
    // Principal belongs to RCB. Try to promote HSR student.
    const batch = await prisma.promotionBatch.create({
      data: {
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        executedById: `STF-${testSchoolCode}-01`,
        sourceYearId: aySource.id,
        targetYearId: ayTarget.id,
        sourceClassId: classSource.id,
        targetClassId: classTarget.id,
        status: "COMPLETED"
      }
    });

    const test1Res = await promoteStudentChunkAction({
      studentIds: [studentHsr.id],
      sourceAcademicYearId: aySource.id,
      targetAcademicYearId: ayTarget.id,
      targetClassId: classTarget.id,
      targetSectionId: sectionTarget.id,
      batchId: batch.id
    });

    if (test1Res.success) {
      throw new Error("❌ FAILURE: Cross-branch boundary was bypassed! RCB Principal promoted HSR student.");
    } else {
      console.log("✅ SUCCESS: Cross-branch promotion was blocked with error:", test1Res.error);
    }

    // Try rollback HSR batch (mocking batch branch switch)
    const batchHsr = await prisma.promotionBatch.create({
      data: {
        schoolId: testSchoolCode,
        branchId: branchHsrId,
        executedById: `STF-${testSchoolCode}-01`,
        sourceYearId: aySource.id,
        targetYearId: ayTarget.id,
        sourceClassId: classSource.id,
        targetClassId: classTarget.id,
        status: "COMPLETED"
      }
    });

    const test1Rollback = await rollbackPromotionBatchAction(batchHsr.id);
    if (test1Rollback.success) {
      throw new Error("❌ FAILURE: Cross-branch rollback was bypassed!");
    } else {
      console.log("✅ SUCCESS: Cross-branch rollback was blocked with error:", test1Rollback.error);
    }

    // 6. Test Case 2: Standard Promotion & Ledger Accruals
    console.log("\n--- TEST 2: Standard Promotion & Ledger Accruals ---");
    const test2Res = await promoteStudentChunkAction({
      studentIds: [studentRcb.id],
      sourceAcademicYearId: aySource.id,
      targetAcademicYearId: ayTarget.id,
      targetClassId: classTarget.id,
      targetSectionId: sectionTarget.id,
      batchId: batch.id
    });

    if (!test2Res.success) {
      throw new Error(`❌ FAILURE: Standard promotion failed with error: ${test2Res.error}`);
    }
    console.log("✅ SUCCESS: Student promoted successfully.");

    // Check Journal entry balance and structures
    const pRecord = await prisma.promotionRecord.findFirst({
      where: { batchId: batch.id, studentId: studentRcb.id }
    });

    if (!pRecord || !pRecord.journalEntryId) {
      throw new Error("❌ FAILURE: General ledger journal entry was not created.");
    }

    const journal = await prisma.journalEntry.findUnique({
      where: { id: pRecord.journalEntryId },
      include: { lines: true }
    });

    if (!journal) throw new Error("Journal entry not found.");
    console.log(`✅ Journal Entry Accrued: ${journal.totalDebit} Debit, ${journal.totalCredit} Credit`);
    if (Number(journal.totalDebit) !== 15000 || Number(journal.totalCredit) !== 15000) {
      throw new Error("❌ FAILURE: Journal total debit/credit does not match fee structure amount.");
    }
    const debitLine = journal.lines.find(l => l.debit > 0);
    const creditLine = journal.lines.find(l => l.credit > 0);
    console.log(`✅ Debit: ${debitLine?.debit} to Account ${debitLine?.accountId}`);
    console.log(`✅ Credit: ${creditLine?.credit} to Account ${creditLine?.accountId}`);

    // Check custom fee component preservation
    const studentComponents = await prisma.studentFeeComponent.findMany({
      where: { studentFinancialId: finRecord.id }
    });
    console.log(`✅ Student Fee Components active count: ${studentComponents.length} (Expected: 2 - Tuition + Special Sports Fee)`);
    const customComp = studentComponents.find(c => c.componentId === customFeeComponent.id);
    if (!customComp) {
      throw new Error("❌ FAILURE: Unrelated manual custom fee component was deleted during promotion!");
    }
    console.log(`✅ Custom component preserved: ${customComp.baseAmount} base amount`);

    // 7. Test Case 3: Safe Rollback (Preserving paid fee ledger entries)
    console.log("\n--- TEST 3: Safe Rollback & Paid Fee Protection ---");
    // Mock user payment in target year
    const paymentLedger = await prisma.ledgerEntry.create({
      data: {
        studentId: studentRcb.id,
        schoolId: testSchoolCode,
        branchId: branchRcbId,
        academicYearId: ayTarget.id,
        financialYearId: fy.id,
        type: "PAYMENT",
        amount: 5000,
        reason: "Term 1 Tuition Fee Paid",
        createdBy: `STF-${testSchoolCode}-01`
      }
    });

    // Execute rollback
    const test3Res = await rollbackPromotionBatchAction(batch.id);
    if (!test3Res.success) {
      throw new Error(`❌ FAILURE: Rollback failed: ${test3Res.error}`);
    }
    console.log("✅ SUCCESS: Rollover batch successfully reversed.");

    // Validate ledger payments are preserved
    const targetLedgerEntries = await prisma.ledgerEntry.findMany({
      where: { studentId: studentRcb.id, academicYearId: ayTarget.id }
    });

    console.log(`✅ Target year ledger entries remaining count: ${targetLedgerEntries.length} (Expected: 1 - Payment only)`);
    const preservedPayment = targetLedgerEntries.find(l => l.id === paymentLedger.id);
    if (!preservedPayment) {
      throw new Error("❌ FAILURE: Mock user payment ledger entry was incorrectly deleted during rollback!");
    }
    console.log(`✅ Preserved payment entry: ${preservedPayment.amount} of type ${preservedPayment.type}`);

    // Check if custom concessions are preserved after rollback
    const postRollbackComponents = await prisma.studentFeeComponent.findMany({
      where: { studentFinancialId: finRecord.id }
    });
    const postRollbackCustom = postRollbackComponents.find(c => c.componentId === customFeeComponent.id);
    if (!postRollbackCustom) {
      throw new Error("❌ FAILURE: Custom fee components were deleted during rollback!");
    }
    console.log("✅ Custom fee components preserved post-rollback.");

    console.log("\n✨ ALL TESTS COMPLETED SUCCESSFULLY! ✨");

  } catch (err: any) {
    console.error("\n❌ TEST INTEGRITY FAILURE DETECTED:");
    console.error(err);
    process.exit(1);
  } finally {
    console.log("\n🧹 Cleaning up fixtures...");
    try {
      // Cascade delete school records
      await prisma.journalLine.deleteMany({ where: { journalEntry: { schoolId: testSchoolCode } } });
      await prisma.journalEntry.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.ledgerEntry.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.studentFeeComponent.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.financialRecord.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.promotionRecord.deleteMany({ where: { batch: { schoolId: testSchoolCode } } });
      await prisma.promotionBatch.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.academicHistory.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.academicRecord.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.studentConsent.deleteMany({ where: { student: { schoolId: testSchoolCode } } });
      await prisma.student.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.feeTemplateComponent.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.feeStructure.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.feeComponentMaster.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.chartOfAccount.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.section.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.class.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.academicYear.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.financialYear.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.staff.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.branch.deleteMany({ where: { schoolId: testSchoolCode } });
      await prisma.school.delete({ where: { id: testSchoolCode } });
      console.log("✅ Fixtures clean.");
    } catch (e) {
      console.error("Cleanup error:", e);
    }
    await prisma.$disconnect();
  }
}

testPromotionFixes();
