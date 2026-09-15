import { getBranchSummaryReport } from "@/lib/actions/simple/report-actions-students";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function BranchSummaryPage() {
  const result = await getBranchSummaryReport();

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Branch-wise summary</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Committed fee, collected, and dues, side by side across every branch.</p>
        </div>
        <a href="/simple/reports/branch-summary/export" style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#ffffff", textDecoration: "none" }}>
          Download as Excel
        </a>
      </div>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>Branch</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Students</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Committed</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Collected</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Dues</th>
              </tr>
            </thead>
            <tbody>
              {result.data.rows.map((r: any) => (
                <tr key={r.branchName} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{r.branchName}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{r.studentCount}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.committed)}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.collected)}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: r.dues > 0 ? "#b91c1c" : "#111827" }}>{money(r.dues)}</td>
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
