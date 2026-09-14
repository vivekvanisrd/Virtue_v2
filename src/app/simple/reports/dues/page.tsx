import Link from "next/link";
import { getPendingDuesReport } from "@/lib/actions/simple/report-actions";
import { listDistinctClassNames, listMyBranches } from "@/lib/actions/simple/student-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

const SORT_OPTIONS = [
  { value: "balanceDesc", label: "Balance due (High → Low)" },
  { value: "balanceAsc", label: "Balance due (Low → High)" },
  { value: "nameAsc", label: "Name (A → Z)" },
  { value: "nameDesc", label: "Name (Z → A)" },
  { value: "totalFeeDesc", label: "Total fee (High → Low)" },
  { value: "totalFeeAsc", label: "Total fee (Low → High)" },
  { value: "paidDesc", label: "Paid so far (High → Low)" },
  { value: "paidAsc", label: "Paid so far (Low → High)" },
];

type SearchParams = {
  className?: string;
  branchId?: string;
  minBalance?: string;
  sortBy?: string;
};

export default async function PendingDuesReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const [result, classesRes, branchesRes] = await Promise.all([
    getPendingDuesReport({
      className: sp.className || undefined,
      branchId: sp.branchId || undefined,
      minBalance: sp.minBalance ? Number(sp.minBalance) : undefined,
      sortBy: (sp.sortBy as any) || "balanceDesc",
    }),
    listDistinctClassNames(sp.branchId || undefined),
    listMyBranches(),
  ]);

  const classes = classesRes.success ? classesRes.data : [];
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Pending dues</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Every student who still owes money — filter and sort to find who to chase first.</p>
      </div>

      <form
        method="GET"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
      >
        {canPickBranch && (
          <Field label="Branch">
            <select name="branchId" defaultValue={sp.branchId || ""} style={inputStyle}>
              <option value="">All branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Class">
          <select name="className" defaultValue={sp.className || ""} style={inputStyle}>
            <option value="">All classes</option>
            {classes.map((c: any) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Minimum balance (₹)">
          <input type="number" name="minBalance" defaultValue={sp.minBalance || ""} placeholder="e.g. 5000" style={inputStyle} />
        </Field>

        <Field label="Sort by">
          <select name="sortBy" defaultValue={sp.sortBy || "balanceDesc"} style={inputStyle}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button type="submit" style={buttonStyle}>Apply</button>
          <a href="/simple/reports/dues" style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Clear
          </a>
        </div>
      </form>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12 }}>
            <Stat label="Total pending" value={money(result.data.totalDue)} tone="due" />
            <Stat label="Students with dues" value={String(result.data.count)} tone="neutral" />
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                    <Th>Student</Th>
                    <Th>Class</Th>
                    <Th>Branch</Th>
                    <Th>Total fee</Th>
                    <Th>Paid</Th>
                    <Th>Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.rows.map((r: any) => (
                    <tr key={r.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <Td>
                        <Link href={`/simple/students/${r.id}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                          {r.name}
                        </Link>
                        {r.admissionNumber && <span style={{ color: "#9ca3af" }}> #{r.admissionNumber}</span>}
                      </Td>
                      <Td>{r.className || "—"}</Td>
                      <Td>{r.branchName || "—"}</Td>
                      <Td>{money(r.totalCharges)}</Td>
                      <Td>{money(r.paid)}</Td>
                      <Td>
                        <strong style={{ color: "#b91c1c" }}>{money(r.balance)}</strong>
                      </Td>
                    </tr>
                  ))}
                  {result.data.rows.length === 0 && (
                    <tr>
                      <Td colSpan={6}>
                        <span style={{ color: "#6b7280" }}>No pending dues match these filters.</span>
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { fontSize: 14, padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827", width: "100%" };
const buttonStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
function Stat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "due" }) {
  const colors = tone === "due" ? { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" } : { bg: "#ffffff", fg: "#111827", border: "#e5e7eb" };
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 16px" }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: colors.fg }}>{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: "10px 14px", color: "#111827" }}>
      {children}
    </td>
  );
}
