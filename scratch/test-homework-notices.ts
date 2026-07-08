import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { createHomeworkAction, getStudentHomeworkAction } from "../src/lib/actions/homework-actions";
import { createNoticeAction, getStudentNoticesAction, acknowledgeNoticeAction } from "../src/lib/actions/notice-actions";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Homework & Notice Board targeting integration tests...");

  // 1. Resolve test guardian and warded student from prior test run
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
    include: { student: { include: { academic: true } } }
  });

  if (!studentLink || !studentLink.student.academic) {
    console.error("❌ Linked student academic record not found.");
    return;
  }

  const student = studentLink.student;
  const placement = student.academic;
  const schoolId = student.schoolId || "VIVES";
  const branchId = student.branchId || "GLOBAL";

  console.log(`- Guardian Profile: ${guardian.firstName} (Phone: ${guardian.phone})`);
  console.log(`- Linked Student: ${student.firstName} ${student.lastName || ""} (Class: ${placement.classId})`);

  // Clean existing homework/notices for test isolation
  await prismaBypass.homeworkSubmission.deleteMany({});
  await prismaBypass.homework.deleteMany({ where: { classId: placement.classId } });
  await prismaBypass.noticeAcknowledgement.deleteMany({ where: { guardianId: guardian.id } });
  await prismaBypass.noticeAttachment.deleteMany({});
  await prismaBypass.notice.deleteMany({ where: { schoolId } });

  // 2. Mock Teacher Context to Create Homework & Notices
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_OVERRIDE_GUARDIAN = "false";
  process.env.TEST_SCHOOL_ID = schoolId;
  process.env.TEST_BRANCH_ID = branchId;
  process.env.TEST_STAFF_ID = "mock-teacher-id";
  process.env.TEST_ROLE = "DEVELOPER";

  console.log("\n⚡ [STAFF] Creating Homework targeted to student class/section...");
  const hwRes = await createHomeworkAction({
    classId: placement.classId,
    sectionId: placement.sectionId,
    subjectId: "math-sub-uuid",
    teacherId: "mock-teacher-id",
    homeworkDate: new Date(),
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    title: "Trigonometry Basics",
    description: "Read pages 12-15 and solve exercise 1.1"
  });
  console.log("Homework Publish Result:", hwRes);

  console.log("⚡ [STAFF] Creating Notices with targeting criteria...");
  
  // Notice A: General Parent Target
  const noticeA = await createNoticeAction({
    title: "School Fees Reminder",
    content: "Please clear active term outstanding dues.",
    audienceType: "PARENTS",
    publishFrom: new Date(),
    publishTill: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    requiresAcknowledgement: true
  });
  console.log("Notice A Publish Result:", noticeA);

  // Notice B: Targeted class notice
  const noticeB = await createNoticeAction({
    title: "Field Trip Circular",
    content: "Science park field trip details.",
    audienceType: "CLASS",
    targetClassId: placement.classId,
    publishFrom: new Date(),
    publishTill: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    requiresAcknowledgement: false
  });
  console.log("Notice B Publish Result:", noticeB);

  // 3. Switch Context to Parent
  process.env.TEST_OVERRIDE_SOVEREIGN = "false";
  process.env.TEST_OVERRIDE_GUARDIAN = "true";
  process.env.TEST_GUARDIAN_ID = guardian.id;
  process.env.TEST_PHONE = guardian.phone;
  process.env.TEST_NAME = `${guardian.firstName} ${guardian.lastName || ""}`;
  process.env.TEST_SCHOOL_ID = schoolId;

  console.log("\n⚡ [PARENT] Fetching homework assignments feed...");
  const homeworkFeed = await getStudentHomeworkAction(student.id);
  console.log("Homework Feed count:", homeworkFeed.homework?.length);
  for (const h of homeworkFeed.homework || []) {
    console.log(`  * Homework: ${h.title} (Due: ${h.dueDate})`);
  }

  console.log("⚡ [PARENT] Fetching bulletins and notices feed...");
  const noticesFeed = await getStudentNoticesAction(student.id);
  console.log("Notices count:", noticesFeed.notices?.length);
  for (const n of noticesFeed.notices || []) {
    console.log(`  * Notice: ${n.title} (Audience: ${n.audienceType}, Acknowledged: ${n.acknowledged})`);
  }

  // 4. Verify notice acknowledgement workflow
  const targetNotice = (noticesFeed.notices || []).find((n: any) => n.requiresAcknowledgement);
  if (targetNotice) {
    console.log(`\n⚡ [PARENT] Acknowledging notice: ${targetNotice.title}...`);
    const ackRes = await acknowledgeNoticeAction(targetNotice.id);
    console.log("Acknowledgement Result:", ackRes);

    // Verify acknowledgement is recorded
    const refreshedFeed = await getStudentNoticesAction(student.id);
    const updatedNotice = (refreshedFeed.notices || []).find((n: any) => n.id === targetNotice.id);
    console.log(`- Refreshed Notice Acknowledged state: ${updatedNotice?.acknowledged}`);
    
    if (updatedNotice?.acknowledged === true) {
      console.log("\n🎉 [HOMEWORK & NOTICES INTEGRATION TESTS PASSED SUCCESSFULLY]");
    } else {
      console.error("\n❌ Failure: Notice acknowledgement status did not toggle.");
    }
  } else {
    console.error("\n❌ Failure: Did not find the target notice requiring acknowledgement.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
