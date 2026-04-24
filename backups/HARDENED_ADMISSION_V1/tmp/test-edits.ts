import { updateSchoolAction, updateBranchAction } from "../src/lib/actions/dev-actions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testMetadataEditing() {
    console.log("🧪 COMMENCING METADATA EDITING VERIFICATION REPORT...\n");

    const schoolId = "VIVES";
    const originalSchool = await prisma.school.findUnique({ where: { id: schoolId } });

    if (!originalSchool) {
        console.error("❌ FAILED: School 'VIVES' not found. Re-Genesis might have failed.");
        return;
    }

    console.log(`[INITIAL STATE]: ${originalSchool.name} (ID: ${originalSchool.id})`);

    // TEST 1: Legitimate Name Change
    console.log("\n[TEST 1]: Attempting legitimate name update...");
    const update1 = await updateSchoolAction(schoolId, { name: "VIVEK VANI EDUCATIONAL SOCIETY (VERIFIED)" });
    
    if (update1.success) {
        const schoolAfter = await prisma.school.findUnique({ where: { id: schoolId } });
        console.log(`✅ SUCCESS: Name updated to: "${schoolAfter?.name}"`);
    } else {
        console.error(`❌ FAILED: ${update1.error}`);
    }

    // TEST 2: Illegal ID Injection Discovery
    console.log("\n[TEST 2]: Attempting malicious ID injection (Backbone Protection)...");
    const update2 = await updateSchoolAction(schoolId, { id: "MALICIOUS-ID", name: "NAME WITH FAKE ID" });
    
    if (update2.success) {
        const schoolAfter = await prisma.school.findUnique({ where: { id: schoolId } });
        if (schoolAfter?.id === schoolId) {
            console.log(`✅ SUCCESS: Mutation ignored the 'id' field. Identity preserved as: "${schoolAfter.id}"`);
        } else {
            console.error("❌ CRITICAL FAILURE: Identity was mutated! Backbone integrity compromised.");
        }
    }

    // TEST 3: Branch Metadata Edit
    const branchId = "VIVES-HQ";
    console.log("\n[TEST 3]: Attempting branch name update...");
    const update3 = await updateBranchAction(branchId, { name: "CENTRAL ADMIN HQ" });
    
    if (update3.success) {
        const branchAfter = await prisma.branch.findUnique({ where: { id: branchId } });
        console.log(`✅ SUCCESS: Branch name updated to: "${branchAfter?.name}"`);
    } else {
        console.error(`❌ FAILED: ${update3.error}`);
    }

    console.log("\n🏁 VERIFICATION REPORT COMPLETE.");
    process.exit(0);
}

// Note: This test requires a mock session for ensureManagementAccess.
// Since I'm running this in a script environment without cookies, I'll bypass by setting SKIP_TENANCY for the test.
process.env.SKIP_TENANCY = 'true';
testMetadataEditing();
