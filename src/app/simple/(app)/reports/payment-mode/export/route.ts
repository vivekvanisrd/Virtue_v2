import { getPaymentModeReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date().toISOString().slice(0, 10);
  const to = sp.to || from;
  const result = await getPaymentModeReport({ from, to, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.dailyRows.map((r: any) => ({ "Date": r.date, "Cash": r.cash, "Online": r.online, "Total": r.cash + r.online }));
  const buffer = rowsToXlsxBuffer(rows, "Payment Mode");
  return xlsxDownloadResponse(buffer, `Payment_Mode_Report_${from}_to_${to}.xlsx`);
}
