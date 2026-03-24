"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/utils/audit-logger";

// Expected schema for a single CSV row
const csvRowSchema = z.object({
  firstName: z.string().min(2, "First Name required"),
  lastName: z.string().min(1, "Last Name required"),
  staffCode: z.string().min(2, "Employee ID required"),
  email: z.string().email("Valid email required").optional().or(z.literal("")),
  phone: z.string().min(10, "Phone must be at least 10 chars").optional().or(z.literal("")),
  role: z.string().min(2, "Role is required"),
  
  // Optional columns mapping to Staff model
  middleName: z.string().optional(),
  gender: z.string().optional(),
  status: z.string().optional().default("Active")
});

export type StaffCSVRow = z.infer<typeof csvRowSchema>;

export type ImportResult = {
  success: boolean;
  insertedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; employeeId?: string; name: string; reason: string }>;
};

/**
 * Validates, checks for duplicates, and imports an array of parsed CSV staff records.
 * 
 * @param records parsed CSV array
 * @param schoolId current active tenant ID
 * @param branchId active tenant branch ID
 */
export async function importStaffCSV(records: any[], schoolId: string, branchId: string): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    insertedCount: 0,
    skippedCount: 0,
    errors: []
  };

  if (!records || records.length === 0) {
    result.success = false;
    result.errors.push({ row: 0, name: "File", reason: "CSV file is empty or missing headers." });
    return result;
  }

  // Pre-fetch all existing staff to avoid querying inside a loop
  // Or we can just let Prisma catch duplicates via constraints if we use $transaction
  // But doing a pre-check allows granular error reporting per row.
  const existingStaff = await prisma.staff.findMany({
    where: { schoolId },
    select: { staffCode: true, email: true, phone: true }
  });

  const existingEmails = new Set(existingStaff.filter(s => s.email).map(s => s.email?.toLowerCase()));
  const existingPhones = new Set(existingStaff.filter(s => s.phone).map(s => s.phone));
  const existingEmployeeIds = new Set(existingStaff.map(s => s.staffCode.toUpperCase()));

  const validRecordsToInsert: any[] = [];
  
  // Track duplicates *within* the CSV itself
  const csvEmails = new Set<string>();
  const csvPhones = new Set<string>();
  const csvEmployeeIds = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const rawRow = records[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for Header row
    
    try {
      // 1. Validate Schema Structure
      const row = csvRowSchema.parse(rawRow);
      
      const email = row.email ? row.email.toLowerCase() : undefined;
      const phone = row.phone;
      const empId = row.staffCode.toUpperCase();
      const fullName = `${row.firstName} ${row.lastName}`;

      // 2. Validate Global System DB Duplicates
      let duplicateReason = "";
      if (email && existingEmails.has(email)) duplicateReason = `Email '${email}' already exists in DB.`;
      else if (phone && existingPhones.has(phone)) duplicateReason = `Phone '${phone}' already exists in DB.`;
      else if (existingEmployeeIds.has(empId)) duplicateReason = `Employee ID '${empId}' already exists in this school.`;
      
      // 3. Validate Within-CSV Duplicates
      else if (email && csvEmails.has(email)) duplicateReason = `Duplicate Email '${email}' within the CSV itself.`;
      else if (phone && csvPhones.has(phone)) duplicateReason = `Duplicate Phone '${phone}' within the CSV itself.`;
      else if (csvEmployeeIds.has(empId)) duplicateReason = `Duplicate Employee ID '${empId}' within the CSV itself.`;

      if (duplicateReason !== "") {
        result.skippedCount++;
        result.errors.push({ row: rowNum, employeeId: row.staffCode, name: fullName, reason: duplicateReason });
        continue; // Skip insertion for this row
      }

      // Add to tracked CSV sets
      if (email) csvEmails.add(email);
      if (phone) csvPhones.add(phone);
      csvEmployeeIds.add(empId);

      // Add to valid insert batch
      validRecordsToInsert.push({
        firstName: row.firstName,
        lastName: row.lastName,
        middleName: row.middleName || null,
        staffCode: empId,
        email: email || null,
        phone: phone || null,
        role: row.role.toUpperCase(), // Ensure we cast role securely
        gender: row.gender || null,
        status: row.status,
        schoolId,
        branchId
      });

    } catch (err: any) {
      result.skippedCount++;
      const zErr = err.issues ? err.issues.map((iss:any) => iss.message).join(", ") : "Invalid data structure";
      result.errors.push({ 
        row: rowNum, 
        employeeId: rawRow.staffCode || "?", 
        name: `${rawRow.firstName || '?'} ${rawRow.lastName || '?'}`, 
        reason: zErr 
      });
    }
  }

  // 4. Batch Insert Valid Records
  if (validRecordsToInsert.length > 0) {
    try {
      const dbResult = await prisma.staff.createMany({
        data: validRecordsToInsert,
        skipDuplicates: true // Safe-guard just in case
      });
      result.insertedCount = dbResult.count;

      // Log the bulk import activity
      await logActivity({
        schoolId,
        userId: "SYSTEM_IMPORT", // Replace with actual user ID from session when available
        entityType: "STAFF",
        entityId: "BULK",
        action: "IMPORT",
        details: `Bulk imported ${dbResult.count} staff records via CSV.`
      });
    } catch (dbErr: any) {
      console.error("Batch insertion failed:", dbErr);
      return { ...result, success: false, errors: [...result.errors, { row: 0, name: "System", reason: "Database batch insert failed unexpectedly." }] };
    }
  }

  return result;
}
