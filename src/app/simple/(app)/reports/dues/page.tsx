import { getPendingDuesReport } from "@/lib/actions/simple/report-actions";
import { listDistinctClassNames, listMyBranches } from "@/lib/actions/simple/student-actions";
import { DuesTable } from "@/components/simple/DuesTable";

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

const TERM_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "partial", label: "Partially paid" },
  { value: "term1-due", label: "Term 1 due" },
  { value: "term1-paid", label: "Term 1 paid" },
  { value: "term2-due", label: "Term 2 due" },
  { value: "term2-paid", label: "Term 2 paid" },
  { value: "term3-due", label: "Term 3 due" },
  { value: "term3-paid", label: "Term 3 paid" },
];

type SearchParams = {
  className?: string;
  branchId?: string;
  minBalance?: string;
  termFilter?: string;
  q?: string;
  sortBy?: string;
};

export default async function PendingDuesReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const [result, classesRes, branchesRes] = await Promise.all([
    getPendingDuesReport({
      className: sp.className || undefined,
      branchId: sp.branchId || undefined,
      minBalance: sp.minBalance ? Number(sp.minBalance) : undefined,
      termFilter: (sp.termFilter as any) || "all",
      q: sp.q || undefined,
      sortBy: (sp.sortBy as any) || "balanceDesc",
    }),
    listDistinctClassNames(sp.branchId || undefined),
    listMyBranches(),
  ]);

  const classes = classesRes.success ? classesRes.data : [];
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;

  const exportHref = `/simple/reports/dues/export?${new URLSearchParams(sp as Record<string, string>).toString()}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Pending dues</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Every student who still owes money — filter and sort to find who to chase first.</p>
        </div>
        <a href={exportHref} style={{ ...buttonStyle, background: "#16a34a", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Download as Excel
        </a>
      </div>

      <form
        method="GET"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
      >
        <Field label="Search (name / admission #)">
          <input type="text" name="q" defaultValue={sp.q || ""} placeholder="Type to search…" style={inputStyle} />
        </Field>

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

        <Field label="Term status">
          <select name="termFilter" defaultValue={sp.termFilter || "all"} style={inputStyle}>
            {TERM_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <DuesTable rows={result.data.rows} sortBy={sp.sortBy || "balanceDesc"} basePath="/simple/reports/dues" searchParams={sp} />
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
