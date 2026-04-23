import { z } from "zod";
import { 
  globalPhoneSchema, globalEmailSchema, globalAadhaarSchema,
  trim, toTitleCase, toUpperCase, toLowerCase 
} from "@/lib/utils/validations";

// Shared across multiple forms
export const addressSchema = z.object({
  currentAddress: z.string().nullable().optional().transform(toTitleCase),
  permanentAddress: z.string().nullable().optional().transform(toTitleCase),
  city: z.string().nullable().optional().transform(toTitleCase),
  state: z.string().nullable().optional().transform(toTitleCase),
  country: z.string().nullable().optional().default("India").transform(toTitleCase),
  pinCode: z.string().nullable().optional().transform(toUpperCase),
});

// All 45+ fields mapped across 10 sections
export const studentAdmissionSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required").transform(toTitleCase),
  lastName: z.string().min(1, "Last name is required").transform(toTitleCase),
  middleName: z.string().nullable().optional().transform(toTitleCase),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional().transform(toTitleCase),
  bloodGroup: z.string().nullable().optional().transform(toUpperCase),
  category: z.string().nullable().optional().transform(toTitleCase),
  aadhaarNumber: globalAadhaarSchema.nullable().optional().or(z.literal("")).transform(trim),
  aadhaarVerified: z.boolean().default(false),
  motherTongue: z.string().nullable().optional().transform(toTitleCase),
  placeOfBirth: z.string().nullable().optional().transform(toTitleCase),
  birthCertNo: z.string().nullable().optional().transform(toUpperCase),
  usnSrnNumber: z.string().nullable().optional().transform(toUpperCase),
  minorityStatus: z.boolean().default(false),
  bplStatus: z.boolean().default(false),
  disabilityType: z.string().nullable().optional().transform(toTitleCase),
  email: globalEmailSchema.nullable().optional().or(z.literal("")).transform(toLowerCase),
  // Student's own contact (used for SMS alerts, parent lookup)
  phone: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),

  // Academic
  admissionNumber: z.string().nullable().optional().transform(toUpperCase),
  studentCode: z.string().nullable().optional().transform(toUpperCase),
  branchId: z.string().min(1, "Branch is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  admissionDate: z.string().min(1, "Admission Date is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().nullable().optional(),
  rollNumber: z.string().nullable().optional().transform(toUpperCase),
  biometricId: z.string().nullable().optional().transform(toUpperCase),
  penNumber: z.string().nullable().optional().transform(toUpperCase),
  apaarId: z.string().nullable().optional().transform(toUpperCase),
  samagraId: z.string().nullable().optional().transform(toUpperCase),
  stsId: z.string().nullable().optional().transform(toUpperCase),
  tcNumber: z.string().nullable().optional().transform(toUpperCase),
  admissionType: z.string().default("New").transform(toTitleCase),
  boardingType: z.string().default("Day Scholar").transform(toTitleCase),
  group: z.string().nullable().optional().transform(toUpperCase),
  subcategory: z.string().nullable().optional().transform(toUpperCase),

  // Family
  fatherName: z.string().min(1, "Father/Guardian name is required").transform(toTitleCase),
  fatherPhone: globalPhoneSchema.transform(trim),
  fatherAlternatePhone: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),
  fatherEmail: globalEmailSchema.nullable().optional().or(z.literal("")).transform(toLowerCase),
  fatherOccupation: z.string().nullable().optional().transform(toTitleCase),
  fatherQualification: z.string().nullable().optional().transform(toTitleCase),
  fatherAadhaar: globalAadhaarSchema.nullable().optional().or(z.literal("")).transform(trim),
  motherName: z.string().nullable().optional().transform(toTitleCase),
  motherPhone: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),
  motherAlternatePhone: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),
  motherEmail: globalEmailSchema.nullable().optional().or(z.literal("")).transform(toLowerCase),
  motherOccupation: z.string().nullable().optional().transform(toTitleCase),
  motherQualification: z.string().nullable().optional().transform(toTitleCase),
  // Mother's Aadhaar is MANDATORY per institution policy
  motherAadhaar: z.string()
    .trim()
    .min(1, "Mother's Aadhaar is required")
    .regex(/^\d{12}$/, "Mother's Aadhaar must be exactly 12 digits"),
  whatsappNumber: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),
  emergencyContactName: z.string().nullable().optional().transform(toTitleCase),
  emergencyContactPhone: globalPhoneSchema.nullable().optional().or(z.literal("")).transform(trim),
  emergencyContactRelation: z.string().nullable().optional().transform(toTitleCase),

  // Financial
  feeScheduleId: z.string().nullable().optional(),
  paymentType: z.string().default("Term-wise").transform(toTitleCase),
  tuitionFee: z.coerce.number().default(0),
  admissionFee: z.coerce.number().default(0),
  libraryFee: z.coerce.number().default(0),
  labFee: z.coerce.number().default(0),
  sportsFee: z.coerce.number().default(0),
  developmentFee: z.coerce.number().default(0),
  examFee: z.coerce.number().default(0),
  computerFee: z.coerce.number().default(0),
  miscellaneousFee: z.coerce.number().default(0),
  cautionDeposit: z.coerce.number().default(0),
  transportFee: z.coerce.number().default(0),
  discountId1: z.string().nullable().optional(),
  discountReason1: z.string().nullable().optional().transform(toTitleCase),
  discountId2: z.string().nullable().optional(),
  discountReason2: z.string().nullable().optional().transform(toTitleCase),

  // 💎 Dynamic Mastery Mapping (Zod v4: record requires key + value schema)
  auxiliaryFields: z.record(z.string(), z.coerce.number()).optional(),

  // Transport
  transportRequired: z.boolean().default(false),
  transportRouteId: z.string().nullable().optional(),
  pickupStop: z.string().nullable().optional(),
  dropStop: z.string().nullable().optional(),
  transportMonthlyFee: z.coerce.number().default(0),

  // Medical
  medicalConditions: z.string().nullable().optional().transform(toTitleCase),
  allergies: z.string().nullable().optional().transform(toTitleCase),
  doctorName: z.string().nullable().optional().transform(toTitleCase),
  doctorPhone: z.string().nullable().optional().transform(trim),

  // Bank
  bankAccountName: z.string().nullable().optional().transform(toTitleCase),
  bankAccountNumber: z.string().nullable().optional().transform(toUpperCase),
  bankIfscCode: z.string().nullable().optional().transform(toUpperCase),
  bankBranch: z.string().nullable().optional().transform(toTitleCase),

  // Previous School
  previousSchool: z.string().nullable().optional().transform(toTitleCase),
  previousClass: z.string().nullable().optional().transform(toUpperCase),
  previousTcNumber: z.string().nullable().optional().transform(toUpperCase),
  dateOfLeaving: z.string().nullable().optional(),
  reasonForLeaving: z.string().nullable().optional().transform(toTitleCase),

  // Other Info
  reference: z.string().nullable().optional().transform(toTitleCase),
}).merge(addressSchema);

export const publicEnquirySchema = z.object({
  firstName: z.string().min(1, "First name is required").transform(toTitleCase),
  lastName: z.string().min(1, "Last name is required").transform(toTitleCase),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().nullable().optional().transform(toTitleCase),
  aadhaarNumber: globalAadhaarSchema.nullable().optional().or(z.literal("")).transform(trim),
  apaarId: z.string().nullable().optional().transform(toUpperCase),
  fatherName: z.string().min(1, "Father/Guardian name is required").transform(toTitleCase),
  fatherPhone: globalPhoneSchema.transform(trim),
  fatherEmail: globalEmailSchema.nullable().optional().or(z.literal("")).transform(toLowerCase),
  classId: z.string().min(1, "Enquired Class is required"),
  branchId: z.string().min(1, "Branch Identification is required"),
});

export type PublicEnquiryData = z.infer<typeof publicEnquirySchema>;
export type StudentAdmissionData = z.infer<typeof studentAdmissionSchema>;
