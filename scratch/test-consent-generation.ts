import { PrismaClient } from "@prisma/client";
import { generateConsentLinksAction } from "../src/lib/actions/consent-actions";
import { prismaBypass } from "../src/lib/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Consent Link Generation test...");

  // 1. Resolve staff to link identity
  const staff = await prismaBypass.staff.findFirst();
  if (!staff) {
    console.error("❌ No staff record found for linking.");
    return;
  }

  // 2. Set up environment overrides for getSovereignIdentity
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = staff.schoolId || "VIVES";
  process.env.TEST_BRANCH_ID = staff.branchId || "";
  process.env.TEST_STAFF_ID = staff.id;
  process.env.TEST_ROLE = "DEVELOPER";

  // Clean existing consents for "3rd Grade" target year to ensure we can test creation
  const targetAY = await prismaBypass.academicYear.findFirst({
    where: { schoolId: staff.schoolId, name: "2026-27" }
  });

  if (targetAY) {
    console.log(`🧹 Cleaning existing consents for year: ${targetAY.name}`);
    await prismaBypass.studentConsent.deleteMany({
      where: { academicYearId: targetAY.id }
    });
  }

  // 3. Trigger generateConsentLinksAction
  console.log("⚡ Executing generateConsentLinksAction for '3rd Grade'...");
  const result = await generateConsentLinksAction("3rd Grade", "uuid-for-2026-27");
  console.log("Result:", result);

  // 4. Verify consents generated in database
  if (targetAY) {
    const consents = await prismaBypass.studentConsent.findMany({
      where: { academicYearId: targetAY.id },
      include: { student: true }
    });
    console.log(`\n🔍 Verification:`);
    console.log(`- Created consents in DB: ${consents.length}`);
    for (const c of consents) {
      console.log(`  * Student: ${c.student.firstName} ${c.student.lastName} (Status: ${c.consentStatus}, Token: ${c.token})`);
    }

    if (consents.length > 0) {
      console.log("\n🎉 [CONSENT GENERATION TESTS PASSED SUCCESSFULLY]");
    } else {
      console.error("\n❌ Failure: No consent links were generated. Make sure students exist in '3rd Grade' for the current year!");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
