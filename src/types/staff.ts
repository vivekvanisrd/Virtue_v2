import * as z from "zod";

export const staffBasicSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  middleName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  phone: z.string().min(10, "Valid phone number is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  branchId: z.string().min(1, "Branch selection is required"),
  address: z.string().min(5, "Address must be at least 5 characters"),
});

export const staffProfessionalSchema = z.object({
  role: z.string().min(1, "Role is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  qualification: z.string().min(1, "Qualification is required"),
  experienceYears: z.coerce.number().min(0, "Experience must be 0 or more"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  basicSalary: z.coerce.number().min(1, "Basic salary is required"),
});

export const staffStatutorySchema = z.object({
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().or(z.literal('')),
  pfNumber: z.string().optional(),
  uanNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  aadhaarNumber: z.string().length(12, "Aadhaar must be exactly 12 digits").regex(/^\d+$/, "Aadhaar must contain only numbers").optional().or(z.literal('')),
});

export const staffBankSchema = z.object({
  accountName: z.string().min(1, "Account Name is required").optional().or(z.literal('')),
  accountNumber: z.string().min(5, "Account Number is required").optional().or(z.literal('')),
  ifscCode: z.string().min(4, "IFSC Code is required").optional().or(z.literal('')),
  bankName: z.string().min(2, "Bank Name is required").optional().or(z.literal('')),
});

// Full unified schema if needed
export const staffOnboardingSchema = z.object({
  ...staffBasicSchema.shape,
  ...staffProfessionalSchema.shape,
  ...staffStatutorySchema.shape,
  ...staffBankSchema.shape,
});

export type StaffBasicData = z.infer<typeof staffBasicSchema>;
export type StaffProfessionalData = z.infer<typeof staffProfessionalSchema>;
export type StaffStatutoryData = z.infer<typeof staffStatutorySchema>;
export type StaffBankData = z.infer<typeof staffBankSchema>;
export type StaffOnboardingData = z.infer<typeof staffOnboardingSchema>;
