"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { lookupReceipt } from "@/lib/actions/simple/report-actions";
import { StudentHoverCard } from "@/components/simple/StudentHoverCard";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function ReceiptLookup({ initialQuery }: { initialQuery?: string } = {}) {
  const [query, setQuery] = useState(initialQuery || "");
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    startTransition(async () => {
      const res = await lookupReceipt(value);
      setSearched(true);
      setResults(res.success ? res.data : []);
    });
  }

  useEffect(() => {
    if (initialQuery) run(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => run(e.target.value)}
        placeholder="Type a receipt number or manual (paper) receipt #…"
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

      {!isPending && searched && results.length === 0 && (
        <p style={{ marginTop: 12, color: "#6b7280" }}>No receipt matches "{query}".</p>
      )}

      {!isPending && results.length > 0 && (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {results.map((result) => (
            <div key={result.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
                {result.receiptNumber}
                {result.bookReceiptNo && <span style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginLeft: 10 }}>book #{result.bookReceiptNo}</span>}
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 14 }}>
                <Row label="Student">
                  <StudentHoverCard studentId={result.studentId}>
                    <Link href={`/simple/students/${result.studentId}`} style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
                      {result.studentName}
                    </Link>
                  </StudentHoverCard>{" "}
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
              <div style={{ marginTop: 12 }}>
                <a
                  href={`/simple/receipts/${result.receiptNumber}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#2563eb", fontWeight: 600, fontSize: 14, textDecoration: "none" }}
                >
                  View / print receipt →
                </a>
              </div>
            </div>
          ))}
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
