"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { universalSearch, type UniversalSearchResults } from "@/lib/actions/simple/search-actions";

const EMPTY: UniversalSearchResults = { students: [], collections: [], feeMaster: [], discountTypes: [] };

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UniversalSearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function run(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(EMPTY);
      setOpen(false);
      return;
    }
    setOpen(true);
    startTransition(async () => {
      const res = await universalSearch(value);
      setResults(res.success ? res.data : EMPTY);
    });
  }

  function go(path: string) {
    setOpen(false);
    setQuery("");
    setResults(EMPTY);
    router.push(path);
  }

  const hasAny =
    results.students.length + results.collections.length + results.feeMaster.length + results.discountTypes.length > 0;

  return (
    <div ref={boxRef} style={{ position: "relative", flex: "1 1 320px", maxWidth: 480 }}>
      <input
        value={query}
        onChange={(e) => run(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search everything — students, receipts, fees, discounts…"
        style={{
          width: "100%",
          fontSize: 14,
          padding: "9px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          outline: "none",
          color: "#111827",
          background: "#f9fafb",
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 420,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {isPending && <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>Searching…</div>}

          {!isPending && !hasAny && <div style={{ padding: 14, color: "#6b7280", fontSize: 13 }}>No matches for "{query}".</div>}

          {!isPending && results.students.length > 0 && (
            <Section title="Students">
              {results.students.map((s) => (
                <Item key={s.id} onClick={() => go(`/simple/students/${s.id}`)}>
                  <strong>{s.name}</strong>
                  <span style={{ color: "#9ca3af" }}>
                    {" "}
                    {[s.admissionNumber && `#${s.admissionNumber}`, s.className].filter(Boolean).join(" · ")}
                  </span>
                </Item>
              ))}
            </Section>
          )}

          {!isPending && results.collections.length > 0 && (
            <Section title="Payments / receipts">
              {results.collections.map((c) => (
                <Item key={c.id} onClick={() => go(`/simple/receipts?q=${encodeURIComponent(c.receiptNumber)}`)}>
                  <strong>{c.receiptNumber}</strong>
                  {c.bookReceiptNo && <span style={{ color: "#9ca3af" }}> · book #{c.bookReceiptNo}</span>}
                  <span style={{ color: "#9ca3af" }}> · {c.studentName} · {money(c.amountPaid)}</span>
                </Item>
              ))}
            </Section>
          )}

          {!isPending && results.feeMaster.length > 0 && (
            <Section title="Fee Master">
              {results.feeMaster.map((f) => (
                <Item key={f.id} onClick={() => go(`/simple/fee-master`)}>
                  {f.label}
                </Item>
              ))}
            </Section>
          )}

          {!isPending && results.discountTypes.length > 0 && (
            <Section title="Discounts">
              {results.discountTypes.map((d) => (
                <Item key={d.id} onClick={() => go(`/simple/discounts`)}>
                  {d.name}
                </Item>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function Item({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "9px 14px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: 14,
        color: "#111827",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
