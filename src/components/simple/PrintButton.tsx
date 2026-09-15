"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        fontSize: 14,
        fontWeight: 600,
        padding: "10px 16px",
        borderRadius: 8,
        border: "none",
        background: "#2563eb",
        color: "#ffffff",
        cursor: "pointer",
      }}
    >
      Print receipt
    </button>
  );
}
