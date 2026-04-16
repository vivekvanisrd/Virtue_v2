import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runFoundationGenesis() {
    process.env.SKIP_TENANCY = 'true';
    console.log("🏛️  PaVa-EDUX: COMMENCING VIVES FOUNDATION GENESIS (2026-27)...\n");

    const schoolId = "VIVES";
    const sessionName = "2026-27";
    const startDate = new Date("2026-04-01T00:00:00Z");
    const endDate = new Date("2027-03-31T23:59:59Z");

    try {
        await prisma.$transaction(async (tx) => {
            // 1. GLOBAL BLUEPRINT: CLASSES
            console.log("[1/3] PROVISIONING GLOBAL CLASS MASTER...");
            const classLevels = [
                { id: "PRE-KG", name: "Pre-KG", level: -2 },
                { id: "LKG", name: "LKG", level: -1 },
                { id: "UKG", name: "UKG", level: 0 },
                { id: "CLASS-1", name: "Class 1", level: 1 },
                { id: "CLASS-2", name: "Class 2", level: 2 },
                { id: "CLASS-3", name: "Class 3", level: 3 },
                { id: "CLASS-4", name: "Class 4", level: 4 },
                { id: "CLASS-5", name: "Class 5", level: 5 },
                { id: "CLASS-6", name: "Class 6", level: 6 },
                { id: "CLASS-7", name: "Class 7", level: 7 },
                { id: "CLASS-8", name: "Class 8", level: 8 },
                { id: "CLASS-9", name: "Class 9", level: 9 },
                { id: "CLASS-10", name: "Class 10", level: 10 },
            ];

            for (const cls of classLevels) {
                await tx.class.upsert({
                    where: { id: cls.id },
                    update: {},
                    create: { id: cls.id, name: cls.name, level: cls.level }
                });
            }
            console.log(`✅ ${classLevels.length} Classes synchronized in Global Blueprint.`);

            // 2. SESSION INITIALIZATION
            console.log("[2/3] INITIALIZING SOVEREIGN SESSIONS (VIVES)...");
            
            await tx.academicYear.upsert({
                where: { id: `${schoolId}-${sessionName}` },
                update: { isCurrent: true },
                create: {
                    id: `${schoolId}-${sessionName}`,
                    name: sessionName,
                    startDate,
                    endDate,
                    isCurrent: true,
                    schoolId
                }
            });

            await tx.financialYear.upsert({
                where: { id: `${schoolId}-FY-${sessionName}` },
                update: { isCurrent: true },
                create: {
                    id: `${schoolId}-FY-${sessionName}`,
                    name: `FY ${sessionName}`,
                    startDate,
                    endDate,
                    isCurrent: true,
                    schoolId
                }
            });
            console.log(`✅ Academic & Financial Years provisioned for ${schoolId}.`);

            // 3. FINANCIAL MASTER (PHASE 4: DOUBLE-ENTRY SENTINEL)
            console.log("[3/3] PROVISIONING SOVEREIGN FEE COMPONENTS...");
            const feeComponents = [
                { name: "Admission Fee", type: "CORE", isOneTime: true, isRefundable: false },
                { name: "Tuition Fee", type: "CORE", isOneTime: false, isRefundable: false },
                { name: "Library & Lab Fee", type: "ANCILLARY", isOneTime: false, isRefundable: false },
                { name: "Sports & Culturals", type: "ANCILLARY", isOneTime: false, isRefundable: false },
                { name: "Transport Fee", type: "ANCILLARY", isOneTime: false, isRefundable: false },
                { name: "Caution Deposit", type: "DEPOSIT", isOneTime: true, isRefundable: true },
            ];

            for (const comp of feeComponents) {
                await tx.feeComponentMaster.upsert({
                    where: { schoolId_name: { schoolId, name: comp.name } },
                    update: {},
                    create: {
                        schoolId,
                        name: comp.name,
                        type: comp.type,
                        isOneTime: comp.isOneTime,
                        isRefundable: comp.isRefundable
                    }
                });
            }
            console.log(`✅ ${feeComponents.length} Fee Master components anchored to VIVES.`);
        }, {
            timeout: 60000 // 60 seconds
        });

        console.log("\n🚀 VIVES FOUNDATION GENESIS COMPLETE.");
        console.log(`PaVa-EDUX is now operational for ${schoolId} session ${sessionName}.`);
    } catch (e: any) {
        console.error("❌ GENESIS FAILED:", e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

runFoundationGenesis();
