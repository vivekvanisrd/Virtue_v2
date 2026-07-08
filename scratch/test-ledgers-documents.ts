import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { getStudentFeeLedgerAction } from "../src/lib/actions/parent-fee-actions";
import { getStudentDocumentsAction } from "../src/lib/actions/parent-document-actions";
import { getStudentAcademicScheduleAction } from "../src/lib/actions/parent-schedule-actions";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Fee Ledger, Documents, and Timetable schedules integration tests...");

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

  // 2. Mock Parent Context
  process.env.TEST_OVERRIDE_SOVEREIGN = "false";
  process.env.TEST_OVERRIDE_GUARDIAN = "true";
  process.env.TEST_GUARDIAN_ID = guardian.id;
  process.env.TEST_PHONE = guardian.phone;
  process.env.TEST_NAME = "Test Parent";
  process.env.TEST_SCHOOL_ID = schoolId;

  // 3. Test Fee Ledger Retrieval Action
  console.log("\n⚡ [PARENT] Querying fee ledger summaries...");
  const ledgerRes = await getStudentFeeLedgerAction(student.id);
  console.log("Ledger Status:", ledgerRes.success);
  if (ledgerRes.success) {
    console.log("- Summary Invoiced Amount:", ledgerRes.summary?.totalInvoiced);
    console.log("- Summary Paid Amount:", ledgerRes.summary?.totalPaid);
    console.log("- Summary Outstanding Amount:", ledgerRes.summary?.totalOutstanding);
    console.log("- Installment schedules listed:", ledgerRes.installments?.length);
  }

  // 4. Test Schedule & Timetables Retrieval Action
  console.log("\n⚡ [PARENT] Querying class schedules and school holidays...");
  const scheduleRes = await getStudentAcademicScheduleAction(student.id);
  console.log("Schedule Status:", scheduleRes.success);
  if (scheduleRes.success) {
    console.log("- Calendar Holidays count:", scheduleRes.holidays?.length);
    console.log("- Timetable days returned:", scheduleRes.timetable?.length);
  }

  // 5. Test Documents Download Action
  console.log("\n⚡ [PARENT] Querying document centers...");
  const docsRes = await getStudentDocumentsAction(student.id);
  console.log("Documents Status:", docsRes.success);
  if (docsRes.success) {
    console.log("- PDF Documents count:", docsRes.documents?.length);
  }

  if (ledgerRes.success && scheduleRes.success && docsRes.success) {
    console.log("\n🎉 [LEDGER, DOCUMENTS, AND TIMETABLES TESTS PASSED SUCCESSFULLY]");
  } else {
    console.error("\n❌ Failure: One or more schedule/ledger fetches failed.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
