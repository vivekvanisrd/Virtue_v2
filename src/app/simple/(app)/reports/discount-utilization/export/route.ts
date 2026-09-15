import { getDiscountUtilizationReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getDiscountUtilizationReport({ branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.detailRows.map((r: any) => ({
    "Student": r.studentName,
    "Admission #": r.admissionNumber,
    "Discount Type": r.typeName,
    "Amount": r.amount,
    "Status": r.status,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Discount Utilization");
  return xlsxDownloadResponse(buffer, `Discount_Utilization_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
