import { SheetSyncClient } from "@/components/simple/SheetSyncClient";

export default function SheetSyncPage() {
  return (
    <div style={{ display: "grid", gap: 20 }} data-tour="sheet-sync-page">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Sheet sync</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
          Bring new students and payments from the school's Google Sheet into the ERP — reviewed and selected by hand, one
          batch at a time.
        </p>
      </div>
      <SheetSyncClient />
    </div>
  );
}
