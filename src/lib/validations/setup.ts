import { z } from "zod";

export const setupSchema = z.object({
  schoolName: z.string().min(3, "School name is too short"),
  schoolCode: z.string().toUpperCase().min(3, "Code must be at least 3 characters").max(6, "Code too long"),
  address: z.string().min(5, "Address is required"),
  phone: z.string().min(10, "Valid phone required"),
  email: z.string().email("Valid email required"),
  affiliation: z.string().optional(),
  
  ownerFirstName: z.string().min(2, "Owner first name required"),
  ownerLastName: z.string().min(2, "Owner last name required"),
  ownerEmail: z.string().email("Valid owner email required"),
  ownerPhone: z.string().min(10, "Valid owner phone required"),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters"),
  
  academicYear: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-YY (e.g. 2025-26)"),
  academicYearStart: z.string().min(1, "Start date required"),
});

export type SetupInput = z.infer<typeof setupSchema>;
