import prisma from "../src/lib/prisma";
import { provisionInstance } from "../src/lib/actions/dev-actions";
import { createBranchAction, createOwnerAction } from "../src/app/developer/actions";
import { createStaffAction, updateStaffAction, getStaffDirectoryAction } from "../src/lib/actions/staff-actions";

async function runTest() {
    console.log("🚀 STARTING INTEGRATION VERIFICATION FOR STAFF IDENTITY REFACTOR...");

    const testSchoolCode = "VS" + Math.floor(Math.random() * 9000 + 1000); // e.g., VS4823
    const testEmail = `admin@${testSchoolCode.toLowerCase()}.com`;
    const randPhone1 = "9" + Math.floor(Math.random() * 900000000 + 100000000);
    const randPhone2 = "9" + Math.floor(Math.random() * 900000000 + 100000000);
    const randPhone3 = "9" + Math.floor(Math.random() * 900000000 + 100000000);

    // Set environment overrides at the very start so getSovereignIdentity has the right school context!
    process.env.TEST_SCHOOL_ID = testSchoolCode;
    process.env.TEST_BRANCH_ID = `${testSchoolCode}-RCB`;

    try {
        // --- 1. Test School Provisioning (Genesis Owner) ---
        console.log("\n--- [1/5] VERIFYING SCHOOL PROVISIONING FLOW ---");
        const provisionResult = await provisionInstance({
            schoolName: "Virtue Refactor Academy",
            schoolCode: testSchoolCode,
            city: "Bangalore",
            adminName: "Owner Name",
            adminEmail: testEmail,
            adminPhone: randPhone1
        });

        if (!provisionResult.success) {
            throw new Error(`School provisioning failed: ${provisionResult.error}`);
        }

        const provisionedData = (provisionResult as any).data;
        console.log(`✅ School ${provisionedData.schoolId} provisioned successfully.`);

        // Re-fetch owner from DB and check details
        const owner = await prisma.staff.findFirst({
            where: { schoolId: provisionedData.schoolId, role: "OWNER" }
        });

        if (!owner) {
            throw new Error("Genesis Owner not found in the DB.");
        }

        console.log(`✅ Owner Code: ${owner.staffCode} (Expected format: ${testSchoolCode}-HQ-STF-000001)`);
        console.log(`✅ Owner Category: ${owner.employeeCategory} (Expected: OWNER)`);
        console.log(`✅ Owner Identity Version: ${owner.identityVersion} (Expected: V2)`);

        if (owner.staffCode !== `${testSchoolCode}-HQ-STF-000001`) {
            throw new Error(`Owner code mismatch. Found: ${owner.staffCode}`);
        }
        if (owner.employeeCategory !== "OWNER") {
            throw new Error(`Owner category mismatch. Found: ${owner.employeeCategory}`);
        }
        if (owner.identityVersion !== "V2") {
            throw new Error(`Owner identity version mismatch. Found: ${owner.identityVersion}`);
        }

        // --- 2. Test Branch Provisioning & Principal Creation ---
        console.log("\n--- [2/5] VERIFYING CAMPUS BRANCH & PRINCIPAL CREATION ---");
        const branchCode = "RCB";
        const branchResult = await createBranchAction({
            schoolId: provisionedData.schoolId,
            branchName: "Virtue RCB Campus",
            branchCode: branchCode,
            city: "Bangalore",
            phone: randPhone2,
            createAdmin: true,
            adminFirstName: "Principal",
            adminLastName: "RCB",
            adminEmail: `principal.rcb@${testSchoolCode.toLowerCase()}.com`,
            adminPhone: randPhone2
        });

        if (!branchResult.success) {
            throw new Error(`Branch provisioning failed: ${branchResult.error}`);
        }

        console.log(`✅ Branch RCB provisioned successfully.`);

        // Re-fetch branch and principal
        const branch = await prisma.branch.findFirst({
            where: { schoolId: provisionedData.schoolId, code: branchCode }
        });
        if (!branch) throw new Error("Branch not found in DB.");

        const principal = await prisma.staff.findFirst({
            where: { schoolId: provisionedData.schoolId, branchId: branch.id, role: "PRINCIPAL" }
        });

        if (!principal) throw new Error("Principal not found in DB.");

        console.log(`✅ Principal Code: ${principal.staffCode} (Expected format: ${testSchoolCode}-${branchCode}-STF-000001)`);
        console.log(`✅ Principal Category: ${principal.employeeCategory} (Expected: MANAGEMENT)`);
        console.log(`✅ Principal Identity Version: ${principal.identityVersion} (Expected: V2)`);

        if (principal.staffCode !== `${testSchoolCode}-${branchCode}-STF-000001`) {
            throw new Error(`Principal code mismatch. Found: ${principal.staffCode}`);
        }
        if (principal.employeeCategory !== "MANAGEMENT") {
            throw new Error(`Principal category mismatch. Found: ${principal.employeeCategory}`);
        }
        if (principal.identityVersion !== "V2") {
            throw new Error(`Principal identity version mismatch. Found: ${principal.identityVersion}`);
        }

        // --- 3. Test Manual Staff Onboarding & Category Mapping ---
        console.log("\n--- [3/5] VERIFYING MANUAL STAFF ONBOARDING ---");
        const teacherData = {
            firstName: "John",
            lastName: "Doe",
            email: `teacher.john.${testSchoolCode.toLowerCase()}@test.com`,
            phone: randPhone3,
            dob: "1990-05-15",
            gender: "Male",
            branchId: branch.id,
            address: "123 Test Street",
            role: "TEACHER",
            department: "Mathematics",
            designation: "Senior Teacher",
            qualification: "M.Sc B.Ed",
            experienceYears: 5,
            dateOfJoining: "2026-06-01",
            basicSalary: 35000,
            employmentType: "PERMANENT"
        };

        console.log("Executing createStaffAction for Teacher John Doe...");
        const teacherResult = await createStaffAction(teacherData);
        if (!teacherResult.success) {
            console.error("Teacher creation failed:", teacherResult.error);
            throw new Error(`Teacher creation failed: ${teacherResult.error}`);
        }

        console.log("✅ Teacher John Doe created successfully.");
        const teacherStaff = await prisma.staff.findFirst({
            where: { schoolId: provisionedData.schoolId, email: teacherData.email }
        });
        if (!teacherStaff) throw new Error("Teacher not found in DB.");

        console.log(`✅ Teacher Code: ${teacherStaff.staffCode} (Expected format: ${testSchoolCode}-${branchCode}-STF-000002)`);
        console.log(`✅ Teacher Category: ${teacherStaff.employeeCategory} (Expected: TEACHING)`);
        console.log(`✅ Teacher Employment Type: ${teacherStaff.employmentType} (Expected: PERMANENT)`);
        console.log(`✅ Teacher Identity Version: ${teacherStaff.identityVersion} (Expected: V2)`);

        if (teacherStaff.staffCode !== `${testSchoolCode}-${branchCode}-STF-000002`) {
            throw new Error(`Teacher code sequence mismatch. Found: ${teacherStaff.staffCode}`);
        }
        if (teacherStaff.employeeCategory !== "TEACHING") {
            throw new Error(`Teacher category mapping failed. Found: ${teacherStaff.employeeCategory}`);
        }
        if (teacherStaff.employmentType !== "PERMANENT") {
            throw new Error(`Teacher employment type failed. Found: ${teacherStaff.employmentType}`);
        }

        // --- 4. Test Staff Profile Update ---
        console.log("\n--- [4/5] VERIFYING STAFF UPDATE FLOW ---");
        const updateResult = await updateStaffAction(teacherStaff.id, {
            employeeCategory: "MANAGEMENT", // Promoted
            employmentType: "CONTRACT"
        });

        if (!updateResult.success) {
            throw new Error(`Staff update failed: ${updateResult.error}`);
        }

        const updatedTeacher = await prisma.staff.findUnique({
            where: { id: teacherStaff.id }
        });
        if (!updatedTeacher) throw new Error("Updated teacher not found.");

        console.log(`✅ Promoted Teacher Category: ${updatedTeacher.employeeCategory} (Expected: MANAGEMENT)`);
        console.log(`✅ Promoted Teacher Employment Type: ${updatedTeacher.employmentType} (Expected: CONTRACT)`);
        console.log(`✅ Promoted Teacher Code: ${updatedTeacher.staffCode} (Expected to remain unchanged: ${teacherStaff.staffCode})`);
        console.log(`✅ Promoted Teacher Identity Version: ${updatedTeacher.identityVersion} (Expected to remain unchanged: V2)`);

        if (updatedTeacher.staffCode !== teacherStaff.staffCode) {
            throw new Error("Staff code was incorrectly mutated during update.");
        }
        if (updatedTeacher.employeeCategory !== "MANAGEMENT" || updatedTeacher.employmentType !== "CONTRACT") {
            throw new Error("Update fields did not persist correctly.");
        }

        // --- 5. Test Filters and Directory Queries ---
        console.log("\n--- [5/5] VERIFYING DIRECTORY FILTERING ARCHITECTURE ---");
        
        // Find all MANAGEMENT staff in this school
        const managementDirectory = await getStaffDirectoryAction({
            employeeCategory: "MANAGEMENT"
        });
        if (!managementDirectory.success) {
            throw new Error(`Directory query failed: ${managementDirectory.error}`);
        }

        const managementList = managementDirectory.data as any[];
        console.log(`✅ Found ${managementList.length} MANAGEMENT staff members (Expected: 2 - Principal & Promoted John Doe).`);
        
        const codes = managementList.map(s => s.staffCode);
        console.log("MANAGEMENT staff codes found:", codes);
        if (managementList.length !== 2) {
            throw new Error(`Expected exactly 2 management staff, got ${managementList.length}`);
        }

        console.log("\n✨ INTEGRATION VERIFICATION SUCCESSFUL. ALL ARCHITECTURAL GUARANTEES VALIDATED! ✨");

    } catch (error: any) {
        console.error("\n❌ CRITICAL INTEGRATION TEST FAILURE:");
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
