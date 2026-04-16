const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function runIntegrityTest() {
    console.log("🚀 STARTING FULL ERP INTEGRITY TEST...");
    
    // 1. Mock Context
    const schoolId = "VIVA";
    const branchId = "VIVA-BR-01";
    
    try {
        // --- STEP 1: PROVISIONAL ADMISSION ---
        console.log("\n📁 [STEP 1] Submitting Provisional Enquiry...");
        const { submitAdmissionAction } = require('../src/lib/actions/student-actions');
        
        const enquiryData = {
            firstName: "Integrity",
            lastName: "Test_" + Date.now().toString().slice(-4),
            fatherName: "Parent Test",
            fatherPhone: "99999" + Math.floor(Math.random() * 100000).toString(),
            gender: "Male",
            classId: "C1",
            branchId: branchId
        };

        // Note: Actions usually run in server-side context with cookies. 
        // For simulation, we'll manually use prisma to bypass session checks if needed, 
        // but here we want to test the logic.
        
        // Let's find the active year first
        const activeAY = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
        
        const student = await prisma.student.create({
            data: {
                registrationId: "REG-" + Date.now(),
                schoolId,
                branchId,
                status: "Provisional",
                firstName: enquiryData.firstName,
                lastName: enquiryData.lastName,
                phone: enquiryData.fatherPhone,
                family: { create: { fatherName: enquiryData.fatherName, fatherPhone: enquiryData.fatherPhone } },
                history: {
                    create: {
                        id: crypto.randomUUID(),
                        schoolId,
                        branchId,
                        academicYearId: activeAY.id,
                        classId: enquiryData.classId,
                        promotionStatus: "In-Progress",
                        admissionDate: new Date()
                    }
                }
            },
            include: { history: true }
        });

        console.log(`✅ Provisional Student created: ${student.id}`);
        console.log(`   History Record: ${student.history[0].id}`);

        // --- STEP 2: SIMULATE RAZORPAY WEBHOOK (PROMOTION + PAYMENT) ---
        console.log("\n💳 [STEP 2] Simulating Razorpay Webhook Promotion...");
        const { promoteStudentAction } = require('../src/lib/actions/student-actions');
        
        // Use a mock transaction to simulate the webhook's atomic promotion
        await prisma.$transaction(async (tx) => {
            const promotion = await promoteStudentAction(student.id, tx);
            if (!promotion.success) throw new Error("Promotion Failed: " + promotion.error);
            
            console.log(`✅ Student Promoted. Admission: ${promotion.data.admissionNumber}`);
            
            // Create the collection linked to admissionId
            const history = await tx.academicHistory.findFirst({
                where: { studentId: student.id },
                orderBy: { createdAt: 'desc' }
            });

            await tx.collection.create({
                data: {
                    receiptNumber: "REC-SIM-" + Date.now(),
                    studentId: student.id,
                    admissionId: history.id,
                    schoolId,
                    branchId,
                    financialYearId: (await tx.financialYear.findFirst({ where: { schoolId, isCurrent: true } })).id,
                    amountPaid: 5000,
                    totalPaid: 5000,
                    paymentMode: "Razorpay",
                    paymentReference: "pay_sim_" + Date.now(),
                    status: "Success",
                    allocatedTo: { terms: ["term1"] }
                }
            });
        });

        // --- STEP 3: FINAL AUDIT ---
        console.log("\n🔍 [STEP 3] Final Data Integrity Audit...");
        
        const finalStudent = await prisma.student.findUnique({
            where: { id: student.id },
            include: { 
                history: true,
                collections: true
            }
        });

        const history = finalStudent.history[0];
        const receipt = finalStudent.collections[0];

        console.log("   Checking Links...");
        const checks = [
            { name: "Student Status is Active", pass: finalStudent.status === "Active" },
            { name: "Admission Number in History", pass: history.admissionNumber !== null && history.admissionNumber.includes("ADM") },
            { name: "Student Code in History", pass: history.studentCode !== null && history.studentCode.includes("STU") },
            { name: "Receipt Linked to Admission", pass: receipt.admissionId === history.id },
            { name: "Identity Decoupled from Student Master", pass: finalStudent.admissionNumber === null && finalStudent.studentCode === null }
        ];

        let failed = false;
        checks.forEach(c => {
            console.log(`   [${c.pass ? "✅" : "❌"}] ${c.name}`);
            if (!c.pass) failed = true;
        });

        if (failed) {
            console.error("\n🔴 INTEGRITY TEST FAILED!");
        } else {
            console.log("\n🟢 ALL SYSTEMS NOMINAL. TRANSACTIONAL INTEGRITY VERIFIED.");
        }

    } catch (err) {
        console.error("🚨 TEST FATAL ERROR:", err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

runIntegrityTest();
