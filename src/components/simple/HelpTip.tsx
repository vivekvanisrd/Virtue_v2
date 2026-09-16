"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A small "?" icon that shows a plain-language explanation on hover — for
 * terms that make sense to anyone who's used this ERP a while, but aren't
 * obvious to someone used to reading a hand-kept Excel sheet instead
 * (Committed fee, Term 1/2/3, Fee head, etc.). Renders via a portal, same
 * reasoning as StudentHoverCard: most call sites sit inside a scrolling
 * table wrapper that would otherwise clip an absolutely-positioned tooltip.
 */
export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => setMounted(true), []);

  function show() {
    clearTimeout(hideTimer.current);
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 260;
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    setPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    setOpen(true);
  }
  function hide() {
    hideTimer.current = setTimeout(() => setOpen(false), 100);
  }

  return (
    <span
      ref={anchorRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#e5e7eb",
        color: "#4b5563",
        fontSize: 11,
        fontWeight: 700,
        marginLeft: 5,
        cursor: "default",
        verticalAlign: "middle",
      }}
    >
      ?
      {mounted &&
        open &&
        createPortal(
          <div
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={hide}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 1200,
              width: 260,
              background: "#111827",
              color: "#f9fafb",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              padding: "10px 12px",
              fontSize: 13,
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </span>
  );
}
