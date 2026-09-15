import { getPendingDuesReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);

  const result = await getPendingDuesReport({
    className: sp.className || undefined,
    branchId: sp.branchId || undefined,
    minBalance: sp.minBalance ? Number(sp.minBalance) : undefined,
    termFilter: (sp.termFilter as any) || undefined,
    q: sp.q || undefined,
    sortBy: (sp.sortBy as any) || "balanceDesc",
  });

  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Admission No": r.admissionNumber || "",
    "Student Name": r.name,
    "Class": r.className || "",
    "Branch": r.branchName || "",
    "Father Name": r.parentName || "",
    "Phone": r.parentPhone || "",
    "Total Fee": r.totalCharges,
    "Paid": r.paid,
    "Balance Due": r.balance,
  }));

  const buffer = rowsToXlsxBuffer(rows, "Pending Dues");
  return xlsxDownloadResponse(buffer, `Pending_Dues_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
