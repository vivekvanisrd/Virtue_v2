import { getDayBookReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const date = sp.date || new Date().toISOString().slice(0, 10);
  const result = await getDayBookReport({ date, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Time": new Date(r.paymentDate).toLocaleTimeString("en-IN"),
    "Receipt #": r.receiptNumber,
    "Student": r.studentName,
    "Admission #": r.admissionNumber,
    "Fee Head": r.feeHead || "",
    "Mode": r.paymentMode,
    "Collected By": r.collectedBy,
    "Amount": r.amountPaid,
  }));
  rows.push({ "Time": "", "Receipt #": "", "Student": "TOTAL", "Admission #": "", "Fee Head": "", "Mode": "", "Collected By": "", "Amount": result.data.total });

  const buffer = rowsToXlsxBuffer(rows, "Day Book");
  return xlsxDownloadResponse(buffer, `Day_Book_${date}.xlsx`);
}
