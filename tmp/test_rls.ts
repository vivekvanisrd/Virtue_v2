import prisma from '../src/lib/prisma';
import { runWithTenant } from '../src/lib/auth/tenancy-context';

async function testRLS() {
    console.log("🧪 TESTING ROW LEVEL SECURITY (Phase 3)...");

    try {
        // 1. Get a real student to know their ID
        const realStudent = await prisma.student.findFirst({
            where: { schoolId: "VIVA" }
        });
        
        if (!realStudent) {
            console.log("❌ No VIVA students found. Please seed the DB first.");
            return;
        }

        const studentId = realStudent.id;
        console.log(`Targeting Student: ${studentId} (belongs to VIVA)`);

        // 2. Simulate a HACKER-SCHOOL session
        await runWithTenant({ 
            schoolId: "HACKER-SCHOOL", 
            branchId: "HB01", 
            role: "STAFF" 
        }, async () => {
            console.log("Session context set to HACKER-SCHOOL.");
            
            // 3. Attempt to fetch the VIVA student (Level 3 RLS should block this)
            const result = await (prisma as any).student.findUnique({
                where: { id: studentId }
            });

            if (!result) {
                console.log("✅ TEST PASSED: Database (RLS) refused to serve the cross-tenant row.");
            } else {
                console.log("❌ TEST FAILED: The database served the record to a different school!");
            }
        });

    } catch (error: any) {
        console.log("❌ TEST ENCOUNTERED CROSS-ERROR:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testRLS();
