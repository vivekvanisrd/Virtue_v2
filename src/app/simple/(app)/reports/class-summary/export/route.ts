import { getClassSummaryReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getClassSummaryReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r) => ({
    "Class": r.className,
    "Students": r.studentCount,
    "Committed Fee": r.committed,
    "Collected": r.collected,
    "Dues": r.dues,
    "Cash": r.cash,
    "Online": r.online,
  }));
  rows.push({
    "Class": "GRAND TOTAL",
    "Students": result.data.grandTotal.studentCount,
    "Committed Fee": result.data.grandTotal.committed,
    "Collected": result.data.grandTotal.collected,
    "Dues": result.data.grandTotal.dues,
    "Cash": result.data.grandTotal.cash,
    "Online": result.data.grandTotal.online,
  });

  const buffer = rowsToXlsxBuffer(rows, "Class Summary");
  return xlsxDownloadResponse(buffer, `Class_Summary_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
