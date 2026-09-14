import { ReceiptLookup } from "@/components/simple/ReceiptLookup";

export default function ReceiptsPage() {
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: "#111827" }}>Find a receipt</h1>
      <p style={{ color: "#4b5563", marginBottom: 20 }}>Look up any past payment by its receipt number.</p>
      <ReceiptLookup />
    </div>
  );
}
