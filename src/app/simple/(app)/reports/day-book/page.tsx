import Link from "next/link";
import { getDayBookReport } from "@/lib/actions/simple/report-actions";
import { listMyBranches } from "@/lib/actions/simple/student-actions";
import { StudentHoverCard } from "@/components/simple/StudentHoverCard";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DayBookPage({ searchParams }: { searchParams: Promise<{ date?: string; branchId?: string }> }) {
  const sp = await searchParams;
  const date = sp.date || todayStr();

  const [result, branchesRes] = await Promise.all([
    getDayBookReport({ date, branchId: sp.branchId }),
    listMyBranches(),
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;
  const exportHref = `/simple/reports/day-book/export?${new URLSearchParams({ date, ...(sp.branchId ? { branchId: sp.branchId } : {}) }).toString()}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Day book</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>One day's full cash-up sheet — every collection, cash/online split, staff-wise.</p>
        </div>
        <a href={exportHref} style={buttonLinkStyle("#16a34a")}>Download as Excel</a>
      </div>

      <form method="GET" style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Field label="Date">
          <input type="date" name="date" defaultValue={date} style={inputStyle} />
        </Field>
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
            <Stat label="Total collected" value={money(result.data.total)} />
            <Stat label="Cash" value={money(result.data.cash)} />
            <Stat label="Online" value={money(result.data.online)} />
            <Stat label="Payments" value={String(result.data.count)} />
          </div>

          {Object.keys(result.data.byStaff).length > 0 && (
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 8 }}>By staff</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {Object.entries(result.data.byStaff).map(([name, amt]) => (
                  <div key={name} style={{ fontSize: 14 }}>
                    <span style={{ color: "#6b7280" }}>{name}: </span>
                    <strong style={{ color: "#111827" }}>{money(amt as number)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Receipt #</th>
                  <th style={thStyle}>Student</th>
                  <th style={thStyle}>Fee head</th>
                  <th style={thStyle}>Mode</th>
                  <th style={thStyle}>Collected by</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {result.data.rows.map((r: any, i: number) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{new Date(r.paymentDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td style={tdStyle}>{r.receiptNumber}</td>
                    <td style={tdStyle}>
                      <StudentHoverCard studentId={r.studentId}>
                        <Link href={`/simple/students/${r.studentId}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>{r.studentName}</Link>
                      </StudentHoverCard>{" "}
                      <span style={{ color: "#9ca3af" }}>#{r.admissionNumber}</span>
                    </td>
                    <td style={tdStyle}>{r.feeHead || "—"}</td>
                    <td style={tdStyle}>{r.paymentMode}</td>
                    <td style={tdStyle}>{r.collectedBy}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}><strong>{money(r.amountPaid)}</strong></td>
                  </tr>
                ))}
                {result.data.rows.length === 0 && (
                  <tr><td style={tdStyle} colSpan={8}><span style={{ color: "#6b7280" }}>No collections on this date.</span></td></tr>
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
