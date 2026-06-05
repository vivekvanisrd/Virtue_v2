// Mock next/cache before requiring anything else
const Module = require('module');
const nextCachePath = require.resolve('next/cache');
Module._cache[nextCachePath] = {
  id: nextCachePath,
  filename: nextCachePath,
  loaded: true,
  exports: {
    revalidatePath: (path, type) => {
      console.log(`[MOCK] revalidatePath called for: ${path} (${type})`);
    }
  }
};

// Also mock next/headers
const nextHeadersPath = require.resolve('next/headers');
Module._cache[nextHeadersPath] = {
  id: nextHeadersPath,
  filename: nextHeadersPath,
  loaded: true,
  exports: {
    headers: async () => ({
      get: (name) => {
        const headers = {
          'x-v2-staff-id': '57d2cbc3-ef51-436f-baaf-ea155c0f5764',
          'x-v2-role': 'DEVELOPER',
          'x-v2-school-id': 'VIVES',
          'x-v2-branch-id': 'VIVES-SNB',
          'x-v2-global-dev': 'true'
        };
        return headers[name] || null;
      }
    }),
    cookies: async () => ({
      get: (name) => null
    })
  }
};

// Now import our actions (using tsx to transpile on the fly)
const { updateStaffAction } = require("../src/lib/actions/staff-actions");

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

  console.log("Calling updateStaffAction with mocked Next.js context...");
  const result = await updateStaffAction(staffId, formData);
  console.log("RESULT:", result);
}

runTest().catch(console.error);
