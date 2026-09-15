import Link from "next/link";
import { getDashboardSummary } from "@/lib/actions/simple/dashboard-actions";
import { StudentSearch } from "@/components/simple/StudentSearch";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const result = await getDashboardSummary();
  const today = todayStr();
  const monthStart = monthStartStr();

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
          <StatRow
            heading="All branches"
            headingHref={undefined}
            todayTotal={result.data.todayTotal}
            todayCount={result.data.todayCount}
            monthTotal={result.data.monthTotal}
            monthCount={result.data.monthCount}
            pendingDuesTotal={result.data.pendingDuesTotal}
            pendingDuesCount={result.data.pendingDuesCount}
            studentCount={result.data.studentCount}
            today={today}
            monthStart={monthStart}
            branchId={undefined}
          />

          {result.data.branchStats?.map((b) => (
            <StatRow
              key={b.id}
              heading={b.name}
              headingHref={`/simple/reports/class-summary?branchId=${b.id}`}
              todayTotal={b.todayTotal}
              todayCount={b.todayCount}
              monthTotal={b.monthTotal}
              monthCount={b.monthCount}
              pendingDuesTotal={b.pendingDuesTotal}
              pendingDuesCount={b.pendingDuesCount}
              studentCount={b.studentCount}
              today={today}
              monthStart={monthStart}
              branchId={b.id}
            />
          ))}
        </>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "#111827" }}>Quick find a student</h2>
        <StudentSearch />
      </div>
    </div>
  );
}

function StatRow({
  heading,
  headingHref,
  todayTotal,
  todayCount,
  monthTotal,
  monthCount,
  pendingDuesTotal,
  pendingDuesCount,
  studentCount,
  today,
  monthStart,
  branchId,
}: {
  heading: string;
  headingHref: string | undefined;
  todayTotal: number;
  todayCount: number;
  monthTotal: number;
  monthCount: number;
  pendingDuesTotal: number;
  pendingDuesCount: number;
  studentCount: number;
  today: string;
  monthStart: string;
  branchId: string | undefined;
}) {
  const branchQS = branchId ? `&branchId=${branchId}` : "";
  const branchQSFirst = branchId ? `?branchId=${branchId}` : "";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {headingHref ? (
        <Link href={headingHref} style={{ fontSize: 15, fontWeight: 700, color: "#374151", textDecoration: "none" }}>
          {heading} →
        </Link>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{heading}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard
          href={`/simple/reports/day-book?date=${today}${branchQS}`}
          label="Collected today"
          value={money(todayTotal)}
          sub={`${todayCount} payments`}
          tone="good"
        />
        <StatCard
          href={`/simple/reports/collection?from=${monthStart}&to=${today}${branchQS}`}
          label="Collected this month"
          value={money(monthTotal)}
          sub={`${monthCount} payments`}
          tone="neutral"
        />
        <StatCard
          href={`/simple/reports/dues${branchQSFirst}`}
          label="Pending dues"
          value={money(pendingDuesTotal)}
          sub={`${pendingDuesCount} students`}
          tone="due"
        />
        <StatCard
          href={`/simple/students?status=active${branchQS}`}
          label="Total students"
          value={String(studentCount)}
          sub="active"
          tone="neutral"
        />
      </div>
    </div>
  );
}

function StatCard({ href, label, value, sub, tone }: { href: string; label: string; value: string; sub: string; tone: "neutral" | "good" | "due" }) {
  const colors = {
    neutral: { bg: "#ffffff", fg: "#111827", border: "#e5e7eb" },
    good: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
    due: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  }[tone];

  return (
    <Link
      href={href}
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, textDecoration: "none", display: "block" }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.fg }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
    </Link>
  );
}
