import { getAdvancePaymentsReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getAdvancePaymentsReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Student": r.name,
    "Admission #": r.admissionNumber,
    "Class": r.className || "",
    "Branch": r.branchName || "",
    "Parent": r.parentName,
    "Phone": r.parentPhone,
    "Committed": r.totalCharges,
    "Paid": r.paid,
    "Advance": r.advance,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Advance Payments");
  return xlsxDownloadResponse(buffer, `Advance_Payments_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
