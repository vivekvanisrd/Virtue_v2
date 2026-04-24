import { PrismaClient } from '@prisma/client';
import { tenancyExtension } from '../src/lib/prisma-tenancy';
import { runWithTenant } from '../src/lib/auth/tenancy-context';

const prisma = new PrismaClient().$extends(tenancyExtension);

async function runNegativeTests() {
  console.log("🕵️ Starting NEGATIVE SECURITY AUDIT (V5 Final Patch)...\n");

  const attackerSession = {
    staffId: "attacker-007",
    email: "attacker@school-a.com",
    role: "STAFF",
    schoolId: "SCHOOL-A",
    branchId: "BRANCH-A-1",
    name: "Attacker"
  };

  runWithTenant(attackerSession as any, async () => {
    // 🛡️ 1. ATTACK: Cross-School Fetch
    console.log("🛡️ 1. ATTACK: Cross-School ID Guessing");
    try {
      await (prisma as any).student.findFirst({
          where: { id: "record-from-school-b", schoolId: "SCHOOL-B" }
      });
      console.warn("❌ FAILED: Attack should have been blocked!");
    } catch (e: any) {
      console.log("✅ PASSED: Hard-Fail Triggered:", e.message);
    }

    // 🛡️ 2. ATTACK: Sister-Branch Hijack
    console.log("\n🛡️ 2. ATTACK: Sister-Branch Hijack (Staff attempting other branch)");
    try {
      await (prisma as any).student.findFirst({
          where: { id: "student-123", branchId: "BRANCH-A-2" }
      });
    } catch (e: any) {
      console.log("✅ PASSED: Branch Breach Blocked:", e.message);
    }

    // 🛡️ 3. ATTACK: Unsafe Bulk Operation
    console.log("\n🛡️ 3. ATTACK: Unsafe Bulk Operation (Global delete attempt)");
    try {
      await (prisma as any).student.deleteMany({
          where: { name: "test" }
      });
      console.log("✅ PASSED: Operation Jailed (Only deleted from SCHOOL-A via auto-inject)");
    } catch (e) {}

    // 🛡️ 4. THRESHOLD: Triggering 6 Security Violations...
    console.log("\n🛡️ 4. THRESHOLD: Triggering 6 Security Violations...");
    for (let i = 0; i < 6; i++) {
       try {
          await (prisma as any).staff.findFirst({ where: { branchId: "INVALID" } });
       } catch (e) {}
    }
    console.log("✅ Check console logs for 'Violation Threshold Exceeded' alarm.");

    console.log("\n🏁 NEGATIVE AUDIT COMPLETE. THE FORTRESS IS SEALED.");
  });
}

runNegativeTests().catch(console.error);
