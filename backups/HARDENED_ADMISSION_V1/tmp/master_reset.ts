
import { PrismaClient } from '@prisma/client';
import { CounterService } from '../src/lib/services/counter-service';

const prisma = new PrismaClient();

async function masterReset() {
    console.log("🚀 STARTING GLOBAL IDENTITY RESET (CLEAN SLATE)");

    try {
        // 1. Reset all counters to start fresh at 001
        console.log("Cleaning up all sequence counters...");
        await prisma.tenancyCounter.deleteMany({});

        // 2. Global Sanitization: Clear ALL IDs using Raw SQL to bypass compound unique constraints
        console.log("Global Sanitization: Clearing ALL unique identifiers using Raw SQL...");
        await prisma.$executeRawUnsafe(`UPDATE "Student" SET "registrationId" = NULL, "admissionNumber" = NULL, "studentCode" = NULL`);
        await prisma.$executeRawUnsafe(`UPDATE "AcademicHistory" SET "admissionNumber" = NULL, "studentCode" = NULL`);
        await prisma.$executeRawUnsafe(`UPDATE "Staff" SET "staffCode" = 'TEMP-' || "id"`);

        // 3. Resolve Schools and Branches
        const branches = await prisma.branch.findMany({
            include: { school: true }
        });

        const currentAY = "2026-27"; // Standardizing for the reset

        for (const branch of branches) {
            console.log(`\n🏢 Processing Branch: ${branch.name} (${branch.code})`);

            // 3. Clear existing IDs to allow re-generation without unique constraints
            console.log("   - Sanitizing existing IDs...");
            await prisma.student.updateMany({
                where: { branchId: branch.id },
                data: {
                    registrationId: null,
                    admissionNumber: null,
                    studentCode: null
                }
            });

            // 4. Reset Students
            const students = await prisma.student.findMany({
                where: { branchId: branch.id }
            });

            console.log(`   - Found ${students.length} students. Re-generating identities...`);

            for (const student of students) {
                // Determine if they were provisional
                const isProv = student.status === "Provisional";

                const newRegId = isProv 
                    ? await CounterService.generateProvisionalId({
                        schoolId: branch.schoolId,
                        schoolCode: branch.school.code,
                        branchId: branch.id,
                        branchCode: branch.code
                    }, prisma)
                    : await CounterService.generateRegistrationId({
                        schoolId: branch.schoolId,
                        schoolCode: branch.school.code,
                        branchId: branch.id,
                        branchCode: branch.code
                    }, prisma);

                const newAdmNo = await CounterService.generateAdmissionNumber({
                    schoolId: branch.schoolId,
                    schoolCode: branch.school.code,
                    branchId: branch.id,
                    branchCode: branch.code,
                    year: currentAY
                }, prisma);

                // Update the student with the fresh IDs
                await prisma.student.update({
                    where: { id: student.id },
                    data: {
                        registrationId: newRegId,
                        admissionNumber: newAdmNo,
                        studentCode: newAdmNo,
                    }
                });

                // Also update the latest AcademicHistory to match
                await prisma.academicHistory.updateMany({
                    where: { studentId: student.id },
                    data: {
                        admissionNumber: newAdmNo,
                        studentCode: newAdmNo,
                        branchId: branch.id,
                        schoolId: branch.schoolId
                    }
                });
            }

            // 4. Reset Staff
            const staffMembers = await prisma.staff.findMany({
                where: { branchId: branch.id }
            });

            console.log(`   - Found ${staffMembers.length} staff. Re-generating codes...`);

            for (const member of staffMembers) {
                const newStaffCode = await CounterService.generateStaffCode({
                    schoolId: branch.schoolId,
                    schoolCode: branch.school.code,
                    branchId: branch.id,
                    branchCode: branch.code,
                    role: member.role || "STAFF"
                }, prisma);

                await prisma.staff.update({
                    where: { id: member.id },
                    data: { staffCode: newStaffCode }
                });
            }
        }

        console.log("\n✅ GLOBAL IDENTITY RESET COMPLETE. All dummy records are now standardized.");

    } catch (error) {
        console.error("❌ MASTER RESET FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

masterReset();
