import { getFeeHeadLedgerReport } from "@/lib/actions/simple/report-actions";
import { rowsToXlsxBuffer, xlsxDownloadResponse } from "@/lib/actions/simple/export-xlsx";

export async function GET(request: Request) {
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const from = sp.from || new Date().toISOString().slice(0, 10);
  const to = sp.to || from;
  const result = await getFeeHeadLedgerReport({ from, to, branchId: sp.branchId || undefined });
  if (!result.success) return new Response(result.error, { status: 400 });

  const rows = result.data.rows.map((r: any) => ({ "Fee Head": r.feeHead, "Payments": r.count, "Cash": r.cash, "Online": r.online, "Total": r.total }));
  rows.push({ "Fee Head": "GRAND TOTAL", "Payments": "", "Cash": "", "Online": "", "Total": result.data.grandTotal } as any);
  const buffer = rowsToXlsxBuffer(rows, "Fee Head Ledger");
  return xlsxDownloadResponse(buffer, `Fee_Head_Ledger_${from}_to_${to}.xlsx`);
}
