import prisma from "../src/lib/prisma";

async function probe() {
    process.env.SKIP_TENANCY = 'true';
    console.log("🧪 PROBING FEE COMPONENT CREATION...");

    try {
        await prisma.$transaction(async (tx) => {
            // Step 1: Create School
            await tx.school.create({
                data: {
                    id: 'PROBE',
                    name: 'Probe School',
                    code: 'PRB'
                }
            });
            console.log("✅ School created.");

            // Step 2: Create ONE Fee Component
            await tx.feeComponentMaster.create({
                data: {
                    schoolId: 'PROBE',
                    name: 'Tuition Fee',
                    type: 'CORE'
                }
            });
            console.log("✅ Fee Component created.");
        });
        console.log("🎉 PROBE SUCCESSFUL! No inherent structural failure.");
    } catch (e: any) {
        console.error("❌ PROBE FAILED:", e);
    } finally {
        await prisma.$disconnect();
    }
}

probe();
