import { getReceiptRegisterReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date().toISOString().slice(0, 10);
  const to = sp.to || from;
  const result = await getReceiptRegisterReport({ from, to, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Receipt #": r.receiptNumber,
    "Manual Receipt #": r.bookReceiptNo || "",
    "Date": new Date(r.paymentDate).toLocaleDateString("en-IN"),
    "Student": r.studentName,
    "Admission #": r.admissionNumber,
    "Mode": r.paymentMode,
    "Amount": r.amountPaid,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Receipt Register");
  return xlsxDownloadResponse(buffer, `Receipt_Register_${from}_to_${to}.xlsx`);
}
