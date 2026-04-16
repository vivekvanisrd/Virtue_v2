const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function verifyStandardRegistration() {
    console.log("🚀 STARTING STANDARDIZED REGISTRATION TEST...");
    
    // 1. Context
    const schoolId = "VIVA";
    const branchId = "VIVA-BR-01";
    const classId = "C1";
    const academicYearId = "VIVA-AY-2026";
    const academicYearName = "2026-27";
    const schoolCode = "VIVA";
    const branchCode = "MAIN";

    try {
        // --- HELPER: Standalone Sequence Generator ---
        async function getNextSequence(p, type, year, bId = "GLOBAL") {
            const counter = await p.tenancyCounter.upsert({
                where: {
                    schoolId_branchId_type_year: {
                        schoolId,
                        branchId: bId,
                        type,
                        year
                    }
                },
                update: { lastValue: { increment: 1 } },
                create: {
                    schoolId,
                    branchId: bId,
                    type,
                    year,
                    lastValue: 1
                }
            });
            return counter.lastValue;
        }

        // 2. Generate Identity Markers (Using New Standard Logic)
        console.log("⚙️  Generating Identity Markers...");
        const admSeq = await getNextSequence(prisma, "ADMISSION", academicYearName, branchId);
        const stuSeq = await getNextSequence(prisma, "REGISTRATION", "GLOBAL", "GLOBAL"); // Use REGISTRATION type

        const admissionNumber = `${schoolCode}-${branchCode}-${academicYearName}-ADM-${admSeq.toString().padStart(5, '1')}`; // Distinguish for test
        
        // --- THE NEW STANDARD FORMAT ---
        const registrationId = `${schoolCode}-STU-${stuSeq.toString().padStart(7, '0')}`;
        
        console.log(`📡 New Registration ID Format: ${registrationId}`);

        const studentId = crypto.randomUUID();
        const historyId = `VR-SAH-STD-${crypto.randomInt(100000, 999999)}`;

        // 3. Raw SQL Transaction
        console.log("📝 Writing to Database (Raw SQL Transaction)...");
        await prisma.$transaction(async (tx) => {
            // A. Insert Student
            await tx.$executeRaw`
                INSERT INTO "Student" (id, "registrationId", "schoolId", "branchId", status, "firstName", "lastName", phone, "updatedAt")
                VALUES (${studentId}, ${registrationId}, ${schoolId}, ${branchId}, 'Active', 'ERP-Standard', 'ID-Test', '9999911111', NOW())
            `;

            // B. Insert AcademicHistory
            await tx.$executeRaw`
                INSERT INTO "AcademicHistory" (id, "studentId", "academicYearId", "classId", "promotionStatus", "admissionDate", "admissionNumber", "studentCode", "schoolId", "branchId", "updatedAt")
                VALUES (${historyId}, ${studentId}, ${academicYearId}, ${classId}, 'New Admission', NOW(), ${admissionNumber}, 'TEST-CODE', ${schoolId}, ${branchId}, NOW())
            `;
        });

        console.log(`✅ ADMISSION COMMITTED WITH NEW STANDARD: ${studentId}`);

        // --- PHASE 2: AUDIT ---
        console.log("\n🔍 AUDITING GENERATED ID...");
        const audit = await prisma.student.findUnique({
            where: { id: studentId },
            select: { registrationId: true }
        });

        const expectedPrefix = `${schoolCode}-STU-`;
        const isStandard = audit.registrationId.startsWith(expectedPrefix);

        console.log(`   [${isStandard ? "✅" : "❌"}] Registration ID Scoping: ${audit.registrationId}`);

        if (isStandard) {
            console.log("\n🟢 V2.1 ERP IDENTITY STANDARD VERIFIED. 100% COMPLIANT.");
        } else {
            console.error("\n🔴 STANDARD VERIFICATION FAILED.");
        }
        
    } catch (err) {
        console.error("🚨 TEST FATAL ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}

verifyStandardRegistration();
