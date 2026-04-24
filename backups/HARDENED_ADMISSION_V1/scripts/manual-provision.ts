import { CounterService } from "../src/lib/services/counter-service";
import { IdGenerator } from "../src/lib/id-generator";
import prisma from "../src/lib/prisma";

async function manualProvision() {
    const data = {
        name: "Virtue Viva Academy",
        code: "VIVA",
        city: "Bangalore",
        adminName: "Vivek Vani",
        adminEmail: "vivek.viva@example.com",
        adminPhone: "9876543210"
    };

    console.log(`🚀 [MANUAL] Provisioning School: ${data.code}`);

    try {
        // 1. Clean up if exists
        await prisma.staff.deleteMany({ where: { schoolId: data.code } });
        await prisma.branch.deleteMany({ where: { schoolId: data.code } });
        await prisma.school.deleteMany({ where: { id: data.code } });
        console.log("✅ Cleanup complete.");

        // 2. School
        const school = await prisma.school.create({
            data: {
                id: data.code,
                name: data.name,
                code: data.code,
                email: data.adminEmail,
                phone: data.adminPhone,
                address: data.city
            }
        });
        console.log("✅ School VIVA created.");

        // 3. Branch
        const branch = await prisma.branch.create({
            data: {
                id: `${data.code}-BR-RCB`,
                schoolId: school.id,
                name: "Main Branch",
                code: "RCB",
                address: data.city
            }
        });
        console.log("✅ Branch RCB created.");

        // 4. Academic & Financial Years
        await prisma.academicYear.create({
            data: {
                id: `${data.code}-AY-2026-27`,
                name: "2026-27",
                startDate: new Date("2026-06-01"),
                endDate: new Date("2027-03-31"),
                isCurrent: true,
                schoolId: school.id
            }
        });
        await prisma.financialYear.create({
            data: {
                id: `${data.code}-FY-2026-27`,
                name: "2026-27",
                startDate: new Date("2026-04-01"),
                endDate: new Date("2027-03-31"),
                isCurrent: true,
                schoolId: school.id
            }
        });
        console.log("✅ Years initialized.");

        // 5. Atomic Counters (School-wide)
        const staffCode = await IdGenerator.generateStaffCode(school.id, school.code, "Owner/Partner");
        console.log("✅ Generated Staff Code:", staffCode);

        // 6. Admin Staff
        await prisma.staff.create({
            data: {
                staffCode: staffCode,
                firstName: "Vivek",
                lastName: "Vani",
                email: data.adminEmail,
                phone: data.adminPhone,
                schoolId: school.id,
                branchId: branch.id,
                role: "OWNER",
                status: "Active"
            }
        });
        console.log("✅ Admin Staff created.");

        // 7. Initialize other counters
        const counters = [
            { type: "ADMISSION", year: "2026-27", branchId: branch.id },
            { type: "RECEIPT", year: "2026-27", branchId: branch.id },
            { type: "STUDENT", year: "2026-27", branchId: "GLOBAL" }
        ];

        for (const c of counters) {
            await prisma.tenancyCounter.upsert({
                where: {
                    schoolId_branchId_type_year: {
                        schoolId: school.id,
                        branchId: c.branchId,
                        type: c.type,
                        year: c.year
                    }
                },
                update: {},
                create: {
                    schoolId: school.id,
                    branchId: c.branchId,
                    type: c.type,
                    year: c.year,
                    lastValue: 0
                }
            });
        }
        console.log("✅ All Counters synchronized.");

        console.log("🎉 SUCCESS: School VIVA is now operational.");
        console.log("CREDENTIALS:");
        console.log(`Email: ${data.adminEmail}`);
        console.log(`Pass: Virtue@VIVA (Placeholder)`);

    } catch (e: any) {
        console.error("❌ FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

manualProvision();
