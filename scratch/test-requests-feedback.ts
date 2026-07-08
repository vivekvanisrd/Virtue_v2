import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { submitProfileChangeAction, getPendingProfileRequestsAction, moderateProfileRequestAction } from "../src/lib/actions/profile-request-actions";
import { submitParentFeedbackAction, getFeedbackReportsAction } from "../src/lib/actions/feedback-actions";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Demographic Correction Requests & Feedback moderation integration tests...");

  // 1. Resolve test guardian and student
  const testEmail = "test.parent@example.com";
  const guardian = await prismaBypass.guardian.findFirst({
    where: { email: testEmail }
  });

  if (!guardian) {
    console.error("❌ Test Guardian profile not found. Please run scratch/test-guardian-auth.ts first.");
    return;
  }

  const studentLink = await prismaBypass.studentGuardian.findFirst({
    where: { guardianId: guardian.id },
    include: { student: true }
  });

  if (!studentLink) {
    console.error("❌ Sibling linkage record not found.");
    return;
  }

  const student = studentLink.student;
  const schoolId = student.schoolId || "VIVES";
  const branchId = student.branchId || "GLOBAL";

  // Clean existing change requests/feedbacks for test isolation
  await prismaBypass.profileChangeRequest.deleteMany({ where: { guardianId: guardian.id } });
  await prismaBypass.feedback.deleteMany({ where: { guardianId: guardian.id } });

  // 2. Mock Parent Context: Submit Demographic Edit Request
  process.env.TEST_OVERRIDE_SOVEREIGN = "false";
  process.env.TEST_OVERRIDE_GUARDIAN = "true";
  process.env.TEST_GUARDIAN_ID = guardian.id;
  process.env.TEST_PHONE = guardian.phone;
  process.env.TEST_NAME = "Test Parent";
  process.env.TEST_SCHOOL_ID = schoolId;

  const testAddress = "123 Enterprise Row, Tech Campus";
  console.log(`\n⚡ [PARENT] Requesting address correction to: "${testAddress}"...`);
  const reqRes = await submitProfileChangeAction({
    studentId: student.id,
    requestType: "ADDRESS",
    newValue: testAddress
  });
  console.log("Submit Request Result:", reqRes);

  if (!reqRes.success || !reqRes.requestId) {
    console.error("❌ Failed to submit profile change request.");
    return;
  }

  // 3. Mock Parent Context: Submit Feedback (Anonymously)
  console.log("⚡ [PARENT] Submitting anonymous app review...");
  const feedbackRes = await submitParentFeedbackAction({
    studentId: student.id,
    category: "APP",
    targetType: "Application",
    rating: 5,
    comment: "This new portal works beautifully!",
    isAnonymous: true
  });
  console.log("Submit Feedback Result:", feedbackRes);

  // 4. Mock Admin Context: Retrieve & Moderate Requests
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_OVERRIDE_GUARDIAN = "false";
  process.env.TEST_SCHOOL_ID = schoolId;
  process.env.TEST_BRANCH_ID = branchId;
  process.env.TEST_STAFF_ID = "mock-admin-id";
  process.env.TEST_ROLE = "DEVELOPER";

  console.log("\n⚡ [ADMIN] Querying pending correction queues...");
  const pendingRequests = await getPendingProfileRequestsAction();
  console.log(`Pending requests count: ${pendingRequests.requests?.length}`);

  const targetRequest = (pendingRequests.requests || []).find((r: any) => r.id === reqRes.requestId);
  if (!targetRequest) {
    console.error("❌ Target request not resolved in queue.");
    return;
  }
  console.log(`- Request found: Type=${targetRequest.requestType}, Old="${targetRequest.oldValue}", New="${targetRequest.newValue}"`);

  console.log(`⚡ [ADMIN] Approving request: ${targetRequest.id}...`);
  const modRes = await moderateProfileRequestAction({
    requestId: targetRequest.id,
    status: "APPROVED",
    remarks: "Verified residential proof document."
  });
  console.log("Moderation Result:", modRes);

  // 5. Verify database updates on master tables
  console.log("\n🔍 Verification: Checking Address table in database...");
  const updatedAddress = await prismaBypass.address.findUnique({
    where: { studentId: student.id }
  });
  console.log("- Value in DB currentAddress:", updatedAddress?.currentAddress);

  // 6. Verify anonymous feedback masking
  console.log("\n⚡ [ADMIN] Querying feedback reviews...");
  const feedbackReports = await getFeedbackReportsAction();
  console.log(`Reports count: ${feedbackReports.feedbacks?.length}`);
  
  const testFeedback = (feedbackReports.feedbacks || []).find((f: any) => f.comment.includes("new portal"));
  if (testFeedback) {
    console.log("- Review details resolved:");
    console.log(`  * Rating: ${testFeedback.rating} Stars`);
    console.log(`  * Comment: "${testFeedback.comment}"`);
    console.log(`  * Guardian Profile: ${testFeedback.guardian === null ? "MASKED (Anonymous)" : "Visible"}`);
    console.log(`  * Student Profile: ${testFeedback.student === null ? "MASKED (Anonymous)" : "Visible"}`);
  }

  if (updatedAddress?.currentAddress === testAddress && testFeedback?.guardian === null) {
    console.log("\n🎉 [PROFILE CHANGE REQUEST & FEEDBACK TESTS PASSED SUCCESSFULLY]");
  } else {
    console.error("\n❌ Failure: Data was not correctly updated or masked.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
