import prisma from "../src/lib/prisma";

async function deepInventory() {
    const schoolId = 'VIVES';
    console.log(`🕵️ Performing Forensic Inventory for School: ${schoolId}...\n`);

    // Fetch the school root
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        include: {
            _count: {
                select: {
                    branches: true,
                    academicYears: true,
                    staff: true,
                    feeComponents: true,
                    feeStructures: true,
                    finRecords: true,
                    academicRecs: true,
                    activityLogs: true,
                    SovereignEvent: true,
                    accounts: true,
                    collections: true,
                }
            }
        }
    });

    if (!school) {
        console.error(`❌ [CRITICAL] School with ID '${schoolId}' NOT FOUND in database.`);
        process.exit(1);
    }

    console.log(`🏛️  Identity: ${school.name} (${school.code})`);
    console.log(`📍  Address: ${school.address || "NOT SET"}`);
    console.log(`📞  Phone: ${school.phone || "NOT SET"}`);
    console.log(`🏗️  DNA Version: ${school.dnaVersion}\n`);

    const counts = school._count;
    const summary = [
        { Module: "🏢 Branches", Count: counts.branches },
        { Module: "📅 Academic Years", Count: counts.academicYears },
        { Module: "👥 Staff Members", Count: counts.staff },
        { Module: "🧪 Fee Components", Count: counts.feeComponents },
        { Module: "📑 Fee Templates", Count: counts.feeStructures },
        { Module: "💰 Financial Records", Count: counts.finRecords },
        { Module: "🎓 Academic Enrollments", Count: counts.academicRecs },
        { Module: "📦 Ledger Accounts", Count: counts.accounts },
        { Module: "🧾 Fee Collections", Count: counts.collections },
        { Module: "📡 Sovereign Events", Count: counts.SovereignEvent },
        { Module: "📜 Forensic Logs", Count: counts.activityLogs },
    ];

    console.table(summary);

    // Deep check for Students (calculated via finRecords since they are many-to-one sometimes)
    const studentCount = await prisma.student.count({ where: { schoolId } });
    console.log(`\n👨‍🎓 Total Students Registered: ${studentCount}`);

    if (studentCount === 0 && counts.staff <= 1) {
        console.log("\n⚠️  [INVENTORY_RESULT] GHOST TOWN DETECTED.");
        console.log("The school exists as a definition, but no operational 'Life' (Students/Staff) exists yet.");
    } else {
        console.log("\n✅ [INVENTORY_RESULT] OPERATIONAL INSTANCE DETECTED.");
    }

    await prisma.$disconnect();
}

deepInventory();
