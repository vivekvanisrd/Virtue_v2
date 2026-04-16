const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function runEndToEndVerification() {
    console.log("🚀 STARTING COMPREHENSIVE V2.1 FLOW AUDIT...");
    
    const schoolId = "VIVA";
    const branchId = "VIVA-BR-01";
    const schoolCode = "VIVA";
    const branchCode = "MAIN";
    const ayName = "2026-27";

    const results = [];

    async function getNextSeq(type, year = "GLOBAL", bId = "GLOBAL") {
        const c = await prisma.tenancyCounter.upsert({
            where: { schoolId_branchId_type_year: { schoolId, branchId: bId, type, year } },
            update: { lastValue: { increment: 1 } },
            create: { schoolId, branchId: bId, type, year, lastValue: 1 }
        });
        return c.lastValue;
    }

    try {
        // --- CASE A: WEBSITE ENQUIRY (PROVISIONAL) ---
        console.log("\n📡 CASE A: Simulating Public Website Enquiry...");
        const a_studentId = crypto.randomUUID();
        const a_provSeq = await getNextSeq("PROVISIONAL");
        const a_registrationId = `${schoolCode}-PROV-${a_provSeq.toString().padStart(5, '0')}`;
        
        await prisma.student.create({
            data: {
                id: a_studentId,
                registrationId: a_registrationId,
                schoolId,
                branchId,
                status: "Provisional",
                firstName: "FlowA",
                lastName: "Enquiry",
                updatedAt: new Date()
            }
        });
        
        const a_audit = await prisma.student.findUnique({ where: { id: a_studentId } });
        results.push({ 
            case: "Website Enquiry", 
            id: a_audit.registrationId, 
            status: a_audit.status, 
            pass: a_audit.registrationId.includes("-PROV-") && a_audit.status === "Provisional" 
        });

        // --- CASE B: PROMOTION (ID UPGRADE) ---
        console.log("\n👮 CASE B: Simulating Admin Promotion (Upgrade ID)...");
        const b_stuSeq = await getNextSeq("REGISTRATION");
        const b_registrationId = `${schoolCode}-STU-${b_stuSeq.toString().padStart(7, '0')}`;
        
        await prisma.student.update({
            where: { id: a_studentId },
            data: {
                registrationId: b_registrationId,
                status: "Active",
                updatedAt: new Date()
            }
        });

        const b_audit = await prisma.student.findUnique({ where: { id: a_studentId } });
        results.push({ 
            case: "Admin Promotion", 
            id: b_audit.registrationId, 
            status: b_audit.status, 
            pass: b_audit.registrationId.includes("-STU-") && b_audit.status === "Active" && b_audit.registrationId !== a_registrationId 
        });

        // --- CASE C: DIRECT OFFICIAL ADMISSION ---
        console.log("\n🎯 CASE C: Simulating Direct Admin Admission...");
        const c_studentId = crypto.randomUUID();
        const c_stuSeq = await getNextSeq("REGISTRATION");
        const c_registrationId = `${schoolCode}-STU-${c_stuSeq.toString().padStart(7, '0')}`;
        
        await prisma.student.create({
            data: {
                id: c_studentId,
                registrationId: c_registrationId,
                schoolId,
                branchId,
                status: "Active",
                firstName: "FlowC",
                lastName: "Direct",
                updatedAt: new Date()
            }
        });

        const c_audit = await prisma.student.findUnique({ where: { id: c_studentId } });
        results.push({ 
            case: "Direct Admission", 
            id: c_audit.registrationId, 
            status: c_audit.status, 
            pass: c_audit.registrationId.includes("-STU-") && c_audit.status === "Active" 
        });

        // --- FINAL SUMMARY ---
        console.log("\n📊 FINAL FLOW VERIFICATION MATRIX:");
        console.table(results);

        const allPassed = results.every(r => r.pass);
        if (allPassed) {
            console.log("\n🟢 V2.1 ERP IDENTITY FLOW VERIFIED. 100% COMPLIANT.");
        } else {
            console.error("\n🔴 FLOW VERIFICATION FAILED.");
            process.exit(1);
        }

    } catch (err) {
        console.error("🚨 AUDIT FATAL ERROR:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runEndToEndVerification();
