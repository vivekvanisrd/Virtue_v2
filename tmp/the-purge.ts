import prisma from "../src/lib/prisma";

/**
 * 🧹 THE SOVEREIGN PURGE (v1.1)
 * 
 * Cleaning 'VIVES' from non-compliant and partial data debris
 * to ensure a Pure Genesis (v2.1).
 */
async function executePurge() {
    const schoolId = 'VIVES';
    console.log(`🧹 Initiating The Purge for School: ${schoolId}...`);

    try {
        const result = await prisma.$transaction([
            // Wipe Academic Years for VIVES
            prisma.academicYear.deleteMany({ where: { schoolId } }),
            
            // Wipe Fee Component Masters for VIVES
            prisma.feeComponentMaster.deleteMany({ where: { schoolId } }),

            // Wipe Fee Structures for VIVES
            prisma.feeStructure.deleteMany({ where: { schoolId } }),

            // Wipe Sections and Classes
            prisma.section.deleteMany({ where: { isGenesis: true } }),
            prisma.class.deleteMany({ where: { isGenesis: true } }),

            // Wipe Staff records for VIVES (Primary Identity)
            prisma.staff.deleteMany({ where: { schoolId } }),
            
            // Note: In this schema, User model does not exist. 
            // Staff is the identity.
        ]);

        console.log(`✅ THE PURGE COMPLETED. Partial records wiped across modules.`);
    } catch (error) {
        console.error("❌ THE PURGE FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

executePurge();
