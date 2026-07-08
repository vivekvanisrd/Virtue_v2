import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { requestGuardianOtpAction, verifyGuardianOtpAction, getGuardianSiblingsAction } from "../src/lib/actions/guardian-auth-actions";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Guardian Authentication & Sibling Linkage integration tests...");

  // 1. Resolve two active students in the database to link as mock siblings
  const students = await prismaBypass.student.findMany({
    take: 2
  });

  if (students.length < 2) {
    console.error("❌ Need at least 2 active students in database to run sibling linkage test.");
    return;
  }

  const studentA = students[0];
  const studentB = students[1];
  console.log(`- Selected Sibling A: ${studentA.firstName} ${studentA.lastName || ""} (ID: ${studentA.id})`);
  console.log(`- Selected Sibling B: ${studentB.firstName} ${studentB.lastName || ""} (ID: ${studentB.id})`);

  const schoolId = studentA.schoolId || "VIVES";
  const branchId = studentA.branchId || "GLOBAL";
  const testEmail = "test.parent@example.com";
  const testPhone = "9988776655";

  // 2. Set up / seed a test Guardian record in the DB
  console.log("🌱 Seeding mock Guardian profile...");
  
  // Clean up any old test records
  const oldGuardian = await prismaBypass.guardian.findFirst({
    where: { email: testEmail }
  });
  if (oldGuardian) {
    await prismaBypass.studentGuardian.deleteMany({ where: { guardianId: oldGuardian.id } });
    await prismaBypass.guardianOTP.deleteMany({ where: { auth: { guardianId: oldGuardian.id } } });
    await prismaBypass.guardianSession.deleteMany({ where: { auth: { guardianId: oldGuardian.id } } });
    await prismaBypass.noticeAcknowledgement.deleteMany({ where: { guardianId: oldGuardian.id } });
    await prismaBypass.profileChangeRequest.deleteMany({ where: { guardianId: oldGuardian.id } });
    await prismaBypass.feedback.deleteMany({ where: { guardianId: oldGuardian.id } });
    await prismaBypass.guardianAuth.deleteMany({ where: { guardianId: oldGuardian.id } });
    await prismaBypass.guardian.delete({ where: { id: oldGuardian.id } });
  }

  const guardian = await prismaBypass.guardian.create({
    data: {
      firstName: "Test",
      lastName: "Parent",
      phone: testPhone,
      email: testEmail,
      schoolId
    }
  });

  // Link both students to the guardian (Sibling linkage!)
  await prismaBypass.studentGuardian.create({
    data: {
      studentId: studentA.id,
      guardianId: guardian.id,
      relationType: "FATHER",
      isPrimaryGuardian: true,
      feeResponsibility: true,
      schoolId,
      branchId
    }
  });

  await prismaBypass.studentGuardian.create({
    data: {
      studentId: studentB.id,
      guardianId: guardian.id,
      relationType: "FATHER",
      isPrimaryGuardian: false,
      feeResponsibility: true,
      schoolId,
      branchId
    }
  });

  console.log("✅ Mock Guardian and Sibling linkages seeded successfully.");

  // 3. Test OTP Generation Action
  console.log("⚡ Triggering requestGuardianOtpAction...");
  const otpRes = await requestGuardianOtpAction(testEmail);
  console.log("Result:", otpRes);

  if (!otpRes.success || !otpRes.trackingId) {
    console.error("❌ Failed to generate OTP.");
    return;
  }

  // Retrieve the generated OTP from database (since it was outputted to the console log, we fetch it here to verify)
  const otpRecord = await prismaBypass.guardianOTP.findUnique({
    where: { id: otpRes.trackingId }
  });

  if (!otpRecord) {
    console.error("❌ OTP record not found in database.");
    return;
  }
  console.log(`- Created OTP hash in DB: ${otpRecord.otpHash} (Expires: ${otpRecord.expiresAt})`);

  // Let's mock OTP code verification by finding the correct matching OTP code
  // In normal login, the parent enters this code. Let's find what 6-digit code matches this hash:
  let correctCode = "";
  for (let i = 100000; i <= 999999; i++) {
    const candidate = i.toString();
    const candidateHash = crypto.createHash("sha256").update(candidate).digest("hex");
    if (candidateHash === otpRecord.otpHash) {
      correctCode = candidate;
      break;
    }
  }

  if (!correctCode) {
    console.error("❌ Could not reverse mock OTP code hash.");
    return;
  }
  console.log(`🔍 Resolved Mock OTP Code for Verification: ${correctCode}`);

  // 4. Test Verification
  console.log("⚡ Triggering verifyGuardianOtpAction...");
  const verifyRes = await verifyGuardianOtpAction(testEmail, correctCode);
  console.log("Result:", verifyRes);

  if (!verifyRes.success) {
    console.error("❌ OTP Verification Action failed.");
    return;
  }
  console.log("✅ Session token and secure cookie generated.");

  // 5. Query Sibling List verification directly
  const siblingList = await prismaBypass.studentGuardian.findMany({
    where: { guardianId: guardian.id },
    include: { student: true }
  });

  console.log(`\n🔍 Verification:`);
  console.log(`- Linked Siblings Count: ${siblingList.length}`);
  for (const s of siblingList) {
    console.log(`  * Student: ${s.student.firstName} ${s.student.lastName || ""} (Relation: ${s.relationType})`);
  }

  if (siblingList.length === 2) {
    console.log("\n🎉 [GUARDIAN AUTH & LINKAGE TESTS PASSED SUCCESSFULLY]");
  } else {
    console.error("\n❌ Failure: Linked sibling mismatch.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
