import { getRevenueLeakageReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getRevenueLeakageReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Student": r.name,
    "Admission #": r.admissionNumber,
    "Class": r.className || "",
    "Branch": r.branchName || "",
    "Parent": r.parentName,
    "Phone": r.parentPhone,
    "Issue": r.hasFinancialRecord ? "₹0 tuition set" : "No fee profile at all",
  }));
  const buffer = rowsToXlsxBuffer(rows, "Revenue Leakage");
  return xlsxDownloadResponse(buffer, `Revenue_Leakage_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
