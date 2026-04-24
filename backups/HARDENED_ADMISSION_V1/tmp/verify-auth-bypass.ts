import prisma from "../src/lib/prisma";

/**
 * 🕵️ AUTH BYPASS VERIFICATION
 * Verifies that PlatformAdmin can be accessed for credential checks.
 */
async function verifyAuthBypass() {
    console.log("🕵️ INITIATING AUTH BYPASS VERIFICATION...");

    try {
        // 🔒 TEST 1: Direct access (SHOULD FAIL SHUT without session)
        console.log("🧪 TEST 1: Direct PlatformAdmin Access...");
        try {
            await prisma.platformAdmin.findFirst();
            console.warn("⚠️ TEST 1 FAILED: Access allowed without session (SECURITY_LEAK)");
        } catch (e: any) {
            console.log(`✅ TEST 1 PASSED: Access blocked correctly: ${e.message}`);
        }

        // 🔑 TEST 2: Bypass access (SHOULD SUCCEED for login flow)
        console.log("\n🧪 TEST 2: Bypassed PlatformAdmin Access...");
        const originalSkip = process.env.SKIP_TENANCY;
        process.env.SKIP_TENANCY = 'true';
        try {
            const admin = await prisma.platformAdmin.findFirst();
            console.log("✅ TEST 2 PASSED: Credential verification access granted.");
        } finally {
            process.env.SKIP_TENANCY = originalSkip;
        }

    } catch (e: any) {
        console.error("❌ VERIFICATION CRASHED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyAuthBypass();
