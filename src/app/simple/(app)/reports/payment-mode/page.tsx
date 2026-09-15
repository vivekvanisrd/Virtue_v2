import { getPaymentModeReport } from "@/lib/actions/simple/report-actions";
import { listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PaymentModeReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || todayStr();
  const to = sp.to || todayStr();

  const [result, branchesRes] = await Promise.all([
    getPaymentModeReport({ from, to, branchId: sp.branchId }),
    listMyBranches(),
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;
  const exportHref = `/simple/reports/payment-mode/export?${new URLSearchParams({ from, to, ...(sp.branchId ? { branchId: sp.branchId } : {}) }).toString()}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Payment mode report</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Cash vs online totals over a date range, with a day-by-day trend.</p>
        </div>
        <a href={exportHref} style={buttonLinkStyle("#16a34a")}>Download as Excel</a>
      </div>

      <form method="GET" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="From"><input type="date" name="from" defaultValue={from} style={inputStyle} /></Field>
        <Field label="To"><input type="date" name="to" defaultValue={to} style={inputStyle} /></Field>
        {canPickBranch && (
          <Field label="Branch">
            <select name="branchId" defaultValue={sp.branchId || ""} style={inputStyle}>
              <option value="">All branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
        )}
        <button type="submit" style={buttonStyle}>Apply</button>
      </form>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Grand total" value={money(result.data.grandTotal)} />
            {Object.entries(result.data.totalsByMode).map(([mode, total]) => (
              <Stat key={mode} label={`${mode} (${result.data.countsByMode[mode]})`} value={money(total as number)} />
            ))}
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Cash</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Online</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.data.dailyRows.map((r: any) => (
                  <tr key={r.date} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.cash)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.online)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}><strong>{money(r.cash + r.online)}</strong></td>
                  </tr>
                ))}
                {result.data.dailyRows.length === 0 && (
                  <tr><td style={tdStyle} colSpan={4}><span style={{ color: "#6b7280" }}>No collections in this range.</span></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function buttonLinkStyle(bg: string): React.CSSProperties {
  return { fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: bg, color: "#ffffff", textDecoration: "none" };
}
const inputStyle: React.CSSProperties = { fontSize: 14, padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" };
const buttonStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" };
const thStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "10px", color: "#111827" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px" }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}
