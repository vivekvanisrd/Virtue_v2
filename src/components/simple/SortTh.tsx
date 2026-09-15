import Link from "next/link";

/**
 * A clickable, sortable table header — the user asked for header-based
 * sorting in addition to the "Sort by" dropdown that already exists on
 * these pages, so this is additive, not a replacement.
 */
export function SortTh({
  label,
  ascValue,
  descValue,
  currentSort,
  basePath,
  searchParams,
}: {
  label: string;
  ascValue: string;
  descValue: string;
  currentSort: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const isAsc = currentSort === ascValue;
  const isDesc = currentSort === descValue;
  const nextValue = isAsc ? descValue : ascValue;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v && k !== "sortBy" && k !== "page") params.set(k, v);
  }
  params.set("sortBy", nextValue);
  const href = `${basePath}?${params.toString()}`;

  return (
    <th style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      <Link href={href} style={{ color: isAsc || isDesc ? "#1d4ed8" : "#6b7280", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <span style={{ fontSize: 10 }}>{isAsc ? "▲" : isDesc ? "▼" : "⇕"}</span>
      </Link>
    </th>
  );
}
