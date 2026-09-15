import { getReversedCollectionsReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to = sp.to || new Date().toISOString().slice(0, 10);
  const result = await getReversedCollectionsReport({ from, to, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Receipt #": r.receiptNumber,
    "Date": new Date(r.paymentDate).toLocaleDateString("en-IN"),
    "Student": r.studentName,
    "Admission #": r.admissionNumber,
    "Fee Head": r.feeHead || "",
    "Mode": r.paymentMode,
    "Amount": r.amountPaid,
    "Note": r.note || "",
  }));
  const buffer = rowsToXlsxBuffer(rows, "Reversed Collections");
  return xlsxDownloadResponse(buffer, `Reversed_Collections_${from}_to_${to}.xlsx`);
}
