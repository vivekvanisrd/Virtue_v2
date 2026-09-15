import { getTransportFeeReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getTransportFeeReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Student": r.name,
    "Admission #": r.admissionNumber,
    "Class": r.className || "",
    "Branch": r.branchName || "",
    "Expected": r.expected,
    "Collected": r.collected,
    "Balance": r.balance,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Transport Fee");
  return xlsxDownloadResponse(buffer, `Transport_Fee_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
