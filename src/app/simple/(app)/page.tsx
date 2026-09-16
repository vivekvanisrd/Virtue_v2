import Link from "next/link";
import { getDashboardSummary } from "@/lib/actions/simple/dashboard-actions";
import { getLastSheetCheckSummary } from "@/lib/actions/simple/sheet-sync-actions";
import { requireIdentity } from "@/lib/actions/simple/shared";
import { StudentSearch } from "@/components/simple/StudentSearch";
import { RealtimeRefresher } from "@/components/simple/RealtimeRefresher";
import { GuidedTour, type TourStep } from "@/components/simple/GuidedTour";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

const DASHBOARD_TOUR: TourStep[] = [
  { target: '[data-tour="stat-today"]', title: "Collected today", body: "How much cash + online payments came in today, across every branch you can see. Click it any time to see the full list of today's payments." },
  { target: '[data-tour="stat-month"]', title: "Collected this month", body: "Running total since the 1st of the month. Click through to the Collection report to filter by class, mode, or staff." },
  { target: '[data-tour="stat-dues"]', title: "Pending dues", body: "Total still owed by every student, and how many students owe something. This is the one to watch — click it to see exactly who to chase." },
  { target: '[data-tour="stat-students"]', title: "Total students", body: "Active student count. Click through to the full student list, where you can search, filter, and sort." },
  { target: '[data-tour="quick-find"]', title: "Quick find a student", body: "Type any part of a name or admission number here to jump straight to a student's profile — the fastest way to look someone up." },
];

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
  const identity = await requireIdentity();
  const result = await getDashboardSummary();
  const today = todayStr();
  const monthStart = monthStartStr();
  const canSyncSheet = MANAGER_ROLES.has(identity.role);
  const lastSheetCheck = canSyncSheet ? await getLastSheetCheckSummary() : null;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Dashboard</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Today's collection, at a glance.</p>
      </div>

      {canSyncSheet && (
        <Link
          href="/simple/sheet-sync"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: "12px 16px",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 14, color: "#92400e" }}>
            <strong>Google Sheet:</strong>{" "}
            {lastSheetCheck?.success && lastSheetCheck.data ? (
              <>
                last checked {new Date(lastSheetCheck.data.checkedAt).toLocaleString("en-IN")} —{" "}
                {lastSheetCheck.data.newStudents + lastSheetCheck.data.newPayments === 0
                  ? "nothing pending"
                  : `${lastSheetCheck.data.newStudents} new student(s), ${lastSheetCheck.data.newPayments} new payment(s) waiting to review`}
              </>
            ) : (
              "not checked yet — new students/payments in the sheet won't appear here until you check"
            )}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>Review sheet sync →</span>
        </Link>
      )}

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <>
          <RealtimeRefresher branchIds={[result.data.viewerBranchId, ...(result.data.branchStats?.map((b) => b.id) ?? [])]} />
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

      <div data-tour="quick-find">
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "#111827" }}>Quick find a student</h2>
        <StudentSearch />
      </div>

      <GuidedTour tourId="dashboard" steps={DASHBOARD_TOUR} />
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
          dataTour={!branchId ? "stat-today" : undefined}
        />
        <StatCard
          href={`/simple/reports/collection?from=${monthStart}&to=${today}${branchQS}`}
          label="Collected this month"
          value={money(monthTotal)}
          sub={`${monthCount} payments`}
          tone="neutral"
          dataTour={!branchId ? "stat-month" : undefined}
        />
        <StatCard
          href={`/simple/reports/dues${branchQSFirst}`}
          label="Pending dues"
          value={money(pendingDuesTotal)}
          sub={`${pendingDuesCount} students`}
          tone="due"
          dataTour={!branchId ? "stat-dues" : undefined}
        />
        <StatCard
          href={`/simple/students?status=active${branchQS}`}
          label="Total students"
          value={String(studentCount)}
          sub="active"
          tone="neutral"
          dataTour={!branchId ? "stat-students" : undefined}
        />
      </div>
    </div>
  );
}

function StatCard({ href, label, value, sub, tone, dataTour }: { href: string; label: string; value: string; sub: string; tone: "neutral" | "good" | "due"; dataTour?: string }) {
  const colors = {
    neutral: { bg: "#ffffff", fg: "#111827", border: "#e5e7eb" },
    good: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
    due: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  }[tone];

  return (
    <Link
      href={href}
      data-tour={dataTour}
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, textDecoration: "none", display: "block" }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.fg }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>
    </Link>
  );
}
