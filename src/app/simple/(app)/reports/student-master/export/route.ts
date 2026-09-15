import { getStudentMasterReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const result = await getStudentMasterReport({ branchId: sp.branchId || undefined, className: sp.className || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Student": r.name,
    "Admission #": r.admissionNumber,
    "Gender": r.gender,
    "Class": r.className || "",
    "Section": r.sectionName || "",
    "Branch": r.branchName || "",
    "Parent": r.parentName,
    "Phone": r.parentPhone,
    "Total Fee": r.totalCharges,
    "Paid": r.paid,
    "Balance": r.balance,
  }));
  const buffer = rowsToXlsxBuffer(rows, "Student Master");
  return xlsxDownloadResponse(buffer, `Student_Master_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
