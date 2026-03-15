import { z } from "zod";

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
  aadhaarNumber: z.string().optional(),
  aadhaarVerified: z.boolean().default(false),
  motherTongue: z.string().optional(),
  placeOfBirth: z.string().optional(),
  birthCertNo: z.string().optional(),
  usnSrnNumber: z.string().optional(),
  minorityStatus: z.boolean().default(false),
  bplStatus: z.boolean().default(false),
  disabilityType: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),

  // Academic
  branchId: z.string().optional(),
  academicYearId: z.string().optional(),
  admissionDate: z.string().optional(),
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
  fatherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  fatherAlternatePhone: z.string().optional(),
  fatherEmail: z.string().optional(),
  fatherOccupation: z.string().optional(),
  fatherQualification: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  motherAlternatePhone: z.string().optional(),
  motherEmail: z.string().optional(),
  motherOccupation: z.string().optional(),
  motherQualification: z.string().optional(),
  whatsappNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
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
