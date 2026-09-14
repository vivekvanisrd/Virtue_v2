"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { lookupReceipt } from "@/lib/actions/simple/report-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function ReceiptLookup() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(undefined); // undefined = not searched, null = no match
  const [isPending, startTransition] = useTransition();

  function run(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResult(undefined);
      return;
    }
    startTransition(async () => {
      const res = await lookupReceipt(value);
      setResult(res.success ? res.data : null);
    });
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => run(e.target.value)}
        placeholder="Type a receipt number…"
        style={{
          width: "100%",
          fontSize: 20,
          padding: "16px 18px",
          borderRadius: 12,
          border: "2px solid #d1d5db",
          outline: "none",
          color: "#111827",
          background: "#ffffff",
        }}
      />

      {isPending && <p style={{ marginTop: 12, color: "#6b7280" }}>Searching…</p>}

      {!isPending && result === null && <p style={{ marginTop: 12, color: "#6b7280" }}>No receipt matches "{query}".</p>}

      {!isPending && result && (
        <div style={{ marginTop: 16, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{result.receiptNumber}</div>
          <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
            <Row label="Student">
              <Link href={`/simple/students/${result.studentId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                {result.studentName}
              </Link>{" "}
              {result.admissionNumber && <span style={{ color: "#9ca3af" }}>#{result.admissionNumber}</span>}
            </Row>
            <Row label="Amount">
              <strong>{money(result.amountPaid)}</strong>
            </Row>
            <Row label="Paid by">{result.paymentMode}</Row>
            {result.paymentReference && <Row label="Reference">{result.paymentReference}</Row>}
            <Row label="Date">{new Date(result.paymentDate).toLocaleDateString("en-IN")}</Row>
            <Row label="Collected by">{result.collectedBy}</Row>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ color: "#111827" }}>{children}</span>
    </div>
  );
}
