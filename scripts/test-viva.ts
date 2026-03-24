import { CounterService } from "../src/lib/services/counter-service";
import { IdGenerator } from "../src/lib/id-generator";
import prisma from "../src/lib/prisma";

async function provisionTestSchool() {
    console.log("🚀 [TEST] Starting Standalone Provisioning for School: VIVA");
    
    const data = {
        schoolName: "Virtue International V2",
        schoolCode: "VIVA",
        city: "Bangalore",
        adminName: "Vivek Vani",
        adminEmail: "vivek.vani@example.com",
        adminPhone: "9876543210"
    };

    try {
        const result = await prisma.$transaction(async (tx: any) => {
            // 1. School
            const school = await tx.school.create({
                data: {
                    id: data.schoolCode,
                    name: data.schoolName,
                    code: data.schoolCode,
                    email: data.adminEmail,
                    phone: data.adminPhone,
                    address: data.city,
                }
            });
            console.log("✅ School Created:", school.id);

            // 2. Branch
            const branch = await tx.branch.create({
                data: {
                    id: `${school.id}-BR-RCB`,
                    schoolId: school.id,
                    name: "Main Branch",
                    code: "RCB",
                    address: data.city
                }
            });
            console.log("✅ Branch Created:", branch.id);

            // 3. Admin Staff (The part that failed previously)
            const staffCode = await IdGenerator.generateStaffCode(school.id, school.code, "Owner/Partner", tx);
            console.log("✅ Generated Staff Code:", staffCode);

            const staff = await tx.staff.create({
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
            console.log("✅ Staff Record Created:", staff.id);

            // 4. Counters
            const counters = [
                { type: "ADMISSION", year: "2026-27", branch: branch.id },
                { type: "STUDENT", year: "2026-27", branch: "GLOBAL" },
                { type: "STAFF_OWN", year: "GLOBAL", branch: "GLOBAL" }
            ];

            for (const c of counters) {
                await tx.tenancyCounter.create({
                    data: {
                        schoolId: school.id,
                        branchId: c.branch,
                        type: c.type,
                        year: c.year,
                        lastValue: 0
                    }
                });
            }
            console.log("✅ Atomic Counters Initialized");

            return { schoolId: school.id };
        });

        console.log("🎉 [SUCCESS] Test School VIVA provisioned successfully.");
    } catch (e: any) {
        console.error("❌ [ERROR] Provisioning failed:", e.message);
        if (e.code === 'P2003') {
            console.error("DEBUG: Foreign key constraint failed. Check schoolId resolution.");
        }
    } finally {
        await prisma.$disconnect();
    }
}

provisionTestSchool();
