import * as dotenv from "dotenv";
dotenv.config();

import { initializeSystem } from "../src/lib/actions/setup-actions";
import prisma from "../src/lib/prisma";

/**
 * 🧬 GENESIS INSTANTIATION TEST (v2.5)
 * Verifies the high-fidelity onboarding flow on a clean slate.
 */
async function testNewGenesisFlow() {
    process.env.TEST_OVERRIDE_SOVEREIGN = 'true'; // 🔓 Bypass RBAC for CLI simulation
    process.env.TEST_ROLE = 'DEVELOPER';
    process.env.TEST_STAFF_ID = 'GENESIS_BOT';

    console.log("🧬 INITIATING GENESIS INSTANTIATION TEST...");

    const testPayload = {
        schoolName: "Sovereign Academy 2026",
        schoolCode: "SA2026",
        address: "Virtue Headquarters, Phase 1",
        phone: "+91 99999 00000",
        email: "contact@sa2026.edu",
        ownerFirstName: "Sovereign",
        ownerLastName: "Principal",
        ownerEmail: "admin@sa2026.edu",
        ownerPhone: "+91 99999 11111",
        ownerPassword: "Password@123",
        academicYear: "2026-27",
        academicYearStart: "2026-04-01",
        affiliation: "CBSE"
    };

    try {
        const result = await initializeSystem(testPayload as any);
        
        if (result.success) {
            console.log(`✅ GENESIS SUCCESS: ${result.message}`);
            
            // Forensic Audit
            const school = await prisma.school.findUnique({ where: { id: "SA2026" } });
            console.log(`🏛️ INSTITUTION_STATUS: ${school?.status}`);
            console.log(`🔬 FORENSIC_GENESIS_TAG: ${school?.isGenesis}`);
        } else {
            console.error(`❌ GENESIS FAILED: ${result.error}`);
        }
    } catch (e: any) {
        console.error("❌ TEST COLLAPSED:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testNewGenesisFlow();
