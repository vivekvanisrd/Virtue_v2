"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchStudents } from "@/lib/actions/simple/fee-actions";

type Result = {
  id: string;
  name: string;
  admissionNumber: string | null;
  className: string | null;
  branchName: string | null;
};

export function StudentSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    startTransition(async () => {
      const res = await searchStudents(value);
      setSearched(true);
      setResults(res.success ? res.data : []);
    });
  }

  return (
    <div>
      <input
        autoFocus
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        placeholder="Type a student's name or admission number…"
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
        <p style={{ marginTop: 12, color: "#6b7280" }}>No student matches "{query}".</p>
      )}

      {results.length > 0 && (
        <ul style={{ marginTop: 14, listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {results.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => router.push(`/simple/students/${r.id}`)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong style={{ fontSize: 16, color: "#111827" }}>{r.name}</strong>
                  {r.admissionNumber && (
                    <span style={{ color: "#6b7280", marginLeft: 8 }}>#{r.admissionNumber}</span>
                  )}
                </span>
                <span style={{ color: "#6b7280", fontSize: 14 }}>
                  {[r.className, r.branchName].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
