import { updateStaffAction } from "../src/lib/actions/staff-actions";

// Mock the getSovereignIdentity return by setting environment variables
process.env.TEST_OVERRIDE_SOVEREIGN = "true";
process.env.TEST_STAFF_ID = "57d2cbc3-ef51-436f-baaf-ea155c0f5764"; // Developer staff ID
process.env.TEST_ROLE = "DEVELOPER";
process.env.TEST_SCHOOL_ID = "VIVES";
process.env.TEST_BRANCH_ID = "VIVES-SNB";

async function runTest() {
  const staffId = "cfe827ad-d63f-4362-b637-51002ab0ac84"; // Swetha Jangampet
  
  const formData = {
    id: staffId,
    firstName: "Swetha",
    lastName: "Jangampet",
    middleName: "",
    email: "swetha@virtueschool.in",
    phone: "9876543210", // Test phone number
    gender: "Female",
    role: "PRINCIPAL",
    schoolId: "VIVES",
    branchId: "VIVES-SNB",
    dob: "1985-05-15",
    address: "Test Address, Shanthinagar",
    onboardingStatus: "PASSWORD_CHANGE_REQUIRED",
    designation: "Principal",
    department: "Academics",
    qualification: "M.A, B.Ed",
    experienceYears: 10,
    dateOfJoining: "2026-06-01",
    basicSalary: 45000,
    panNumber: "ABCDE1234F",
    pfNumber: "PF12345",
    uanNumber: "100987654321",
    esiNumber: "ESI12345",
    aadhaarNumber: "123456789012",
    bankName: "HDFC Bank",
    accountName: "Swetha Jangampet",
    accountNumber: "5010020304050",
    ifscCode: "HDFC0000123"
  };

  console.log("Calling updateStaffAction...");
  const result = await updateStaffAction(staffId, formData);
  console.log("RESULT:", result);
}

runTest().catch(console.error);
