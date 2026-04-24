import { GenesisService } from "../src/lib/services/genesis-service";
import prisma from "../src/lib/prisma";

/**
 * 🕵️ SOVEREIGN PROVISIONING EXECUTION: VIVES (v2.1)
 * 
 * Bringing the 'Operational Stronghold' to Life.
 * simultaneously instantiating Data + Identity.
 */
async function executeProvisioning() {
    process.env.SKIP_TENANCY = 'true';
    const schoolId = 'VIVES';
    const templateId = 'STANDARD_K10_V1';
    const staffId = 'VIVES-HQ-OWNR-0001'; // Simulated Setup Trigger

    console.log(`🕵️ Starting 'Pure Genesis' (v2.1 Identity + Foundation) for ${schoolId}...`);

    try {
        const result = await GenesisService.instantiateSchool(
            schoolId, 
            templateId, 
            staffId,
            {
                firstName: "Vivek",
                lastName: "Vani",
                email: "vivek.vani@vives.dev",
                username: "vives_admin"
            }
        );

        if (result.success) {
            console.log("\n✅ PURE GENESIS SUCCESSFUL!");
            console.log(`Academic Year Created: ${result.academicYearId}`);
            console.log(`Sovereign Owner ID:   ${result.ownerId}`);
            
            // Verification of Counts
            const classCount = await prisma.class.count({ where: { source: templateId } });
            const feeCount = await prisma.feeComponentMaster.count({ where: { schoolId, source: templateId } });
            const ownerStatus = await prisma.staff.findUnique({ where: { id: result.ownerId } });
            
            console.log(`Installed Info:`);
            console.log(`- Classes:     ${classCount}`);
            console.log(`- Fee Masters: ${feeCount}`);
            console.log(`- Owner Roles: ${ownerStatus?.role}`);
            console.log(`- Owner Login: ${ownerStatus?.username}`);

        } else {
            console.error(`❌ PROVISIONING FAILED: ${result.error}`);
        }

    } catch (error) {
        console.error("❌ CRITICAL EXECUTION FAILURE:", error);
    } finally {
        await prisma.$disconnect();
    }
}

executeProvisioning();
