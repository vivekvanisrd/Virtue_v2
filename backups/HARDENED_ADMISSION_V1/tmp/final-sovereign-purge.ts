import prisma from "../src/lib/prisma";

/**
 * 🚮 NUCLEAR PURGE (v2.5)
 * Wipes all data to provide a clean slate for the new Onboarding UI.
 */
async function nuclearPurge() {
    process.env.SKIP_TENANCY = 'true';
    console.log("🚮 INITIATING FINAL SOVEREIGN PURGE...");

    try {
        // Atomic wipe of all school-linked entities
        await (prisma as any).$transaction([
            prisma.studentAttendance.deleteMany({}),
            prisma.studentFeeComponent.deleteMany({}),
            prisma.student.deleteMany({}),
            prisma.section.deleteMany({}), // 🔒 Decouple Sections first
            prisma.staff.deleteMany({}),
            prisma.class.deleteMany({}),
            prisma.branch.deleteMany({}),
            prisma.feeComponentMaster.deleteMany({}),
            prisma.academicYear.deleteMany({}),
            prisma.school.deleteMany({}),
        ]);

        console.log("✅ REGISTRY WIPED. 0% NODES ACTIVE.");
    } catch (e: any) {
        console.error("❌ PURGE FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

nuclearPurge();
