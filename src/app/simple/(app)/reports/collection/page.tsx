import { getCollectionReport, getCollectionFilterOptions } from "@/lib/actions/simple/report-actions";
import { listDistinctClassNames, listMyBranches } from "@/lib/actions/simple/student-actions";
import { CollectionReportTable } from "@/components/simple/CollectionReportTable";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const SORT_OPTIONS = [
  { value: "dateDesc", label: "Date (Newest first)" },
  { value: "dateAsc", label: "Date (Oldest first)" },
  { value: "amountDesc", label: "Amount (High → Low)" },
  { value: "amountAsc", label: "Amount (Low → High)" },
  { value: "nameAsc", label: "Student name (A → Z)" },
  { value: "nameDesc", label: "Student name (Z → A)" },
];

type SearchParams = {
  from?: string;
  to?: string;
  paymentMode?: string;
  feeHead?: string;
  collectedBy?: string;
  className?: string;
  branchId?: string;
  manualReceiptNumber?: string;
  q?: string;
  sortBy?: string;
};

export default async function CollectionReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const from = sp.from || todayStr();
  const to = sp.to || todayStr();

  const [result, filterOptionsRes, classesRes, branchesRes] = await Promise.all([
    getCollectionReport({
      from,
      to,
      paymentMode: (sp.paymentMode as any) || "all",
      feeHead: sp.feeHead || undefined,
      collectedBy: sp.collectedBy || undefined,
      className: sp.className || undefined,
      branchId: sp.branchId || undefined,
      manualReceiptNumber: sp.manualReceiptNumber || undefined,
      q: sp.q || undefined,
      sortBy: (sp.sortBy as any) || "dateDesc",
    }),
    getCollectionFilterOptions(),
    listDistinctClassNames(sp.branchId || undefined),
    listMyBranches(),
  ]);

  const collectors = filterOptionsRes.success ? filterOptionsRes.data.collectors : [];
  const feeHeads = filterOptionsRes.success ? filterOptionsRes.data.feeHeads : [];
  const paymentModes = filterOptionsRes.success ? filterOptionsRes.data.paymentModes : [];
  const classes = classesRes.success ? classesRes.data : [];
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;

  const exportHref = `/simple/reports/collection/export?${new URLSearchParams({ from, to, ...sp } as Record<string, string>).toString()}`;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Collection report</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>All fee payments received, filtered and sorted your way.</p>
        </div>
        <a href={exportHref} style={{ ...buttonStyle, background: "#16a34a", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          Download as Excel
        </a>
      </div>

      <form
        method="GET"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}
      >
        <Field label="Search (student)">
          <input type="text" name="q" defaultValue={sp.q || ""} placeholder="Name or admission #…" style={inputStyle} />
        </Field>

        <Field label="From">
          <input type="date" name="from" defaultValue={from} style={inputStyle} />
        </Field>
        <Field label="To">
          <input type="date" name="to" defaultValue={to} style={inputStyle} />
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

        <Field label="Paid by">
          <select name="paymentMode" defaultValue={sp.paymentMode || "all"} style={inputStyle}>
            <option value="all">All modes</option>
            {paymentModes.map((m: string) => (
              <option key={m} value={m}>{m} only</option>
            ))}
          </select>
        </Field>

        <Field label="Fee head">
          <select name="feeHead" defaultValue={sp.feeHead || ""} style={inputStyle}>
            <option value="">All</option>
            {feeHeads.map((f: string) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Field>

        <Field label="Collected by">
          <select name="collectedBy" defaultValue={sp.collectedBy || ""} style={inputStyle}>
            <option value="">All staff</option>
            {collectors.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>

        <Field label="Manual receipt #">
          <input type="text" name="manualReceiptNumber" defaultValue={sp.manualReceiptNumber || ""} placeholder="e.g. paper book #" style={inputStyle} />
        </Field>

        <Field label="Sort by">
          <select name="sortBy" defaultValue={sp.sortBy || "dateDesc"} style={inputStyle}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button type="submit" style={buttonStyle}>Apply</button>
          <a href="/simple/reports/collection" style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Clear
          </a>
        </div>
      </form>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Stat label="Total collected" value={money(result.data.grandTotal)} />
            {Object.entries(result.data.totalsByMode).map(([mode, total]) => (
              <Stat key={mode} label={mode} value={money(total as number)} />
            ))}
            <Stat label="Payments" value={String(result.data.count)} />
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <CollectionReportTable rows={result.data.rows} sortBy={sp.sortBy || "dateDesc"} basePath="/simple/reports/collection" searchParams={sp} />
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
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 16px" }}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{value}</div>
    </div>
  );
}
