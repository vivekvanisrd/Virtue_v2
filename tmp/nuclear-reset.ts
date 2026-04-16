import prisma from "../src/lib/prisma";

/**
 * ☢️ SOVEREIGN NUCLEAR RESET (v2.4)
 * 
 * Performance: PLATFORM GUARD (Day Zero)
 * Objective: Wipe all tenant data across all institutional models,
 * respecting Foreign Key constraints by deleting in correct order.
 */
async function executeNuclearReset() {
    console.log("☢️  INITIATING NUCLEAR RESET (In-Order Cascade)...");

    try {
        // We use sequential deletions to ensure FK constraints are respected.
        await prisma.$transaction(async (tx: any) => {
            console.log("- Cleaning child records and logs...");
            await tx.studentAttendance.deleteMany({});
            await tx.academicRecord.deleteMany({});
            await tx.academicHistory.deleteMany({});
            await tx.sovereignEvent.deleteMany({});
            await tx.financialAuditLog.deleteMany({});
            await tx.activityLog.deleteMany({});
            
            console.log("- Cleaning financial entities...");
            await tx.collection.deleteMany({});
            await tx.journalEntry.deleteMany({});
            await tx.chartOfAccount.deleteMany({});
            await tx.discount.deleteMany({});
            await tx.feeStructure.deleteMany({});
            await tx.feeComponentMaster.deleteMany({});

            console.log("- Cleaning primary tenant entities...");
            await tx.student.deleteMany({});
            await tx.staff.deleteMany({});
            await tx.academicYear.deleteMany({});
            await tx.class.deleteMany({});
            await tx.branch.deleteMany({});
            
            console.log("- Finalizing School wipe...");
            await tx.school.deleteMany({});
        });

        console.log("\n✅ NUCLEAR RESET COMPLETED SUCCESSFULLY.");
        console.log("Status: PLATFORM_GUARD survived. All Tenant data erased.");
        console.log("Action: Database is now a Pure Slate, ready for Genesis v2.3.");

    } catch (error) {
        console.error("❌ NUCLEAR RESET FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

executeNuclearReset();
