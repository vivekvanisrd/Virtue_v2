import Link from "next/link";
import { getStudentBalance } from "@/lib/actions/simple/fee-actions";
import { CollectPaymentForm } from "@/components/simple/CollectPaymentForm";
import { QuickCollectSearch } from "@/components/simple/QuickCollectSearch";
import { RealtimeRefresher } from "@/components/simple/RealtimeRefresher";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}
function formatPhone(phone: string | null) {
  return phone ? phone.replace(/\.0$/, "") : phone;
}

export default async function QuickCollectPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const sp = await searchParams;
  const result = sp.studentId ? await getStudentBalance(sp.studentId) : null;

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 720 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Collect a fee payment</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Find a student and take a payment — no need to open their full profile.</p>
      </div>

      <QuickCollectSearch autoFocus={!sp.studentId} />

      {result && !result.success && <p style={{ color: "#b91c1c", fontWeight: 600 }}>{result.error}</p>}

      {result && result.success && (
        <>
          <RealtimeRefresher branchIds={[result.data.student.branchId]} />
          {(() => {
            const { student, charges, totalPaid, balance } = result.data;
            return (
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#111827" }}>{student.name}</h2>
                    <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 14 }}>
                      {[student.admissionNumber && `#${student.admissionNumber}`, student.className, student.branchName].filter(Boolean).join(" · ")}
                      {student.parentName && (
                        <>
                          {" · "}
                          {student.parentName}
                          {student.parentPhone ? ` (${formatPhone(student.parentPhone)})` : ""}
                        </>
                      )}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/simple/students/${student.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                      Full profile
                    </Link>
                    <Link href="/simple/collect" style={{ fontSize: 13, fontWeight: 600, color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", textDecoration: "none" }}>
                      Change student
                    </Link>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                  <MiniStat label="Total fee" value={money(charges.totalCharges)} />
                  <MiniStat label="Paid so far" value={money(totalPaid)} tone="good" />
                  <MiniStat label={balance > 0 ? "Balance due" : "Overpaid / advance"} value={money(Math.abs(balance))} tone={balance > 0 ? "due" : "good"} />
                </div>
              </div>
            );
          })()}

          <CollectPaymentForm studentId={result.data.student.id} balance={Math.max(result.data.balance, 0)} />
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "good" | "due" }) {
  const fg = tone === "good" ? "#15803d" : tone === "due" ? "#b91c1c" : "#111827";
  return (
    <div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: fg }}>{value}</div>
    </div>
  );
}
