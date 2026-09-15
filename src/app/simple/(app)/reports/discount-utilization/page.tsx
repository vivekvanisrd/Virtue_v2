import { getDiscountUtilizationReport } from "@/lib/actions/simple/report-actions-students";
import { listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function DiscountUtilizationPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const sp = await searchParams;
  const [result, branchesRes] = await Promise.all([
    getDiscountUtilizationReport({ branchId: sp.branchId }),
    listMyBranches(),
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;
  const exportHref = `/simple/reports/discount-utilization/export${sp.branchId ? `?branchId=${sp.branchId}` : ""}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Discount utilization report</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>How much concession has been given, by discount type.</p>
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
        <>
          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>Discount type</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Students</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total given</th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((r: any) => (
                  <tr key={r.typeName} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>{r.typeName}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{r.studentCount}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}><strong>{money(r.totalAmount)}</strong></td>
                  </tr>
                ))}
                {result.data.rows.length === 0 && (
                  <tr><td style={tdStyle} colSpan={3}><span style={{ color: "#6b7280" }}>No discount-type records found.</span></td></tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid #e5e7eb" }}>
                  <td style={tdStyle}>GRAND TOTAL</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>{money(result.data.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {result.data.detailRows.length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>Detail — every discount record</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Discount type</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.detailRows.map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{r.studentName} <span style={{ color: "#9ca3af" }}>#{r.admissionNumber}</span></td>
                      <td style={tdStyle}>{r.typeName}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{money(r.amount)}</td>
                      <td style={tdStyle}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
