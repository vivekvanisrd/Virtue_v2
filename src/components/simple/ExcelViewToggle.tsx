"use client";

import { useState } from "react";

/** Wraps a normal table with a "View as Excel" button that swaps it for a spreadsheet grid. */
export function ExcelViewToggle({ table, excel }: { table: React.ReactNode; excel: React.ReactNode }) {
  const [showExcel, setShowExcel] = useState(false);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowExcel((v) => !v)} style={buttonStyle}>
          {showExcel ? "↩ Back to normal view" : "📊 View as Excel"}
        </button>
      </div>
      {showExcel ? excel : table}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  color: "#374151",
  cursor: "pointer",
};
