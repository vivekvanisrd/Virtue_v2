import { z } from "zod";
import { globalPhoneSchema, sanitizePhone, formatToISODateString } from "@/lib/utils/validations";

export const staffBasicSchema = z.object({
  firstName: z.string().min(2, "First name is required").trim(),
  lastName: z.string().min(2, "Last name is required").trim(),
  middleName: z.string().nullable().optional(),
  email: z.string().email("Invalid email address").nullable().optional().or(z.literal('')).transform(e => e?.trim().toLowerCase()),
  phone: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const cleaned = sanitizePhone(val);
        return cleaned || val.replace(/\s+/g, "");
      }
      return val;
    },
    globalPhoneSchema
  ),
  dob: z.preprocess(
    (val) => formatToISODateString(val as any) || val,
    z.string().min(1, "Date of birth is required")
  ),
  gender: z.string().min(1, "Gender is required"),
  branchId: z.string().min(1, "Branch selection is required"),
  address: z.string().min(5, "Address must be at least 5 characters").trim(),
  onboardingStatus: z.string().nullable().optional().default("JOINED"),
});

export const staffProfessionalSchema = z.object({
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  qualification: z.string().min(1, "Qualification is required"),
  experienceYears: z.coerce.number().min(0, "Experience must be 0 or more"),
  dateOfJoining: z.preprocess(
    (val) => formatToISODateString(val as any) || val,
    z.string().min(1, "Date of joining is required")
  ),
  basicSalary: z.coerce.number().min(1, "Basic salary is required"),
  hraFormula: z.string().nullable().optional(),
  daFormula: z.string().nullable().optional(),
});

export const staffStatutorySchema = z.object({
  panNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/, "Invalid PAN format").nullable().optional().or(z.literal('')),
  pfNumber: z.string().trim().nullable().optional(),
  uanNumber: z.string().trim().nullable().optional(),
  esiNumber: z.string().trim().nullable().optional(),
  aadhaarNumber: z.string().trim().length(12, "Aadhaar must be exactly 12 digits").regex(/^\d+$/, "Aadhaar must contain only numbers").nullable().optional().or(z.literal('')),
});

export const staffBankSchema = z.object({
  accountName: z.string().trim().min(1, "Account Name is required").nullable().optional().or(z.literal('')),
  accountNumber: z.string().trim().min(5, "Account Number is required").nullable().optional().or(z.literal('')),
  ifscCode: z.string().trim().toUpperCase().min(4, "IFSC Code is required").nullable().optional().or(z.literal('')),
  bankName: z.string().trim().min(2, "Bank Name is required").nullable().optional().or(z.literal('')),
});

// Full unified schema if needed
export const staffOnboardingSchema = z.object({
  ...staffBasicSchema.shape,
  ...staffProfessionalSchema.shape,
  ...staffStatutorySchema.shape,
  ...staffBankSchema.shape,
});

/**
 * 🏛️ FLEXIBLE BULK SCHEMA
 * Used exclusively for high-volume imports where data might be partial.
 * Relaxes regex constraints but maintains type integrity.
 */
export const flexibleStaffBulkSchema = z.object({
    staffCode: z.string().optional(),
    firstName: z.string().min(1, "Required"),
    lastName: z.string().optional(),
    middleName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    qualification: z.string().optional(),
    experienceYears: z.coerce.number().optional(),
    dateOfJoining: z.string().optional(),
    basicSalary: z.coerce.number().optional(),
    panNumber: z.string().optional(),
    pfNumber: z.string().optional(),
    uanNumber: z.string().optional(),
    esiNumber: z.string().optional(),
    aadhaarNumber: z.string().optional(),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    bankName: z.string().optional(),
    onboardingStatus: z.string().optional(),
    branchId: z.string().optional(),
    schoolId: z.string().optional(),
});

export type StaffBasicData = z.infer<typeof staffBasicSchema>;
export type StaffProfessionalData = z.infer<typeof staffProfessionalSchema>;
export type StaffStatutoryData = z.infer<typeof staffStatutorySchema>;
export type StaffBankData = z.infer<typeof staffBankSchema>;
export type StaffOnboardingData = z.infer<typeof staffOnboardingSchema>;
