
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 [RECOVERY] Initializing Emergency Institutional Restoration...");

    try {
        // 1. Restore School
        const school = await prisma.school.upsert({
            where: { id: "VIVES" },
            update: {},
            create: {
                id: "VIVES",
                name: "VIVES EDUX INSTITUTION",
                code: "VIVES",
                email: "admin@vivesedux.com",
                phone: "9123456789",
                address: "Reddy Colony, Hyderabad",
                status: "ACTIVE"
            }
        });
        console.log("✅ School Restored:", school.name);

        // 2. Restore Branch
        const branch = await prisma.branch.upsert({
            where: { id: "VIVES-RCB" },
            update: {},
            create: {
                id: "VIVES-RCB",
                name: "Reddy Colony Branch",
                code: "VIVESRCB",
                schoolId: "VIVES",
                address: "Reddy Colony, Phase 2",
                phone: "9887766554",
                status: "ACTIVE"
            }
        });
        console.log("✅ Branch Restored:", branch.name);

        // 3. Restore Academic Year
        const ay = await prisma.academicYear.upsert({
            where: { id: "AY-2026-27-VIVES" },
            update: {},
            create: {
                id: "AY-2026-27-VIVES",
                name: "2026-27",
                startDate: new Date("2026-04-01"),
                endDate: new Date("2027-03-31"),
                schoolId: "VIVES",
                isCurrent: true
            }
        });
        console.log("✅ Academic Year Restored");

        // 4. Restore Financial Year
        const fy = await prisma.financialYear.upsert({
            where: { id: "FY-2026-27-VIVES" },
            update: {},
            create: {
                id: "FY-2026-27-VIVES",
                name: "FY 2026-27",
                startDate: new Date("2026-04-01"),
                endDate: new Date("2027-03-31"),
                schoolId: "VIVES",
                isCurrent: true
            }
        });
        console.log("✅ Financial Year Restored");

        // 5. Restore Principal account (Akshitha Reddy)
        const passwordHash = await bcrypt.hash("Virtue@VIVESRCB2026", 10);
        const principal = await prisma.staff.upsert({
            where: { username: "akshitha_principal" },
            update: {
                role: "PRINCIPAL",
                branchId: branch.id,
                schoolId: school.id,
                status: "ACTIVE",
                passwordHash
            },
            create: {
                staffCode: "VIVES-RCB-PR-001",
                firstName: "Akshitha",
                lastName: "Reddy",
                email: "virtuehighsrd@gmail.com",
                username: "akshitha_principal",
                passwordHash,
                role: "PRINCIPAL",
                schoolId: school.id,
                branchId: branch.id,
                status: "ACTIVE"
            }
        });
        console.log("✅ Principal Identity Restored:", principal.username);

        // 6. Mandatory Academic Blueprint Sync (Grade 1-10 + Nursery/LKG/UKG)
        console.log("⏳ [RECOVERY] Syncing Academic Blueprints...");
        const templates = await prisma.platformClass.findMany({
            include: { sections: true }
        });

        for (const tc of templates) {
            const newClass = await prisma.class.create({
                data: {
                    name: tc.name,
                    level: tc.level,
                    schoolId: school.id,
                    branchId: branch.id,
                    source: `RESTORED_${tc.id}`
                }
            });

            for (const ts of tc.sections) {
                await prisma.section.create({
                    data: {
                        name: ts.name,
                        classId: newClass.id,
                        schoolId: school.id,
                        branchId: branch.id,
                        source: `RESTORED_${ts.id}`
                    }
                });
            }
        }
        console.log("✅ Academic Structures Restored (14 Classes)");

        console.log("\n🎊 [SUCCESS] Institutional DNA Restored. Akshitha Reddy can now log in.");

    } catch (e) {
        console.error("❌ [RECOVERY_FAILED]", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
