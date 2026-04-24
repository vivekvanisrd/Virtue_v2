const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function createViva() {
    console.log("🚀 [JS-STANDALONE] Provisioning School: VIVA");

    const data = {
        id: "VIVA",
        name: "Virtue Viva Academy",
        city: "Bangalore",
        adminName: "Vivek Vani",
        adminEmail: "vivek.viva@example.com",
        adminPhone: "9876543210",
        tempPass: "Virtue@VIVA"
    };

    try {
        await prisma.$transaction(async (tx) => {
            // A. Cleanup
            console.log("🧹 Cleaning up old VIVA data...");
            await tx.staff.deleteMany({ where: { schoolId: data.id } });
            await tx.branch.deleteMany({ where: { schoolId: data.id } });
            await tx.tenancyCounter.deleteMany({ where: { schoolId: data.id } });
            await tx.academicYear.deleteMany({ where: { schoolId: data.id } });
            await tx.financialYear.deleteMany({ where: { schoolId: data.id } });
            await tx.school.deleteMany({ where: { id: data.id } });

            // B. School
            const school = await tx.school.create({
                data: {
                    id: data.id,
                    name: data.name,
                    code: data.id,
                    email: data.adminEmail,
                    phone: data.adminPhone,
                    address: data.city
                }
            });
            console.log("✅ School Created.");

            // C. Branch
            const branch = await tx.branch.create({
                data: {
                    id: `${data.id}-BR-01`,
                    schoolId: school.id,
                    name: "Main Campus",
                    code: "MAIN",
                    address: data.city
                }
            });
            console.log("✅ Branch Created.");

            // D. Academic Year
            await tx.academicYear.create({
                data: {
                    id: `${data.id}-AY-2026`,
                    name: "2026-27",
                    startDate: new Date("2026-06-01"),
                    endDate: new Date("2027-03-31"),
                    isCurrent: true,
                    schoolId: school.id
                }
            });
            console.log("✅ Academic Year Created.");

            // E. Atomic Staff Sequence (Internal logic)
            const type = "STAFF_OWN";
            const year = "GLOBAL";
            const branchId = "GLOBAL";

            // We do a direct create since we cleaned up
            const counter = await tx.tenancyCounter.create({
                data: {
                    schoolId: school.id,
                    branchId: branchId,
                    type: type,
                    year: year,
                    lastValue: 1
                }
            });
            
            const staffCode = `VIVA-USR-OWN-0001`;
            console.log("✅ Generated Staff Code:", staffCode);

            // F. Admin Staff
            await tx.staff.create({
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
            console.log("✅ Staff Record Created.");

            // G. Counters
            await tx.tenancyCounter.create({
                data: { schoolId: school.id, branchId: "GLOBAL", type: "STUDENT", year: "2026-27", lastValue: 0 }
            });
            await tx.tenancyCounter.create({
                data: { schoolId: school.id, branchId: branch.id, type: "ADMISSION", year: "2026-27", lastValue: 0 }
            });

            console.log("✅ All Counters Initialized.");
        });

        console.log("🎉 [SUCCESS] School VIVA is fully provisioned.");
        console.log("------------------------------------------");
        console.log("CREDS for Vivek Vani:");
        console.log(`Email: ${data.adminEmail}`);
        console.log(`Password: ${data.tempPass}`);
        console.log("------------------------------------------");

    } catch (e) {
        console.error("❌ [FAIL]:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

createViva();
