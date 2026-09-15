import Link from "next/link";
import { getStudentBalance } from "@/lib/actions/simple/fee-actions";
import { listStudentDiscounts } from "@/lib/actions/simple/fee-master-actions";
import { CollectPaymentForm } from "@/components/simple/CollectPaymentForm";
import { StudentDiscountPanel } from "@/components/simple/StudentDiscountPanel";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// Some legacy phone numbers were imported as floats (e.g. "8328011073.0") — trim that for display only.
function formatPhone(phone: string | null) {
  return phone ? phone.replace(/\.0$/, "") : phone;
}

// Ancillary fee keys come straight off FinancialRecord column names
// (admissionFee, transportFee, ...) — turn "admissionFee" into "Admission fee".
function labelizeFeeKey(key: string) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, discountsRes] = await Promise.all([getStudentBalance(id), listStudentDiscounts(id)]);
  const discounts = discountsRes.success ? discountsRes.data : [];

  if (!result.success) {
    return (
      <div>
        <Link href="/simple/students" style={{ color: "#2563eb" }}>
          ← Back to students
        </Link>
        <p style={{ marginTop: 16, color: "#b91c1c", fontWeight: 600 }}>{result.error}</p>
      </div>
    );
  }

  const { student, charges, totalPaid, balance, payments, termBreakdown } = result.data;
  const feeLines = [
    { label: "Tuition (after concession)", amount: charges.tuition },
    ...charges.ancillary.map((a: any) => ({ label: labelizeFeeKey(a.label), amount: a.amount })),
    ...charges.extraComponents.map((c: any) => ({ label: c.label, amount: c.amount })),
  ].filter((l) => l.amount !== 0);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Link href="/simple/students" style={{ color: "#2563eb", fontSize: 14 }}>
            ← Back to students
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 0", color: "#111827" }}>{student.name}</h1>
          <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
            {[student.admissionNumber && `#${student.admissionNumber}`, student.className, student.branchName]
              .filter(Boolean)
              .join(" · ")}
            {student.parentName && (
              <>
                {" · "}
                {student.parentName}
                {student.parentPhone ? ` (${formatPhone(student.parentPhone)})` : ""}
              </>
            )}
          </p>
        </div>
        <Link
          href={`/simple/students/${student.id}/edit`}
          style={{ fontSize: 14, fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 14px", textDecoration: "none" }}
        >
          Edit details
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <StatCard label="Total fee" value={money(charges.totalCharges)} tone="neutral" />
        <StatCard label="Paid so far" value={money(totalPaid)} tone="good" />
        <StatCard
          label={balance > 0 ? "Balance due" : balance < 0 ? "Overpaid / advance" : "Balance"}
          value={money(Math.abs(balance))}
          tone={balance > 0 ? "due" : "good"}
        />
      </div>

      {charges.discount > 0 && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <MiniStat label="Class tuition fee" value={money(charges.grossTuition)} />
          <MiniStat label="Discount" value={`− ${money(charges.discount)}`} tone="due" />
          <MiniStat label="Committed (payable) fee" value={money(charges.tuition)} tone="good" />
        </div>
      )}

      <CollectPaymentForm studentId={student.id} balance={Math.max(balance, 0)} />

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}>Term-wise status</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Term</th>
                <th style={thStyle}>Due</th>
                <th style={thStyle}>Paid</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {([
                ["Term 1", termBreakdown.term1],
                ["Term 2", termBreakdown.term2],
                ["Term 3", termBreakdown.term3],
              ] as const).map(([label, t], i) => (
                <tr key={label} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{label}</td>
                  <td style={tdStyle}>{money(t.due)}</td>
                  <td style={tdStyle}>{money(t.paid)}</td>
                  <td style={tdStyle}>
                    <TermStatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <StudentDiscountPanel studentId={student.id} branchId={student.branchId ?? ""} discounts={discounts} />

      {feeLines.length > 1 && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}>Fee breakdown</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {feeLines.map((line, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: "#374151" }}>
                  <span style={{ color: "#9ca3af", marginRight: 6 }}>{i + 1}.</span>
                  {line.label}
                </span>
                <span style={{ color: "#111827", fontWeight: 600 }}>{money(line.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, paddingTop: 4 }}>
              <span style={{ color: "#111827", fontWeight: 700 }}>Total</span>
              <span style={{ color: "#111827", fontWeight: 700 }}>{money(charges.totalCharges)}</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}>Payment history</h2>
        {payments.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No payments recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {payments.map((p: any, i: number) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 14,
                }}
              >
                <span>
                  <span style={{ color: "#9ca3af", marginRight: 6 }}>{i + 1}.</span>
                  <strong style={{ color: "#111827" }}>{money(p.amountPaid)}</strong>{" "}
                  <span style={{ color: "#6b7280" }}>
                    · {p.paymentMode} · {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                  </span>
                </span>
                <span style={{ color: "#6b7280" }}>
                  {p.receiptNumber}
                  {p.bookReceiptNo && <span> · book #{p.bookReceiptNo}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "neutral" | "good" | "due" }) {
  const colors = {
    neutral: { bg: "#ffffff", fg: "#111827", border: "#e5e7eb" },
    good: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
    due: { bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
  }[tone];

  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: colors.fg }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "due" }) {
  const fg = tone === "good" ? "#15803d" : tone === "due" ? "#b91c1c" : "#111827";
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: fg }}>{value}</div>
    </div>
  );
}

function TermStatusBadge({ status }: { status: "not-set" | "due" | "partial" | "paid" }) {
  const map = {
    "not-set": { bg: "#f3f4f6", fg: "#6b7280", label: "Not set" },
    due: { bg: "#fef2f2", fg: "#b91c1c", label: "Due" },
    partial: { bg: "#fffbeb", fg: "#b45309", label: "Partial" },
    paid: { bg: "#f0fdf4", fg: "#15803d", label: "Paid" },
  }[status];
  return (
    <span style={{ background: map.bg, color: map.fg, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
      {map.label}
    </span>
  );
}

const thStyle: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "10px 14px", color: "#111827" };
