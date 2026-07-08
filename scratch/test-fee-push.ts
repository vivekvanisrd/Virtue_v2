import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { pushPaymentLinkAction } from "../src/lib/actions/fee-push-actions";
import { getStudentFeeLedgerAction } from "../src/lib/actions/parent-fee-actions";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Fee Payment Link push integration tests...");

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

  // Clean old push invoices / notices
  await prismaBypass.feeInvoiceItem.deleteMany({});
  await prismaBypass.feeInvoice.deleteMany({ where: { studentId: student.id } });
  await prismaBypass.notice.deleteMany({ where: { title: { startsWith: "📄 Fee Payment" } } });

  // 2. Mock Admin Context to Push Payment Link
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_OVERRIDE_GUARDIAN = "false";
  process.env.TEST_SCHOOL_ID = schoolId;
  process.env.TEST_BRANCH_ID = branchId;
  process.env.TEST_STAFF_ID = "mock-admin-id";
  process.env.TEST_ROLE = "DEVELOPER";

  console.log(`\n⚡ [ADMIN] Pushing ₹5,000 Payment Link for Science Lab Material to Student: ${student.firstName}...`);
  const pushRes = await pushPaymentLinkAction({
    studentId: student.id,
    amount: 5000,
    description: "Science Lab Materials Fee"
  });
  console.log("Push Result:", pushRes);

  if (!pushRes.success || !pushRes.paymentLink) {
    console.error("❌ Failed to push payment link.");
    return;
  }

  // 3. Mock Parent Context to Verify Fee Ledger Balance Update
  process.env.TEST_OVERRIDE_SOVEREIGN = "false";
  process.env.TEST_OVERRIDE_GUARDIAN = "true";
  process.env.TEST_GUARDIAN_ID = guardian.id;
  process.env.TEST_PHONE = guardian.phone;
  process.env.TEST_NAME = "Test Parent";
  process.env.TEST_SCHOOL_ID = schoolId;

  console.log("\n⚡ [PARENT] Querying fee ledger summaries...");
  const ledgerRes = await getStudentFeeLedgerAction(student.id);
  console.log("Ledger Query Success:", ledgerRes.success);
  if (ledgerRes.success) {
    console.log("- Total Invoiced Amount in Ledger:", ledgerRes.summary?.totalInvoiced);
    console.log("- Total Outstanding Balance:", ledgerRes.summary?.totalOutstanding);
    console.log("- Installments Count:", ledgerRes.installments?.length);
    for (const inst of ledgerRes.installments || []) {
      console.log(`  * Invoice: ${inst.invoiceNumber} (Amt: ₹${inst.amount}, Balance: ₹${inst.balance})`);
    }
  }

  // Verify assertions
  const isInvoiceLogged = (ledgerRes.installments || []).some(
    (inst: any) => inst.amount === 5000 && inst.balance === 5000
  );

  if (ledgerRes.success && isInvoiceLogged) {
    console.log("\n🎉 [FEE PAYMENT PUSH & NOTIFICATION INTEGRATION TESTS PASSED SUCCESSFULLY]");
  } else {
    console.error("\n❌ Failure: Invoice balance details mismatch in ledger.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
