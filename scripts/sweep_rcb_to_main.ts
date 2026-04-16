import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_BRANCH = "RCB";
const TARGET_BRANCH = "VIVA-BR-01"; // Main Campus
const SCHOOL_ID = "VIVA";

async function main() {
    console.log(`\n🚀 [HARENDED MIGRATION] Moving ${SOURCE_BRANCH} -> ${TARGET_BRANCH}\n`);

    try {
        await prisma.$transaction(async (tx) => {
            // 1. STAFF MOVE
            const staff = await tx.staff.findMany({ where: { branchId: SOURCE_BRANCH } });
            console.log(`📦 Staff: Moving ${staff.length} records...`);
            for (const s of staff) {
                let newCode = s.staffCode.replace("-RCB-", "-MAIN-");
                
                // Collision Check
                const exists = await tx.staff.findFirst({
                    where: { branchId: TARGET_BRANCH, staffCode: newCode }
                });
                if (exists) {
                    newCode = newCode.replace("-MAIN-", "-MAIN-OLD-");
                    console.warn(`      Collision detected for staff ${s.staffCode}. Renamed to ${newCode}`);
                }

                await tx.staff.update({
                    where: { id: s.id },
                    data: { branchId: TARGET_BRANCH, staffCode: newCode }
                });
            }

            // 2. STUDENT MOVE
            const students = await tx.student.findMany({ where: { branchId: SOURCE_BRANCH } });
            console.log(`📦 Students: Moving ${students.length} records...`);
            for (const stu of students) {
                let newCode = stu.studentCode?.replace("-RCB-", "-MAIN-") || null;
                
                if (newCode) {
                    const exists = await tx.student.findFirst({
                        where: { branchId: TARGET_BRANCH, studentCode: newCode, schoolId: SCHOOL_ID }
                    });
                    if (exists) {
                        newCode = newCode.replace("-MAIN-", "-MAIN-OLD-");
                        console.warn(`      Collision detected for student ${stu.studentCode}. Renamed to ${newCode}`);
                    }
                }

                await tx.student.update({
                    where: { id: stu.id },
                    data: { branchId: TARGET_BRANCH, studentCode: newCode }
                });
            }

            // 3. MOVE ALL OTHER DEPENDENTS
            await tx.academicRecord.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });
            await tx.academicHistory.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });
            await tx.collection.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });
            await tx.chartOfAccount.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });
            await tx.feeStructure.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });
            await tx.tenancyCounter.updateMany({ where: { branchId: SOURCE_BRANCH }, data: { branchId: TARGET_BRANCH } });

            // 4. CLEANUP BRANCH
            console.log(`\n🛠️ Deleting Branch ID: ${SOURCE_BRANCH}...`);
            await tx.branch.delete({ where: { id: SOURCE_BRANCH } });

            // 5. RESET COUNTERS
            await tx.tenancyCounter.updateMany({
                where: { schoolId: SCHOOL_ID, type: 'BRANCH_BR' },
                data: { lastValue: 1 }
            });

            console.log("\n✅ TRANSACTION SUCCESSFUL");
        }, {
            timeout: 60000 // 60 seconds
        });

        console.log("\n=== Registry Reset for VIVA Complete ===\n");

    } catch (error: any) {
        console.error("\n❌ [MIGRATION FAILED]");
        console.error("Error Detail:", error.message || error);
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
