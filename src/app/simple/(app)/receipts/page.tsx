import { ReceiptLookup } from "@/components/simple/ReceiptLookup";

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: "#111827" }}>Find a receipt</h1>
      <p style={{ color: "#4b5563", marginBottom: 20 }}>Look up any past payment by its receipt number or manual (paper) receipt number.</p>
      <ReceiptLookup initialQuery={sp.q} />
    </div>
  );
}
