import { z } from "zod";
import { trim, toUpperCase, toLowerCase, toTitleCase } from "../utils/validations";


export const setupSchema = z.object({
  schoolName: z.string().min(3, "School name is too short").transform(toTitleCase),
  schoolCode: z.string().min(3, "Code must be at least 3 characters").max(6, "Code too long").transform(toUpperCase),
  address: z.string().optional().default(""),
  phone: z.string().min(10, "Valid phone required").transform(trim),
  email: z.string().email("Valid email required").transform(toLowerCase),
  affiliation: z.string().optional().default(""),

  ownerFirstName: z.string().min(1, "Owner first name required").transform(toTitleCase),
  ownerLastName: z.string().min(1, "Owner last name required").transform(toTitleCase),
  ownerEmail: z.string().email("Valid owner email required").transform(toLowerCase),

  academicYear: z.string().regex(/^\d{4}-\d{2}$/, "Format: YYYY-YY (e.g. 2026-27)").transform(trim),
  academicYearStart: z.string().min(1, "Start date required"),
});


export type SetupInput = z.infer<typeof setupSchema>;
