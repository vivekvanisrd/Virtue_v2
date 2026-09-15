import { getNewAdmissionsReport } from "@/lib/actions/simple/report-actions-students";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date().toISOString().slice(0, 10);
  const to = sp.to || from;
  const result = await getNewAdmissionsReport({ from, to, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({
    "Admission Date": r.admissionDate ? new Date(r.admissionDate).toLocaleDateString("en-IN") : "",
    "Student": r.name,
    "Admission #": r.admissionNumber,
    "Class": r.className || "",
    "Branch": r.branchName || "",
    "Parent": r.parentName,
    "Phone": r.parentPhone,
  }));
  const buffer = rowsToXlsxBuffer(rows, "New Admissions");
  return xlsxDownloadResponse(buffer, `New_Admissions_${from}_to_${to}.xlsx`);
}
