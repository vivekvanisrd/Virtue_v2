import { provisionInstance } from "../src/lib/actions/dev-actions";
import prisma from "../src/lib/prisma";

async function test() {
    console.log("Starting Provisioning Test...");
    
    const data = {
        schoolName: "Test Virtue Academy",
        schoolCode: "TVAC",
        city: "Test City",
        adminName: "Test Admin",
        adminEmail: "test.admin@tvac.com",
        adminPhone: "1234567890"
    };

    // Clean up existing test data if any
    await prisma.school.deleteMany({ where: { code: "TVAC" } }).catch(() => {});

    try {
        const result = await provisionInstance(data);
        console.log("Result:", result);
    } catch (e) {
        console.error("Test Failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
