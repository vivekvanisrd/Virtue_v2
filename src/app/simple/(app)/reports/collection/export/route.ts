import { getCollectionReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date().toISOString().slice(0, 10);
  const to = sp.to || new Date().toISOString().slice(0, 10);

  const result = await getCollectionReport({
    from,
    to,
    paymentMode: (sp.paymentMode as any) || "all",
    feeHead: sp.feeHead || undefined,
    collectedBy: sp.collectedBy || undefined,
    className: sp.className || undefined,
    branchId: sp.branchId || undefined,
    manualReceiptNumber: sp.manualReceiptNumber || undefined,
    q: sp.q || undefined,
    sortBy: (sp.sortBy as any) || "dateDesc",
  });

  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Receipt No": r.receiptNumber,
    "Manual Receipt No": r.bookReceiptNo || "",
    "Student Name": r.studentName,
    "Admission No": r.admissionNumber || "",
    "Amount Paid": r.amountPaid,
    "Payment Mode": r.paymentMode,
    "Fee Head": r.feeHead || "",
    "Date": new Date(r.paymentDate).toLocaleDateString("en-IN"),
    "Collected By": r.collectedBy,
  }));

  const buffer = rowsToXlsxBuffer(rows, "Collection Report");
  return xlsxDownloadResponse(buffer, `Collection_Report_${from}_to_${to}.xlsx`);
}
