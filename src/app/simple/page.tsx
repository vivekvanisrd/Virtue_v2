import { getDashboardSummary } from "@/lib/actions/simple/dashboard-actions";
import { StudentSearch } from "@/components/simple/StudentSearch";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const result = await getDashboardSummary();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Dashboard</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Today's collection, at a glance.</p>
      </div>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <Stat label="Collected today" value={money(result.data.todayTotal)} sub={`${result.data.todayCount} payments`} tone="good" />
            <Stat label="Collected this month" value={money(result.data.monthTotal)} sub={`${result.data.monthCount} payments`} tone="neutral" />
            <Stat label="Pending dues" value={money(result.data.pendingDuesTotal)} sub={`${result.data.pendingDuesCount} students`} tone="due" />
            <Stat label="Total students" value={String(result.data.studentCount)} sub="active" tone="neutral" />
          </div>

          {result.data.branches && (
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}>Students by branch</h2>
              <div style={{ display: "grid", gap: 8 }}>
                {result.data.branches.map((b) => (
                  <div key={b.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <span style={{ color: "#374151" }}>{b.name}</span>
                    <strong style={{ color: "#111827" }}>{b.students}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "#111827" }}>Quick find a student</h2>
        <StudentSearch />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "neutral" | "good" | "due" }) {
  const colors = {
    neutral: { bg: "#ffffff", fg: "#111827", border: "#e5e7eb" },
    good: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
    due: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  }[tone];

  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.fg }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
    </div>
  );
}
