"use client";

/**
 * Shared table building blocks for /simple client components — sortable
 * headers, a simple pager, and the standard cell styles. First built for
 * SheetSyncClient.tsx, extracted here so StaffAttendanceClient/PayrollClient
 * (and anything after) reuse the exact same look and behavior instead of
 * re-implementing sort/paging independently.
 */

import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export const PAGE_SIZE = 50;

export function dateValue(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}
export function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-IN") : "—";
}

export function useSort<T>(rows: T[], getValue: (row: T, key: string) => string | number, defaultKey: string) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, onSort };
}

export function Pager({ page, totalPages, onChange, totalRows }: { page: number; totalPages: number; onChange: (p: number) => void; totalRows: number }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end", padding: "10px 4px", fontSize: 13, color: "#374151" }}>
      <span>
        Page {page} of {totalPages} ({totalRows} rows)
      </span>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}
      >
        ← Prev
      </button>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}
      >
        Next →
      </button>
    </div>
  );
}

export function SortHeader({ label, sortKey, activeKey, dir, onSort }: { label: string; sortKey: string; activeKey: string; dir: SortDir; onSort: (k: string) => void }) {
  const active = sortKey === activeKey;
  return (
    <th style={thStyle}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: active ? "#1d4ed8" : "#6b7280",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: active ? 1 : 0.35 }}>{active ? (dir === "asc" ? "▲" : "▼") : "▲"}</span>
      </button>
    </th>
  );
}

export const thStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" };
export const tdStyle: React.CSSProperties = { padding: "10px", color: "#111827", verticalAlign: "top" };
