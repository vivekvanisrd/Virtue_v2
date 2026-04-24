import { studentAdmissionSchema } from "../src/types/student";

const testData: any = {
  // Personal
  firstName: "  jOHn  ",
  lastName: " dOE ",
  middleName: null,
  gender: "  mAlE ",
  bloodGroup: " o+ ",
  email: "  User@ExAmPlE.CoM  ",
  phone: "9876543210",
  aadhaarNumber: "123456789012",
  
  // Academic
  branchId: "VIVA-BR-01",
  academicYearId: "2026-27",
  admissionDate: "2026-04-05",
  classId: "C1",
  feeScheduleId: null,
  
  // Family
  fatherName: "  rOBERT dOE  ",
  fatherPhone: "9876543211",
  fatherAadhaar: "123456789013",
  
  // Address
  currentAddress: "123 main st",
  city: "bangalore ",
  state: " karnataka",
  pinCode: "560001",
  
  // Optional field with null
  medicalConditions: null,
  reference: " friend "
};

try {
  const result = studentAdmissionSchema.parse(testData);
  console.log("✅ Validation Success!");
  console.log("Normalized Data:", JSON.stringify(result, null, 2));
} catch (e: any) {
  console.error("❌ Validation Failed!");
  console.error(JSON.stringify(e.errors, null, 2));
}
