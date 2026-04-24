const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("🧪 VERIFYING GLOBAL ID SPEC (V1)...");

    const schoolCode = "TEST" + Math.floor(Math.random() * 900 + 100);
    const branchCode = "RCB";

    try {
        // 1. Create School
        const school = await prisma.school.create({
            data: {
                id: schoolCode,
                name: "Test Academy " + schoolCode,
                code: schoolCode
            }
        });
        console.log(`✅ School Created: ID=${school.id}, Code=${school.code}`);

        // 2. Create Branch (Standard Pattern)
        const branchId = `${school.id}-BR-${branchCode}`;
        const branch = await prisma.branch.create({
            data: {
                id: branchId,
                schoolId: school.id,
                name: "Main Branch",
                code: branchCode
            }
        });
        console.log(`✅ Branch Created: ID=${branch.id}, Code=${branch.code}`);

        // 3. Create Student (Spec 2.3)
        // Note: In real app, we'd use submitAdmissionAction, but here we test the model fields
        const studentCode = `${schoolCode}-STU-2026-0001`; // Mocked for field check
        const student = await prisma.student.create({
            data: {
                schoolId: school.id,
                firstName: "Test",
                lastName: "Student",
                admissionNumber: `${schoolCode}-ADM-2026-RCB-00001`,
                studentCode: studentCode,
                status: "Active"
            }
        });
        console.log(`✅ Student Created: studentCode=${student.studentCode}, admissionNumber=${student.admissionNumber}`);

        // 4. Create Staff (Spec 2.4)
        const staffCode = `${schoolCode}-USR-OWN-0001`;
        const staff = await prisma.staff.create({
            data: {
                schoolId: school.id,
                branchId: branch.id,
                firstName: "Admin",
                lastName: "User",
                staffCode: staffCode,
                status: "Active"
            }
        });
        console.log(`✅ Staff Created: staffCode=${staff.staffCode}`);

        console.log("\n✨ ALL MODELS VERIFIED: DB schema successfully supports the Global ID Spec.");

    } catch (error) {
        console.error("❌ VERIFICATION FAILED:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
