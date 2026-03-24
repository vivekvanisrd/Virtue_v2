import { z } from "zod";
import { globalPhoneSchema, globalEmailSchema, globalAadhaarSchema } from "@/lib/utils/validations";

// Shared across multiple forms
export const addressSchema = z.object({
  currentAddress: z.string().default(""),
  permanentAddress: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default("India"),
  pinCode: z.string().default(""),
});

// All 45+ fields mapped across 10 sections
export const studentAdmissionSchema = z.object({
  // Personal
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  category: z.string().optional(),
  aadhaarNumber: globalAadhaarSchema,
  aadhaarVerified: z.boolean().default(false),
  motherTongue: z.string().optional(),
  placeOfBirth: z.string().optional(),
  birthCertNo: z.string().optional(),
  usnSrnNumber: z.string().optional(),
  minorityStatus: z.boolean().default(false),
  bplStatus: z.boolean().default(false),
  disabilityType: z.string().optional(),
  phone: globalPhoneSchema.optional().or(z.literal("")),
  email: globalEmailSchema.optional().or(z.literal("")),

  // Academic
  branchId: z.string().min(1, "Branch is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  admissionDate: z.string().min(1, "Admission Date is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  rollNumber: z.string().optional(),
  biometricId: z.string().optional(),
  penNumber: z.string().optional(),
  apaarId: z.string().optional(),
  samagraId: z.string().optional(),
  stsId: z.string().optional(),
  tcNumber: z.string().optional(),
  admissionType: z.string().default("New"),
  boardingType: z.string().default("Day Scholar"),
  group: z.string().optional(),
  subcategory: z.string().optional(),

  // Family
  fatherName: z.string().min(1, "Father/Guardian name is required"),
  fatherPhone: globalPhoneSchema,
  fatherAlternatePhone: globalPhoneSchema.optional().or(z.literal("")),
  fatherEmail: globalEmailSchema.optional().or(z.literal("")),
  fatherOccupation: z.string().optional(),
  fatherQualification: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: globalPhoneSchema.optional().or(z.literal("")),
  motherAlternatePhone: globalPhoneSchema.optional().or(z.literal("")),
  motherEmail: globalEmailSchema.optional().or(z.literal("")),
  motherOccupation: z.string().optional(),
  motherQualification: z.string().optional(),
  whatsappNumber: globalPhoneSchema.optional().or(z.literal("")),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: globalPhoneSchema.optional().or(z.literal("")),
  emergencyContactRelation: z.string().optional(),

  // Financial
  feeScheduleId: z.string().optional(),
  paymentType: z.string().default("Term-wise"),
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
  discountId1: z.string().optional(),
  discountReason1: z.string().optional(),
  discountId2: z.string().optional(),
  discountReason2: z.string().optional(),

  // Transport
  transportRequired: z.boolean().default(false),
  transportRouteId: z.string().optional(),
  pickupStop: z.string().optional(),
  dropStop: z.string().optional(),
  transportMonthlyFee: z.coerce.number().default(0),

  // Medical
  medicalConditions: z.string().optional(),
  allergies: z.string().optional(),
  doctorName: z.string().optional(),
  doctorPhone: z.string().optional(),

  // Bank
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  bankBranch: z.string().optional(),

  // Previous School
  previousSchool: z.string().optional(),
  previousClass: z.string().optional(),
  previousTcNumber: z.string().optional(),
  dateOfLeaving: z.string().optional(),
  reasonForLeaving: z.string().optional(),

  // Other Info
  reference: z.string().optional(),
}).merge(addressSchema);

export type StudentAdmissionData = z.infer<typeof studentAdmissionSchema>;
