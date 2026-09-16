"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "simple-font-scale";
const MIN = 0.85;
const MAX = 1.3;
const STEP = 0.1;

function apply(scale: number) {
  document.documentElement.style.setProperty("--simple-zoom", String(scale));
}

/**
 * A+/A- control in the header. Scales the whole main content area (not the
 * header/sidebar chrome) via CSS `zoom` on a wrapper the layout renders
 * around {children} — `zoom` (unlike `transform: scale`) reflows real layout
 * and keeps click hit-testing correct, which is why it's used here instead
 * of a transform. Persisted per-browser via localStorage so it's remembered
 * next visit; there's no server-side "font size" concept, this is purely a
 * per-viewer accessibility convenience.
 */
export function FontSizeControl() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved && saved >= MIN && saved <= MAX) {
        setScale(saved);
        apply(saved);
      }
    } catch {
      // localStorage unavailable — just stay at the default scale.
    }
  }, []);

  function change(delta: number) {
    setScale((prev) => {
      const next = Math.round(Math.min(MAX, Math.max(MIN, prev + delta)) * 100) / 100;
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
      <button
        type="button"
        onClick={() => change(-STEP)}
        title="Decrease text size"
        aria-label="Decrease text size"
        style={btnStyle}
      >
        A−
      </button>
      <span style={{ fontSize: 11, color: "#6b7280", width: 34, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
      <button
        type="button"
        onClick={() => change(STEP)}
        title="Increase text size"
        aria-label="Increase text size"
        style={btnStyle}
      >
        A+
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: "5px 8px",
  borderRadius: 6,
  border: "none",
  background: "#ffffff",
  color: "#374151",
  cursor: "pointer",
};
