import { BulkPayoutAudit } from "@/components/salaries/BulkPayoutAudit";

export const metadata = {
  title: "Independent Payout Audit Lab | PaVa-EDUX",
  description: "Public standalone tool for payroll verification and bank sheet generation.",
};

export default function AuditLabPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <BulkPayoutAudit />
    </main>
  );
}
