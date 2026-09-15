import { getBranchSummaryReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET() {
  const result = await getBranchSummaryReport();
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Branch": r.branchName,
    "Students": r.studentCount,
    "Committed": r.committed,
    "Collected": r.collected,
    "Dues": r.dues,
  }));
  rows.push({ "Branch": "GRAND TOTAL", "Students": result.data.grandTotal.studentCount, "Committed": result.data.grandTotal.committed, "Collected": result.data.grandTotal.collected, "Dues": result.data.grandTotal.dues });
  const buffer = rowsToXlsxBuffer(rows, "Branch Summary");
  return xlsxDownloadResponse(buffer, `Branch_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
