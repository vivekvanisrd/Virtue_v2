
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testImmutability() {
    console.log("🧪 TESTING TENANT IMMUTABILITY (Phase 3)...");

    try {
        // 1. Get a random student
        const student = await prisma.student.findFirst();
        if (!student) {
            console.log("❌ No students found to test.");
            return;
        }

        console.log(`Found Student: ${student.id} | School: ${student.schoolId}`);

        // 2. Attempt to change schoolId (this should be blocked by DB trigger)
        console.log("Attempting to change schoolId to 'HACKER-SCHOOL'...");
        
        await prisma.student.update({
            where: { id: student.id },
            data: {
                schoolId: "HACKER-SCHOOL"
            }
        });

        console.log("❌ TEST FAILED: The update succeeded, but it should have been blocked!");

    } catch (error: any) {
        if (error.message.includes('Hardening Error: schoolId is IMMUTABLE')) {
            console.log("✅ TEST PASSED: Database trigger successfully blocked the cross-tenant update.");
        } else {
            console.log("❌ TEST FAILED with unexpected error:", error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testImmutability();
