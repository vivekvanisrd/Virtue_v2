import Link from "next/link";
import { getStudentBalance } from "@/lib/actions/simple/fee-actions";
import { CollectPaymentForm } from "@/components/simple/CollectPaymentForm";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

// Some legacy phone numbers were imported as floats (e.g. "8328011073.0") — trim that for display only.
function formatPhone(phone: string | null) {
  return phone ? phone.replace(/\.0$/, "") : phone;
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getStudentBalance(id);

  if (!result.success) {
    return (
      <div>
        <Link href="/simple" style={{ color: "#2563eb" }}>
          ← Back to search
        </Link>
        <p style={{ marginTop: 16, color: "#b91c1c", fontWeight: 600 }}>{result.error}</p>
      </div>
    );
  }

  const { student, charges, totalPaid, balance, payments } = result.data;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <Link href="/simple" style={{ color: "#2563eb", fontSize: 14 }}>
          ← Back to search
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

      <CollectPaymentForm studentId={student.id} balance={Math.max(balance, 0)} />

      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#111827" }}>Payment history</h2>
        {payments.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No payments recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {payments.map((p: any) => (
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
                  <strong style={{ color: "#111827" }}>{money(p.amountPaid)}</strong>{" "}
                  <span style={{ color: "#6b7280" }}>
                    · {p.paymentMode} · {new Date(p.paymentDate).toLocaleDateString("en-IN")}
                  </span>
                </span>
                <span style={{ color: "#6b7280" }}>{p.receiptNumber}</span>
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
