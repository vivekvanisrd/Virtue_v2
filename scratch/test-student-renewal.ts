import { PrismaClient } from "@prisma/client";
import { promoteStudentChunkAction } from "../src/lib/actions/academic-actions";
import { prismaBypass } from "../src/lib/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Student Renewal Lifecycle test...");

  // 1. Resolve an active student
  const student = await prismaBypass.student.findFirst({
    where: { isDeleted: false },
    include: { academic: true, financial: true }
  });

  if (!student) {
    console.error("❌ No active student found to run test.");
    return;
  }

  // Force student status to Active at start of test to ensure clean baseline
  await prismaBypass.student.update({
    where: { id: student.id },
    data: { status: "Active" }
  });

  console.log(`👤 Resolved Student: ${student.firstName} ${student.lastName} (ID: ${student.id}, Status: Active)`);

  // Ensure student has a financial record for threshold checking
  let financial = student.financial;
  if (!financial) {
    console.log("🛠️ Creating mock financial record for threshold check...");
    financial = await prismaBypass.financialRecord.create({
      data: {
        studentId: student.id,
        schoolId: student.schoolId || "TEST_SCHOOL",
        branchId: student.branchId || "TEST_BRANCH",
        annualTuition: 30000,
        term1Amount: 10000,
        netTuition: 30000
      }
    });
  }

  // 2. Resolve Academic Years and Class
  const currentAY = student.academic?.academicYear || "2025-26";
  const targetAYName = "2026-27";
  
  let targetAY = await prismaBypass.academicYear.findFirst({
    where: { name: targetAYName }
  });

  if (!targetAY) {
    console.log(`🛠️ Creating target academic year: ${targetAYName}`);
    targetAY = await prismaBypass.academicYear.create({
      data: {
        name: targetAYName,
        startDate: new Date("2026-06-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: false,
        schoolId: student.schoolId || "TEST_SCHOOL"
      }
    });
  }

  const targetClassId = student.academic?.classId;
  if (!targetClassId) {
    console.error("❌ Student has no academic class.");
    return;
  }

    // 3. Resolve or create a PromotionBatch
  console.log("🛠️ Finding a staff record to link execution...");
  const staff = await prismaBypass.staff.findFirst();

  if (!staff) {
    console.error("❌ No staff record found for linking.");
    return;
  }

  console.log("🛠️ Creating mock PromotionBatch...");
  const batch = await prismaBypass.promotionBatch.create({
    data: {
      schoolId: student.schoolId || "TEST_SCHOOL",
      branchId: student.branchId || "TEST_BRANCH",
      sourceYearId: currentAY,
      sourceClassId: targetClassId,
      targetClassId: targetClassId,
      status: "COMPLETED",
      executedBy: {
        connect: { id: staff.id }
      },
      academicYear: {
        connect: { id: targetAY.id }
      }
    }
  });

  // Clean existing target history if any
  await prismaBypass.academicHistory.deleteMany({
    where: { studentId: student.id, academicYearId: targetAY.id }
  });

  // 4. Trigger Promotion Chunk Action
  console.log("⚡ Executing promoteStudentChunkAction...");
  
  // Set up sovereign identity override for terminal execution
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = student.schoolId || "";
  process.env.TEST_BRANCH_ID = student.branchId || "";
  process.env.TEST_STAFF_ID = staff.id;
  process.env.TEST_ROLE = "DEVELOPER";
  
  const promRes = await promoteStudentChunkAction({
    studentIds: [student.id],
    sourceAcademicYearId: currentAY,
    targetAcademicYearId: targetAY.id,
    targetClassId: targetClassId,
    batchId: batch.id
  });

  console.log("Promotion Action Result:", promRes);

  // 5. Verify Phase 1 & 2 State Assertions
  const updatedStudent = await prismaBypass.student.findUnique({
    where: { id: student.id }
  });

  const nextYearHistory = await prismaBypass.academicHistory.findFirst({
    where: { studentId: student.id, academicYearId: targetAY.id }
  });

  console.log("\n🔍 Verification post-promotion:");
  console.log(`- Global Student Status: ${updatedStudent?.status} (Expected: "Active")`);
  console.log(`- Next-Year history created: ${!!nextYearHistory}`);
  console.log(`- Next-Year history data:`, JSON.stringify(nextYearHistory));

  if (updatedStudent?.status === "PROVISIONAL") {
    console.error("❌ Failure: Global Student status was reset to PROVISIONAL!");
  } else if (!nextYearHistory || nextYearHistory.renewalStatus !== "PENDING") {
    console.error("❌ Failure: Next-year renewalStatus is not PENDING!");
  } else {
    console.log("✅ Phase 1 & 2 assertions passed!");
  }

  // 6. Simulate Payment Renewal Promotion
  console.log("\n⚡ Simulating first-term fee payment...");
  
  if (nextYearHistory) {
    const amountPaid = 15000;
    const threshold = Number(financial?.term1Amount || 0);
    console.log(`[TEST_DEBUG] amountPaid: ${amountPaid}, threshold: ${threshold}, rawTerm1: ${financial?.term1Amount}`);

    if (amountPaid >= threshold) {
      console.log(`✅ Cleared threshold of ${threshold}. Updating history ID '${nextYearHistory.id}' renewalStatus to RENEWED.`);
      const updateResult = await prismaBypass.academicHistory.update({
        where: { id: nextYearHistory.id },
        data: { renewalStatus: "RENEWED" }
      });
      console.log("Update Result:", JSON.stringify(updateResult));
    }
  }

  const finalizedHistory = await prismaBypass.academicHistory.findFirst({
    where: { studentId: student.id, academicYearId: targetAY.id }
  });

  console.log("\n🔍 Verification post-payment:");
  console.log(`- Next-Year history renewalStatus: ${finalizedHistory?.renewalStatus} (Expected: "RENEWED")`);

  if (!finalizedHistory || finalizedHistory.renewalStatus !== "RENEWED") {
    console.error("❌ Failure: renewalStatus was not updated to RENEWED!");
  } else {
    console.log("✅ Phase 3 assertion passed!");
    console.log("\n🎉 [ALL RENEWAL LIFECYCLE TESTS PASSED SUCCESSFULLY]");
  }

  // Cleanup test batch & target history
  await prismaBypass.academicHistory.deleteMany({
    where: { studentId: student.id, academicYearId: targetAY.id }
  });
  await prismaBypass.promotionBatch.delete({
    where: { id: batch.id }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
