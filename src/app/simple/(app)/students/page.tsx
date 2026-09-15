import Link from "next/link";
import { listStudents, listDistinctClassNames, listStudentFilterOptions, listMyBranches } from "@/lib/actions/simple/student-actions";
import { StudentSearch } from "@/components/simple/StudentSearch";
import { StudentsTable } from "@/components/simple/StudentsTable";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "name", label: "Name (A → Z)" },
  { value: "nameDesc", label: "Name (Z → A)" },
  { value: "admissionNumber", label: "Admission # (A → Z)" },
  { value: "admissionNumberDesc", label: "Admission # (Z → A)" },
  { value: "class", label: "Class (Nursery → 9th)" },
  { value: "classDesc", label: "Class (9th → Nursery)" },
  { value: "balance", label: "Balance due (High → Low)" },
  { value: "balanceAsc", label: "Balance due (Low → High)" },
  { value: "totalFee", label: "Total fee (High → Low)" },
  { value: "totalFeeAsc", label: "Total fee (Low → High)" },
  { value: "paid", label: "Paid so far (High → Low)" },
  { value: "paidAsc", label: "Paid so far (Low → High)" },
  { value: "joiningDate", label: "Joining date (Newest first)" },
  { value: "joiningDateAsc", label: "Joining date (Oldest first)" },
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
  page?: string;
  className?: string;
  branchId?: string;
  gender?: string;
  status?: string;
  feeStatus?: string;
  transport?: string;
  termFilter?: string;
  q?: string;
  sortBy?: string;
};

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, classesRes, filterOptionsRes, branchesRes] = await Promise.all([
    listStudents({
      page,
      className: sp.className || undefined,
      branchId: sp.branchId || undefined,
      gender: sp.gender || undefined,
      status: (sp.status as any) || "active",
      feeStatus: (sp.feeStatus as any) || "all",
      transport: (sp.transport as any) || "all",
      termFilter: (sp.termFilter as any) || "all",
      q: sp.q || undefined,
      sortBy: (sp.sortBy as any) || "name",
    }),
    listDistinctClassNames(sp.branchId || undefined),
    listStudentFilterOptions(sp.branchId || undefined),
    listMyBranches(),
  ]);

  const classes = classesRes.success ? classesRes.data : [];
  const genders = filterOptionsRes.success ? filterOptionsRes.data.genders : [];
  const branches = branchesRes.success ? branchesRes.data : [];
  const canPickBranch = branchesRes.success && branchesRes.canPickBranch;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Students</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Search, filter, sort, or add a new student.</p>
        </div>
        <Link
          href="/simple/students/add"
          style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", background: "#2563eb", borderRadius: 8, padding: "10px 16px", textDecoration: "none" }}
        >
          + Add student
        </Link>
      </div>

      <StudentSearch />

      <form method="GET" style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <Field label="Name / admission #">
            <input type="text" name="q" defaultValue={sp.q || ""} placeholder="Type to filter…" style={inputStyle} />
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

          <Field label="Gender">
            <select name="gender" defaultValue={sp.gender || ""} style={inputStyle}>
              <option value="">All</option>
              {genders.map((g: string) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select name="status" defaultValue={sp.status || "active"} style={inputStyle}>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
              <option value="all">All</option>
            </select>
          </Field>

          <Field label="Fee status">
            <select name="feeStatus" defaultValue={sp.feeStatus || "all"} style={inputStyle}>
              <option value="all">All</option>
              <option value="dues">Has dues</option>
              <option value="paid-up">Fully paid</option>
              <option value="no-payment">No payment yet</option>
            </select>
          </Field>

          <Field label="Transport">
            <select name="transport" defaultValue={sp.transport || "all"} style={inputStyle}>
              <option value="all">All</option>
              <option value="yes">Uses transport</option>
              <option value="no">No transport</option>
            </select>
          </Field>

          <Field label="Term status">
            <select name="termFilter" defaultValue={sp.termFilter || "all"} style={inputStyle}>
              {TERM_FILTER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Sort by">
            <select name="sortBy" defaultValue={sp.sortBy || "name"} style={inputStyle}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" style={buttonStyle}>Apply filters</button>
          <Link href="/simple/students" style={{ ...buttonStyle, background: "#f3f4f6", color: "#374151", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Clear all
          </Link>
        </div>
      </form>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 16 }}>
            <StudentsTable
              students={result.data.students}
              page={page}
              pageSize={result.data.pageSize}
              sortBy={sp.sortBy || "name"}
              basePath="/simple/students"
              searchParams={sp}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: "1px solid #f3f4f6",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            <span>
              {result.data.total} students · page {result.data.page} of {Math.max(1, Math.ceil(result.data.total / result.data.pageSize))}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {page > 1 && (
                <Link href={pageLink(sp, page - 1)} style={pagerLink}>← Prev</Link>
              )}
              {page * result.data.pageSize < result.data.total && (
                <Link href={pageLink(sp, page + 1)} style={pagerLink}>Next →</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pageLink(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") params.set(k, v);
  params.set("page", String(page));
  return `/simple/students?${params.toString()}`;
}

const pagerLink: React.CSSProperties = { color: "#2563eb", textDecoration: "none", fontWeight: 600 };
const inputStyle: React.CSSProperties = { fontSize: 14, padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827", width: "100%" };
const buttonStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
