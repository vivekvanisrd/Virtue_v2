import { getTermWiseCollectionReport } from "@/lib/actions/simple/report-actions";
import { listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function TermWiseCollectionPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const sp = await searchParams;
  const [result, branchesRes] = await Promise.all([
    getTermWiseCollectionReport({ branchId: sp.branchId }),
    listMyBranches(),
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;
  const exportHref = `/simple/reports/term-wise-collection/export${sp.branchId ? `?branchId=${sp.branchId}` : ""}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Term-wise collection report</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Term 1/2/3 due vs paid, rolled up per class across the whole branch.</p>
        </div>
        <a href={exportHref} style={buttonLinkStyle("#16a34a")}>Download as Excel</a>
      </div>

      {canPickBranch && (
        <form method="GET" style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <Field label="Branch">
            <select name="branchId" defaultValue={sp.branchId || ""} style={inputStyle}>
              <option value="">All branches</option>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <button type="submit" style={buttonStyle}>Apply</button>
        </form>
      )}

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle} rowSpan={2}>Class</th>
                <th style={{ ...thStyle, textAlign: "center", borderLeft: "1px solid #e5e7eb" }} colSpan={2}>Term 1</th>
                <th style={{ ...thStyle, textAlign: "center", borderLeft: "1px solid #e5e7eb" }} colSpan={2}>Term 2</th>
                <th style={{ ...thStyle, textAlign: "center", borderLeft: "1px solid #e5e7eb" }} colSpan={2}>Term 3</th>
              </tr>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ ...thStyle, textAlign: "right", borderLeft: "1px solid #e5e7eb" }}>Due</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
                <th style={{ ...thStyle, textAlign: "right", borderLeft: "1px solid #e5e7eb" }}>Due</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
                <th style={{ ...thStyle, textAlign: "right", borderLeft: "1px solid #e5e7eb" }}>Due</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((r: any) => (
                <tr key={r.className} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{r.className}</td>
                  <td style={{ ...tdStyle, textAlign: "right", borderLeft: "1px solid #f3f4f6" }}>{money(r.term1Due)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.term1Paid)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", borderLeft: "1px solid #f3f4f6" }}>{money(r.term2Due)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.term2Paid)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", borderLeft: "1px solid #f3f4f6" }}>{money(r.term3Due)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.term3Paid)}</td>
                </tr>
              ))}
              {result.data.rows.length === 0 && (
                <tr><td style={tdStyle} colSpan={7}><span style={{ color: "#6b7280" }}>No students found.</span></td></tr>
              )}
            </tbody>
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
