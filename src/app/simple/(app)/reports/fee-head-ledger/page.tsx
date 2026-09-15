import { getFeeHeadLedgerReport } from "@/lib/actions/simple/report-actions";
import { listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function FeeHeadLedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string }> }) {
  const sp = await searchParams;
  const from = sp.from || monthStartStr();
  const to = sp.to || todayStr();

  const [result, branchesRes] = await Promise.all([
    getFeeHeadLedgerReport({ from, to, branchId: sp.branchId }),
    listMyBranches(),
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;
  const exportHref = `/simple/reports/fee-head-ledger/export?${new URLSearchParams({ from, to, ...(sp.branchId ? { branchId: sp.branchId } : {}) }).toString()}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Fee head ledger</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Revenue split by category — Tuition, Admission, Transport, General — over a date range.</p>
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
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Fee head</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Payments</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cash</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Online</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((r: any) => (
                <tr key={r.feeHead} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{r.feeHead}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.count}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.cash)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.online)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}><strong>{money(r.total)}</strong></td>
                </tr>
              ))}
              {result.data.rows.length === 0 && (
                <tr><td style={tdStyle} colSpan={5}><span style={{ color: "#6b7280" }}>No collections in this range.</span></td></tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: "2px solid #e5e7eb" }}>
                <td style={tdStyle}>GRAND TOTAL</td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={tdStyle}></td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
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
