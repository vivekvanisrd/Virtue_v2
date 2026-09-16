import { getClassSummaryReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getClassSummaryReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r) => ({
    "CLASS": r.className,
    "Students": r.studentCount,
    "T1 COLLECTION": r.term1Collection,
    "COMMITMENT": r.committed,
    "COLLECTION": r.collected,
    "DUES": r.dues,
    "Online": r.online,
    "Cash": r.cash,
  }));
  rows.push({
    "CLASS": "GRAND TOTAL",
    "Students": result.data.grandTotal.studentCount,
    "T1 COLLECTION": result.data.grandTotal.term1Collection,
    "COMMITMENT": result.data.grandTotal.committed,
    "COLLECTION": result.data.grandTotal.collected,
    "DUES": result.data.grandTotal.dues,
    "Online": result.data.grandTotal.online,
    "Cash": result.data.grandTotal.cash,
  });
  rows.push({ "CLASS": "% OF COLLECTION", "Students": "" as any, "T1 COLLECTION": "" as any, "COMMITMENT": "" as any, "COLLECTION": `${result.data.percentCollected.toFixed(2)}%` as any, "DUES": "" as any, "Online": "" as any, "Cash": "" as any });
  rows.push({ "CLASS": "AVERAGE PER STUDENT", "Students": "" as any, "T1 COLLECTION": "" as any, "COMMITMENT": "" as any, "COLLECTION": Math.round(result.data.averagePerStudent), "DUES": "" as any, "Online": "" as any, "Cash": "" as any });

  const buffer = rowsToXlsxBuffer(rows, "Class Summary");
  return xlsxDownloadResponse(buffer, `Class_Summary_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
