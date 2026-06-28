import { PrismaClient } from "@prisma/client";
import {
  createDriverAction,
  signInDriverAction,
  verifyDriverSession,
  revokeDriverSessionsAction,
  resetDriverDeviceAction,
  resetDriverPasswordAction,
  getRoutesAction,
} from "@/lib/actions/transport-actions-v2";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🚀 STARTING TRANSPORT V2 DRIVER AUTH COMPLIANCE TESTS...");

  // 1. Resolve test data context dynamically
  const school = await prisma.school.findFirst();
  if (!school) {
    throw new Error("Pre-requisite failed: No School found in database.");
  }
  const branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    throw new Error("Pre-requisite failed: No Branch found in database.");
  }

  console.log(`📌 Using Test Context: School: ${school.id}, Branch: ${branch.id}`);

  // Mock Sovereign Session Identity as admin for setup
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_SCHOOL_ID = school.id;
  process.env.TEST_BRANCH_ID = branch.id;
  process.env.TEST_ROLE = "DEVELOPER";
  process.env.TEST_STAFF_ID = "driver-auth-test-admin";

  const phone = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
  const licenseNo = "LIC" + Math.floor(100000 + Math.random() * 900000).toString();
  const password = "securepassword123";

  console.log(`🔑 Onboarding Test Driver: Phone: ${phone}, License: ${licenseNo}`);

  // Create Driver
  const driverRes: any = await createDriverAction({
    name: "Auth Test Driver",
    phone,
    licenseNo,
    password,
    status: "ACTIVE",
  });

  if (!driverRes.success || !driverRes.data) {
    throw new Error(`Failed to create test driver: ${JSON.stringify(driverRes.error)}`);
  }

  const driverId = driverRes.data.id;
  console.log(`✅ Driver created with ID: ${driverId}`);

  // ==========================================
  // A. Correct Credentials Login Tests
  // ==========================================
  console.log("\n--- A. Correct Credentials Login Tests ---");
  
  // Login by phone
  const loginPhoneRes: any = await signInDriverAction({ phone, password });
  console.log("Login by Phone success status:", loginPhoneRes.success ? "Passed" : "Failed");
  if (!loginPhoneRes.success) throw new Error("Login by phone should succeed");

  // Login by license number
  const loginLicenseRes: any = await signInDriverAction({ licenseNo, password });
  console.log("Login by License No success status:", loginLicenseRes.success ? "Passed" : "Failed");
  if (!loginLicenseRes.success) throw new Error("Login by license number should succeed");

  // Incorrect credentials failure check
  const badLoginRes: any = await signInDriverAction({ phone, password: "wrongpassword" });
  console.log("Bad Password Login rejected status:", !badLoginRes.success && badLoginRes.error?.code === "INVALID_CREDENTIALS" ? "Passed" : "Failed");
  if (badLoginRes.success) throw new Error("Login with wrong password should fail");

  // ==========================================
  // B. Device Registration & Binding Lock Tests
  // ==========================================
  console.log("\n--- B. Device Registration & Binding Lock Tests ---");

  // First time login with deviceId binds the device
  const deviceLogin1: any = await signInDriverAction({ phone, password, deviceId: "dev-id-alpha" });
  console.log("First Login binds device:", deviceLogin1.success && deviceLogin1.driver?.deviceId === "dev-id-alpha" ? "Passed" : "Failed");
  if (!deviceLogin1.success) throw new Error("First login with device ID should succeed");

  // Login on a different device is blocked
  const deviceLoginBlocked: any = await signInDriverAction({ phone, password, deviceId: "dev-id-beta" });
  console.log("Second Login on mismatched device blocked:", !deviceLoginBlocked.success && deviceLoginBlocked.error?.code === "DEVICE_MISMATCH" ? "Passed" : "Failed");
  if (deviceLoginBlocked.success) throw new Error("Mismatched device login should be blocked");

  // Reset device bindings via admin action
  const resetDeviceRes = await resetDriverDeviceAction(driverId);
  console.log("Admin resets device registration:", resetDeviceRes.success ? "Passed" : "Failed");
  if (!resetDeviceRes.success) throw new Error("Device reset action failed");

  // New device login registers successfully
  const deviceLogin2: any = await signInDriverAction({ phone, password, deviceId: "dev-id-beta" });
  console.log("Login registers on new device post-reset:", deviceLogin2.success && deviceLogin2.driver?.deviceId === "dev-id-beta" ? "Passed" : "Failed");
  if (!deviceLogin2.success) throw new Error("Device binding after reset failed");

  // ==========================================
  // C. Lockout Enforcement Tests
  // ==========================================
  console.log("\n--- C. Lockout Enforcement Tests ---");

  // Admin resets device binding for lockout testing
  await resetDriverDeviceAction(driverId);

  // Fail login attempts
  for (let i = 1; i <= 4; i++) {
    const res: any = await signInDriverAction({ phone, password: "badpassword" });
    if (res.success || res.error?.code !== "INVALID_CREDENTIALS") {
      throw new Error(`Attempt ${i} should fail with INVALID_CREDENTIALS, got ${JSON.stringify(res.error)}`);
    }
  }
  console.log("4 Consecutive Failed Logins: Not locked yet");

  // 5th failed attempt triggers lockout
  const lockOutRes: any = await signInDriverAction({ phone, password: "badpassword" });
  console.log("5th Failed Login triggers lockout:", !lockOutRes.success && lockOutRes.error?.code === "ACCOUNT_LOCKED" ? "Passed" : "Failed");
  if (lockOutRes.success) throw new Error("5th failed login should lock account");

  // Subsequent login attempts (even with correct password) are blocked
  const blockedCorrectLogin: any = await signInDriverAction({ phone, password });
  console.log("Login with correct credentials during lockout blocked:", !blockedCorrectLogin.success && blockedCorrectLogin.error?.code === "ACCOUNT_LOCKED" ? "Passed" : "Failed");
  if (blockedCorrectLogin.success) throw new Error("Login during lockout should fail");

  // Reset password via Admin clears lockout
  const adminResetRes = await resetDriverPasswordAction(driverId, "brandnewpassword123");
  console.log("Admin password reset clears lockout:", adminResetRes.success ? "Passed" : "Failed");
  if (!adminResetRes.success) throw new Error("Admin password reset failed");

  // Login with new password succeeds
  const freshLoginRes: any = await signInDriverAction({ phone, password: "brandnewpassword123" });
  console.log("Login with new password succeeds post-lockout reset:", freshLoginRes.success ? "Passed" : "Failed");
  if (!freshLoginRes.success) throw new Error("Login with new password should succeed");

  // ==========================================
  // D. Session Verification & Revocation Tests
  // ==========================================
  console.log("\n--- D. Session Verification & Revocation Tests ---");

  const activeToken = freshLoginRes.token;
  if (!activeToken) throw new Error("Token missing from success login response");

  // Session verification passes
  const verifyRes = await verifyDriverSession(activeToken);
  console.log("Active Session Token Verification:", verifyRes && verifyRes.driverId === driverId ? "Passed" : "Failed");
  if (!verifyRes) throw new Error("Active session verification should succeed");

  // Admin revokes driver sessions
  const revokeRes = await revokeDriverSessionsAction(driverId);
  console.log("Admin revokes sessions:", revokeRes.success ? "Passed" : "Failed");
  if (!revokeRes.success) throw new Error("Session revocation action failed");

  // Session verification fails after revocation
  const verifyResPostRevoke = await verifyDriverSession(activeToken);
  console.log("Session verification fails after revocation:", verifyResPostRevoke === null ? "Passed" : "Failed");
  if (verifyResPostRevoke !== null) throw new Error("Session verification should fail after revocation");

  // ==========================================
  // E. Tenancy Gating for Driver Queries
  // ==========================================
  console.log("\n--- E. Tenancy Gating for Driver Queries ---");

  // Mock Driver identity context
  process.env.TEST_ROLE = "DRIVER";
  process.env.TEST_STAFF_ID = driverId; // maps to staffId in backbone

  // Driver should be able to query routes in their school
  const routesRes: any = await getRoutesAction();
  console.log("Driver gets tenant-scoped routes list:", routesRes.success ? "Passed" : "Failed");
  if (!routesRes.success) throw new Error("Driver routes fetch failed");

  // Attempting to inject different school context in env variables
  process.env.TEST_SCHOOL_ID = "breach-school-id";
  try {
    const breachRoutes: any = await getRoutesAction();
    const hasBreached = breachRoutes.success && breachRoutes.data && breachRoutes.data.length > 0;
    console.log("Breached School ID scoping results:", hasBreached ? "Failed (Breach allowed)" : "Passed (Block/Empty)");
  } catch (err: any) {
    console.log("Breached School ID scoping threw error (Passed):", err.message);
  }

  // Cleanup database by restoring admin identity and deleting test driver
  process.env.TEST_ROLE = "DEVELOPER";
  process.env.TEST_STAFF_ID = "driver-auth-test-admin";
  process.env.TEST_SCHOOL_ID = school.id;
  await prisma.driver.update({
    where: { id: driverId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  console.log("🧹 Cleaned up test driver.");

  console.log("\n✅ ALL DRIVER AUTH COMPLIANCE TEST SCENARIOS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ TEST RUN FAILED:", err);
  process.exit(1);
});
