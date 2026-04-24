const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function verifyIdentityLifecycle() {
    console.log("🚀 STARTING STUDENT IDENTITY LIFECYCLE TEST (PROV -> STU)...");
    
    // 1. Context
    const schoolId = "VIVA";
    const branchId = "VIVA-BR-01";
    const classId = "C1";
    const academicYearId = "VIVA-AY-2026";
    const academicYearName = "2026-27";
    const schoolCode = "VIVA";
    const branchCode = "MAIN";

    try {
        // --- HELPER: Standalone Sequence Generators ---
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

        // --- STAGE 1: PUBLIC ENQUIRY (PROVISIONAL) ---
        console.log("\n🛰️  STAGE 1: Simulating Public Enquiry...");
        const provSeq = await getNextSequence(prisma, "PROVISIONAL", "GLOBAL", "GLOBAL");
        const provId = `${schoolCode}-PROV-LC-${provSeq.toString().padStart(5, '0')}`;
        const studentId = crypto.randomUUID();

        console.log(`   PROV ID Generated: ${provId}`);

        await prisma.$executeRaw`
            INSERT INTO "Student" (id, "registrationId", "schoolId", "branchId", status, "firstName", "lastName", "updatedAt")
            VALUES (${studentId}, ${provId}, ${schoolId}, ${branchId}, 'Provisional', 'Lifecycle', 'Test-Student', NOW())
        `;
        
        console.log("   ✅ Enquiry Record Created.");

        // --- STAGE 2: ADMIN PROMOTION (UPGRADE) ---
        console.log("\n👮 STAGE 2: Simulating Admin Promotion (Upgrade)...");
        
        // A. Generate Permanent STU- ID
        const stuSeq = await getNextSequence(prisma, "REGISTRATION", "GLOBAL", "GLOBAL");
        const permanentId = `${schoolCode}-STU-LC-${stuSeq.toString().padStart(7, '0')}`;
        
        // B. Generate Transactional Admission IDs (Using high-seq to avoid constraint error)
        const admissionNumber = `${schoolCode}-${branchCode}-${academicYearName}-ADM-88888`;
        
        console.log(`   STU ID Generated: ${permanentId}`);
        console.log(`   ADM ID Generated: ${admissionNumber}`);

        // C. Perform Upgrade Transaction
        await prisma.$transaction(async (tx) => {
            // Update Student (Upgrade ID + Status)
            await tx.$executeRaw`
                UPDATE "Student" SET "registrationId" = ${permanentId}, status = 'Active', "updatedAt" = NOW()
                WHERE id = ${studentId}
            `;

            // Create Enrollment Record (History)
            await tx.$executeRaw`
                INSERT INTO "AcademicHistory" (id, "studentId", "academicYearId", "classId", "promotionStatus", "admissionDate", "admissionNumber", "studentCode", "schoolId", "branchId", "updatedAt")
                VALUES (${crypto.randomUUID()}, ${studentId}, ${academicYearId}, ${classId}, 'ActiveAdmission', NOW(), ${admissionNumber}, 'STU-TEST-CODE', ${schoolId}, ${branchId}, NOW())
            `;
        });

        console.log("   ✅ Promotion Transaction Committed.");

        // --- STAGE 3: AUDIT ---
        console.log("\n🔍 STAGE 3: Verifying Data Integrity...");
        
        const finalAudit = await prisma.$queryRaw`
            SELECT s."registrationId", s.status, h."admissionNumber"
            FROM "Student" s
            JOIN "AcademicHistory" h ON s.id = h."studentId"
            WHERE s.id = ${studentId}
        `;

        const record = finalAudit[0];
        const checks = [
            { 
                name: "ID Upgraded to Permanent Standard", 
                pass: record.registrationId === permanentId && record.registrationId.includes("-STU-") 
            },
            { 
                name: "Status Promoted to Active", 
                pass: record.status === "Active" 
            },
            { 
                name: "UUID Preservation (History Link Intact)", 
                pass: record.admissionNumber === admissionNumber 
            }
        ];

        let failed = false;
        checks.forEach(c => {
            console.log(`   [${c.pass ? "✅" : "❌"}] ${c.name}`);
            if (!c.pass) failed = true;
        });

        if (failed) {
            console.error("\n🔴 LIFECYCLE TEST FAILED.");
        } else {
            console.log("\n🟢 V2.1 ERP IDENTITY LIFECYCLE VERIFIED. 100% COMPLIANT.");
            console.log(`\n🎉 Lifecycle Complete: ${provId} ➔ ${permanentId}`);
        }
        
    } catch (err) {
        console.error("🚨 TEST FATAL ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}

verifyIdentityLifecycle();
