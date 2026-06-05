const { staffOnboardingSchema } = require("../src/types/staff");
const { z } = require("zod");

// Let's replicate what would be in the formData for Swetha Jangampet
// with basic fields, professional, statutory, and bank fields.
const data = {
    id: "cfe827ad-d63f-4362-b637-51002ab0ac84",
    firstName: "Swetha",
    lastName: "Jangampet",
    middleName: "",
    email: "swetha@virtueschool.in",
    phone: "9876543210", // Say they filled phone
    gender: "Female",
    role: "Teacher",
    schoolId: "VIVES",
    branchId: "VIVES-SNB",
    dob: "1990-01-01", // filled dob
    address: "Some Address",
    onboardingStatus: "PASSWORD_CHANGE_REQUIRED",
    designation: "Principal",
    department: "Academics",
    qualification: "B.Ed",
    experienceYears: 5,
    dateOfJoining: "2025-06-01",
    basicSalary: 25000,
    panNumber: "",
    pfNumber: "",
    uanNumber: "",
    esiNumber: "",
    aadhaarNumber: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: ""
};

const result = staffOnboardingSchema.partial().safeParse(data);
console.log("Partial validation result success:", result.success);
if (!result.success) {
    console.log("Validation errors:", JSON.stringify(result.error.format(), null, 2));
}

// What if phone is empty or some fields are empty strings?
const dataWithEmpty = { ...data, panNumber: "", aadhaarNumber: "", bankName: "", accountNumber: "", ifscCode: "" };
const result2 = staffOnboardingSchema.partial().safeParse(dataWithEmpty);
console.log("With empty fields: success:", result2.success);
if (!result2.success) {
    console.log("Validation errors with empty fields:", JSON.stringify(result2.error.format(), null, 2));
}
