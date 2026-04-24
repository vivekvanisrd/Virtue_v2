
import prisma from '../src/lib/prisma';
import { recordFeeCollection, voidCollectionAction } from '../src/lib/actions/finance-actions';
import { runWithTenant } from '../src/lib/utils/tenant-context';

async function testFinance() {
    console.log("🧪 TESTING FINANCIAL HARDENING (Phase 4)...");

    try {
        // 1. Resolve or Create a student for testing
        let student = await prisma.student.findFirst({
            include: { history: { include: { branch: { include: { school: true } } } }, financial: true }
        });

        if (!student || !student.history?.[0] || !student.financial) {
            console.log("⚠️ No suitable student found. Creating dummy test data...");
            
            const school = await prisma.school.findFirst() || await prisma.school.create({ 
                data: { name: "Virtue Academy", code: "VIVA" } 
            });
            
            const branch = await prisma.branch.findFirst({ where: { schoolId: school.id } }) || await prisma.branch.create({ 
                data: { name: "Main Branch", code: "MAIN", schoolId: school.id } 
            });
            
            const fy = await prisma.financialYear.findFirst({ where: { schoolId: school.id } }) || await prisma.financialYear.create({ 
                data: { name: "2026-27", startDate: new Date("2026-04-01"), endDate: new Date("2027-03-31"), isCurrent: true, schoolId: school.id } 
            });

            const classObj = await prisma.class.findFirst() || await prisma.class.create({ 
                data: { name: "Class 1", level: 1 } 
            });
            
            student = await prisma.student.create({
                data: {
                    id: "TEST-STU-" + Date.now(),
                    firstName: "Test",
                    lastName: "Student",
                    schoolId: school.id,
                    branchId: branch.id,
                    history: { 
                        create: { 
                            id: "TEST-HIST-" + Date.now(),
                            branchId: branch.id, 
                            schoolId: school.id, 
                            academicYearId: fy.id,
                            classId: classObj.id,
                            admissionNumber: "ADM-" + Date.now(),
                            promotionStatus: "ACTIVE"
                        } 
                    },
                    financial: { create: { schoolId: school.id, annualTuition: 50000, netTuition: 50000 } }
                },
                include: { history: { include: { branch: { include: { school: true } } } }, financial: true }
            });
        }

        const studentId = student.id;
        console.log(`Targeting Student: ${studentId} | Real Code: ${student.history[0].branch?.school.code}`);

        // 2. Simulate the correct session context
        await runWithTenant({ 
            schoolId: student.schoolId, 
            branchId: student.history[0].branchId!, 
            role: "ADMIN" 
        }, async () => {
            console.log("\n--- STEP 1: RECORDING FEE ---");
            const collectResult = await recordFeeCollection({
                studentId,
                selectedTerms: ["term1"],
                amountPaid: 5000,
                paymentMode: "Cash",
                lateFeePaid: 0,
                lateFeeWaived: false,
                waiveAdmissionFee: true 
            });

            if (!collectResult.success) {
                console.log("❌ Collection Failed:", collectResult.error);
                return;
            }

            const receipt = collectResult.data;
            console.log(`✅ Collection Success! Receipt: ${receipt.receiptNumber}`);
            console.log(`Admission Waived: ${(receipt.allocatedTo as any).admissionWaived}`);

            // 3. Verify Journaling
            const entries = await prisma.journalEntry.findMany({
                where: { schoolId: student.schoolId },
                orderBy: { entryDate: 'desc' },
                take: 1,
                include: { lines: true }
            });
            console.log(`Journal Entry Created: ${entries[0].description}`);

            console.log("\n--- STEP 2: VOIDING RECEIPT ---");
            const voidResult = await voidCollectionAction(receipt.id, "Testing Void Logic 2026-27");

            if (!voidResult.success) {
                console.log("❌ Void Failed:", voidResult.error);
                return;
            }

            console.log(`✅ Void Success: ${voidResult.message}`);

            // 4. Verify Reversal
            const reversalEntries = await prisma.journalEntry.findMany({
                where: { schoolId: student.schoolId, entryType: "REVERSAL" },
                orderBy: { entryDate: 'desc' },
                take: 1,
                include: { lines: true }
            });
            console.log(`Reversal Entry Found: ${reversalEntries[0].description}`);
            console.log(`Reversal Sum: ${reversalEntries[0].totalDebit}`);

            console.log("\n✅ ALL FINANCIAL HARDENING TESTS PASSED!");
        });

    } catch (error: any) {
        console.log("❌ TEST ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testFinance();
