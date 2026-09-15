import Link from "next/link";

type ReportDef = { title: string; description: string; href: string; downloadHref: string; color: string };

const CATEGORIES: { category: string; reports: ReportDef[] }[] = [
  {
    category: "Collections",
    reports: [
      {
        title: "Collection report",
        description: "Every fee payment received in a date range — filter by class, mode, fee head, or staff.",
        href: "/simple/reports/collection",
        downloadHref: "/simple/reports/collection/export",
        color: "#2563eb",
      },
      {
        title: "Day book",
        description: "One day's full cash-up sheet — cash/online split, staff-wise.",
        href: "/simple/reports/day-book",
        downloadHref: "/simple/reports/day-book/export",
        color: "#2563eb",
      },
      {
        title: "Payment mode report",
        description: "Cash vs online totals over a range, with a day-by-day trend.",
        href: "/simple/reports/payment-mode",
        downloadHref: "/simple/reports/payment-mode/export",
        color: "#2563eb",
      },
      {
        title: "Receipt register",
        description: "Every receipt issued, in receipt-number order — for cross-checking the physical book.",
        href: "/simple/reports/receipt-register",
        downloadHref: "/simple/reports/receipt-register/export",
        color: "#2563eb",
      },
      {
        title: "Fee head ledger",
        description: "Revenue split by category — Tuition, Admission, Transport, General.",
        href: "/simple/reports/fee-head-ledger",
        downloadHref: "/simple/reports/fee-head-ledger/export",
        color: "#2563eb",
      },
      {
        title: "Collected-by report",
        description: "Collections totalled per staff member.",
        href: "/simple/reports/collector-performance",
        downloadHref: "/simple/reports/collector-performance/export",
        color: "#2563eb",
      },
      {
        title: "Reversed collections",
        description: "Audit trail of every voided/reversed payment.",
        href: "/simple/reports/reversed-collections",
        downloadHref: "/simple/reports/reversed-collections/export",
        color: "#2563eb",
      },
      {
        title: "Advance / overpaid students",
        description: "Students who have paid more than their committed fee.",
        href: "/simple/reports/advance-payments",
        downloadHref: "/simple/reports/advance-payments/export",
        color: "#2563eb",
      },
    ],
  },
  {
    category: "Dues",
    reports: [
      {
        title: "Pending dues report",
        description: "Every student still owing money, with term-wise paid/due status.",
        href: "/simple/reports/dues",
        downloadHref: "/simple/reports/dues/export",
        color: "#dc2626",
      },
      {
        title: "Term-wise collection report",
        description: "Term 1/2/3 due vs paid, rolled up per class across the branch.",
        href: "/simple/reports/term-wise-collection",
        downloadHref: "/simple/reports/term-wise-collection/export",
        color: "#dc2626",
      },
    ],
  },
  {
    category: "Discounts",
    reports: [
      {
        title: "Discount utilization report",
        description: "How much concession has been given, by discount type.",
        href: "/simple/reports/discount-utilization",
        downloadHref: "/simple/reports/discount-utilization/export",
        color: "#9333ea",
      },
    ],
  },
  {
    category: "Students",
    reports: [
      {
        title: "Class summary report",
        description: "Committed fee, collected, and dues rolled up per class — cash/online split included.",
        href: "/simple/reports/class-summary",
        downloadHref: "/simple/reports/class-summary/export",
        color: "#16a34a",
      },
      {
        title: "Branch-wise summary",
        description: "The class-summary numbers rolled up one level, side by side across branches.",
        href: "/simple/reports/branch-summary",
        downloadHref: "/simple/reports/branch-summary/export",
        color: "#16a34a",
      },
      {
        title: "New admissions report",
        description: "Students admitted in a date range.",
        href: "/simple/reports/new-admissions",
        downloadHref: "/simple/reports/new-admissions/export",
        color: "#16a34a",
      },
      {
        title: "Student master / contact directory",
        description: "Full active roster with contact info and current fee status.",
        href: "/simple/reports/student-master",
        downloadHref: "/simple/reports/student-master/export",
        color: "#16a34a",
      },
      {
        title: "Revenue leakage report",
        description: "Active students with no fee profile set up, or ₹0 tuition.",
        href: "/simple/reports/revenue-leakage",
        downloadHref: "/simple/reports/revenue-leakage/export",
        color: "#16a34a",
      },
    ],
  },
  {
    category: "Transport",
    reports: [
      {
        title: "Transport fee report",
        description: "Students with a transport fee set — expected vs collected.",
        href: "/simple/reports/transport-fee",
        downloadHref: "/simple/reports/transport-fee/export",
        color: "#ea580c",
      },
    ],
  },
];

export default function ReportsIndexPage() {
  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Reports</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Pick a report to view on screen or download as Excel.</p>
      </div>

      {CATEGORIES.map((cat) => (
        <div key={cat.category} style={{ display: "grid", gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", margin: 0 }}>{cat.category}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {cat.reports.map((r) => (
              <div
                key={r.href}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 20,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, marginBottom: 10 }} />
                  <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "#111827" }}>{r.title}</h3>
                  <p style={{ fontSize: 14, color: "#4b5563", margin: "6px 0 0" }}>{r.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    href={r.href}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "9px 14px",
                      borderRadius: 8,
                      border: "1px solid #d1d5db",
                      color: "#374151",
                      textDecoration: "none",
                    }}
                  >
                    View
                  </Link>
                  <a
                    href={r.downloadHref}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "9px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: r.color,
                      color: "#ffffff",
                      textDecoration: "none",
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
