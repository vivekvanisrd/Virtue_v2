import { getClassSummaryReport } from "@/lib/actions/simple/report-actions";
import { listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function ClassSummaryReportPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const sp = await searchParams;
  const [result, branchesRes] = await Promise.all([
    getClassSummaryReport({ branchId: sp.branchId }),
    listMyBranches(),
  ]);

  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Class summary report</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Committed fee, collected, and dues per class — cash/online split included.</p>
        </div>
        <a
          href={`/simple/reports/class-summary/export${sp.branchId ? `?branchId=${sp.branchId}` : ""}`}
          style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#ffffff", textDecoration: "none" }}
        >
          Download as Excel
        </a>
      </div>

      {canPickBranch && (
        <form method="GET" style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Branch</span>
            <select name="branchId" defaultValue={sp.branchId || ""} style={{ fontSize: 14, padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" }}>
              <option value="">All branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" }}>
            Apply
          </button>
        </form>
      )}

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Class</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Students</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Committed</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Collected</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Dues</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Cash</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Online</th>
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((r) => (
                <tr key={r.className} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{r.className}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.studentCount}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.committed)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.collected)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: r.dues > 0 ? "#b91c1c" : "#111827" }}>{money(r.dues)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.cash)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.online)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700, borderTop: "2px solid #e5e7eb" }}>
                <td style={tdStyle}>GRAND TOTAL</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{result.data.grandTotal.studentCount}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal.committed)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal.collected)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal.dues)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal.cash)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal.online)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "10px", color: "#111827" };
