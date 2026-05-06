"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { PayrollEngine } from "../services/payroll-engine";

interface BulkSalaryRow {
  name: string;
  accountNo: string;
  ifsc: string;
  bankName?: string;
  branchName?: string;
  segment?: string;
  actualSalary: number;
  totalDays: number;
  workedDays: number;
  netSalary: number;
}

export async function processBulkSalaryImportAction(month: number, year: number, rows: BulkSalaryRow[]) {
  try {
    // For the Independent Audit Lab, we use a shared Global ID so it's accessible from anywhere
    const schoolId = "GLOBAL_AUDIT_LAB";
    const branchId = "GLOBAL";

    const results = {
      successCount: 0,
      failCount: 0,
      logs: [] as string[]
    };

    // Process each row into the INDEPENDENT Audit Table using RAW SQL to bypass client-gen issues
    for (const row of rows) {
      try {
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await prisma.$executeRawUnsafe(`
          INSERT INTO "BulkPayoutAuditRecord" (
            "id", "schoolId", "branchId", "month", "year", "staffName", 
            "accountNumber", "ifscCode", "bankName", "branchName", "segment", 
            "actualSalary", "netSalary", "totalDays", "presentDays", "status", "processedAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        `, 
          id, schoolId, branchId, month, year, row.name, 
          row.accountNo, row.ifsc, row.bankName || null, row.branchName || null, row.segment || "GENERAL", 
          row.actualSalary, row.netSalary, row.totalDays, row.workedDays, "Processed", new Date(), new Date()
        );
        results.successCount++;
      } catch (err: any) {
        results.failCount++;
        results.logs.push(`FAILED: ${row.name} - ${err.message || "Database Error"}`);
        console.error("Audit Save Error:", err);
      }
    }

    revalidatePath("/dashboard");
    return { success: true, data: results };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAuditHistoryAction() {
  try {
    const schoolId = "GLOBAL_AUDIT_LAB";

    // Use RAW SQL to bypass client-gen issues
    const records = await prisma.$queryRawUnsafe(`
      SELECT * FROM "BulkPayoutAuditRecord" 
      WHERE "schoolId" = $1 
      ORDER BY "processedAt" DESC 
      LIMIT 100
    `, schoolId) as any[];

    // CONVERT DECIMAL TO NUMBER for Next.js serialization
    const serializedRecords = records.map(r => ({
      ...r,
      actualSalary: Number(r.actualSalary),
      netSalary: Number(r.netSalary)
    }));

    return { success: true, data: serializedRecords };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
