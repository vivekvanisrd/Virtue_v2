import { getReceiptByNumber } from "@/lib/actions/simple/report-actions";
import { PrintButton } from "@/components/simple/PrintButton";

function money(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

// Trims the ".0" Excel float artifact some legacy phone numbers still carry.
function formatPhone(phone: string | null) {
  return phone ? phone.replace(/\.0$/, "") : phone;
}

export default async function ReceiptPrintPage({ params }: { params: Promise<{ receiptNumber: string }> }) {
  const { receiptNumber } = await params;
  const res = await getReceiptByNumber(decodeURIComponent(receiptNumber));

  if (!res.success) {
    return (
      <div style={{ padding: 40, fontFamily: "system-ui, sans-serif" }}>
        <p style={{ color: "#b91c1c", fontWeight: 600 }}>{res.error}</p>
      </div>
    );
  }

  const r = res.data;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "24px auto", padding: 24 }}>
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <PrintButton />
      </div>

      <div style={{ border: "2px solid #111827", borderRadius: 10, padding: 24 }}>
        <div style={{ textAlign: "center", borderBottom: "1px dashed #9ca3af", paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{r.schoolName || "School"}</div>
          {r.branchName && <div style={{ fontSize: 14, color: "#374151" }}>{r.branchName}</div>}
          {(r.branchAddress || r.schoolAddress) && (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{r.branchAddress || r.schoolAddress}</div>
          )}
          {r.schoolPhone && <div style={{ fontSize: 12, color: "#6b7280" }}>Ph: {r.schoolPhone}</div>}
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8, color: "#111827" }}>FEE RECEIPT</div>
        </div>

        <Row label="Receipt No." value={r.receiptNumber} />
        {r.bookReceiptNo && <Row label="Book Receipt No." value={r.bookReceiptNo} />}
        <Row label="Date" value={new Date(r.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <Row label="Student" value={r.studentName} />
        <Row label="Admission No." value={r.admissionNumber || "—"} />
        {(r.className || r.sectionName) && <Row label="Class" value={[r.className, r.sectionName].filter(Boolean).join(" - ")} />}
        {r.fatherName && <Row label="Parent" value={r.fatherName} />}
        <Row label="Paid Towards" value={r.feeHead || "General"} />
        <Row label="Payment Mode" value={r.paymentMode} />
        {r.paymentReference && <Row label="Reference" value={r.paymentReference} />}

        <div
          style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px dashed #9ca3af",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Amount Paid</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#111827" }}>{money(r.amountPaid)}</span>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280" }}>
          <span>Collected by: {r.collectedBy || "—"}</span>
          <span>Signature: ____________</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 14 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
