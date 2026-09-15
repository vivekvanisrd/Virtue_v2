import { getTermWiseCollectionReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getTermWiseCollectionReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Class": r.className,
    "Term 1 Due": r.term1Due,
    "Term 1 Paid": r.term1Paid,
    "Term 2 Due": r.term2Due,
    "Term 2 Paid": r.term2Paid,
    "Term 3 Due": r.term3Due,
    "Term 3 Paid": r.term3Paid,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Term-wise Collection");
  return xlsxDownloadResponse(buffer, `Term_Wise_Collection_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
