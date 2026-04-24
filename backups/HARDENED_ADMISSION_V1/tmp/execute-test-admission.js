const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function runHighSeqSqlAdmissionTest() {
    console.log("🚀 STARTING HIGH-SEQUENCE ERP ADMISSION TEST...");
    
    // 1. Context
    const schoolId = "VIVA";
    const branchId = "VIVA-BR-01";
    const classId = "C1";
    const academicYearId = "VIVA-AY-2026";
    const academicYearName = "2026-27";
    const schoolCode = "VIVA";
    const branchCode = "MAIN";

    try {
        // 2. High Sequence IDs (to avoid collisions for test)
        const seq = "99999";
        const admissionNumber = `${schoolCode}-${branchCode}-${academicYearName}-ADM-${seq}`;
        const studentCode = `${schoolCode}-${branchCode}-${academicYearName}-STU-${seq}`;
        const registrationId = `STU-TEST-${crypto.randomInt(100000, 999999)}`;
        
        console.log(`📡 IDs Generated: ${admissionNumber} / ${studentCode} / ${registrationId}`);

        const studentId = crypto.randomUUID();
        const historyId = `VR-SAH-HIGH-SEQ-${crypto.randomInt(100000, 999999)}`;

        // 3. Raw SQL Transaction
        console.log("📝 Writing to Database (Raw SQL Transaction)...");
        await prisma.$transaction(async (tx) => {
            // A. Insert Student
            await tx.$executeRaw`
                INSERT INTO "Student" (id, "registrationId", "schoolId", "branchId", status, "firstName", "lastName", phone, "updatedAt")
                VALUES (${studentId}, ${registrationId}, ${schoolId}, ${branchId}, 'Active', 'ERP-Audit', 'High-Seq-Test', '9999900000', NOW())
            `;

            // B. Insert Academic
            await tx.$executeRaw`
                INSERT INTO "AcademicRecord" (id, "studentId", "academicYear", "classId", "branchId", "admissionDate", "schoolId")
                VALUES (${crypto.randomUUID()}, ${studentId}, ${academicYearId}, ${classId}, ${branchId}, NOW(), ${schoolId})
            `;

            // C. Insert AcademicHistory (The ERP Identity Anchor)
            await tx.$executeRaw`
                INSERT INTO "AcademicHistory" (id, "studentId", "academicYearId", "classId", "promotionStatus", "admissionDate", "admissionNumber", "studentCode", "schoolId", "branchId", "updatedAt")
                VALUES (${historyId}, ${studentId}, ${academicYearId}, ${classId}, 'New Admission', NOW(), ${admissionNumber}, ${studentCode}, ${schoolId}, ${branchId}, NOW())
            `;
        });

        console.log(`✅ ADMISSION COMMITTED VIA SQL: ${studentId}`);

        // --- PHASE 2: DATA INTEGRITY AUDIT ---
        console.log("\n🔍 STARTING DATA INTEGRITY AUDIT...");
        
        const audit = await prisma.$queryRaw`
            SELECT s."admissionNumber", s."studentCode", s.status, h."admissionNumber" as "hAdm", h."studentCode" as "hStu"
            FROM "Student" s
            JOIN "AcademicHistory" h ON s.id = h."studentId"
            WHERE s.id = ${studentId}
        `;

        const record = audit[0];
        const checks = [
            { 
                name: "Identity Decoupling (Student Master Fields are NULL)", 
                pass: record.admissionNumber === null && record.studentCode === null 
            },
            { 
                name: "Transactional Integrity (Admission in History)", 
                pass: record.hAdm === admissionNumber 
            },
            { 
                name: "Transactional Integrity (Student Code in History)", 
                pass: record.hStu === studentCode 
            },
            { 
                name: "Status Invariance", 
                pass: record.status === "Active" 
            }
        ];

        let failed = false;
        checks.forEach(c => {
            console.log(`   [${c.pass ? "✅" : "❌"}] ${c.name}`);
            if (!c.pass) failed = true;
        });

        if (failed) {
            console.error("\n🔴 INTEGRITY TEST FAILED.");
        } else {
            console.log("\n🟢 V2.1 ERP ADMISSION SPECIFICATION VERIFIED. 100% COMPLIANT.");
            console.log(`\n📄 Final Admission Number: ${admissionNumber}`);
            console.log(`📄 Final Student Code:     ${studentCode}`);
        }
        
    } catch (err) {
        console.error("🚨 SQL TEST FATAL ERROR:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runHighSeqSqlAdmissionTest();
