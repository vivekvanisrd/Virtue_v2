"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getStudentQuickInfo } from "@/lib/actions/simple/fee-actions";

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

type QuickInfo = Awaited<ReturnType<typeof getStudentQuickInfo>>;

const CACHE = new Map<string, QuickInfo>();

/**
 * Wraps a student's name (or any trigger element) so hovering shows a
 * floating "full details" card. Renders via a portal into document.body and
 * positions with `fixed` from the trigger's measured bounding rect, rather
 * than `absolute` inside the normal flow — most call sites live inside a
 * `overflow-x: auto` table wrapper, which would otherwise clip the popup.
 */
export function StudentHoverCard({ studentId, children }: { studentId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<QuickInfo | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => setMounted(true), []);

  function scheduleShow() {
    clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cardWidth = 300;
      const left = Math.min(rect.left, window.innerWidth - cardWidth - 12);
      setPos({ top: rect.bottom + 6, left: Math.max(8, left) });
      setOpen(true);

      const cached = CACHE.get(studentId);
      if (cached) {
        setInfo(cached);
        return;
      }
      setLoading(true);
      getStudentQuickInfo(studentId).then((res) => {
        CACHE.set(studentId, res);
        setInfo(res);
        setLoading(false);
      });
    }, 250);
  }

  function scheduleHide() {
    clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <span ref={anchorRef} onMouseEnter={scheduleShow} onMouseLeave={scheduleHide} style={{ display: "inline-block" }}>
      {children}
      {mounted &&
        open &&
        createPortal(
          <div
            onMouseEnter={() => clearTimeout(hideTimer.current)}
            onMouseLeave={scheduleHide}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 1000,
              width: 300,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              padding: 16,
              fontSize: 13,
            }}
          >
            {loading && <div style={{ color: "#6b7280" }}>Loading…</div>}
            {!loading && info && !info.success && <div style={{ color: "#b91c1c" }}>{info.error}</div>}
            {!loading && info && info.success && (
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{info.data.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: 12 }}>
                    #{info.data.admissionNumber || "—"}
                    {info.data.gender ? ` · ${info.data.gender}` : ""}
                  </div>
                </div>
                <Row label="Class">{[info.data.className, info.data.sectionName].filter(Boolean).join(" - ") || "—"}</Row>
                <Row label="Branch">{info.data.branchName || "—"}</Row>
                <Row label="Parent">
                  {info.data.parentName || "—"}
                  {info.data.parentPhone ? ` (${info.data.parentPhone})` : ""}
                </Row>
                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 2, paddingTop: 8, display: "grid", gap: 6 }}>
                  <Row label="Total fee">{money(info.data.totalCharges)}</Row>
                  <Row label="Paid">{money(info.data.paid)}</Row>
                  <Row label="Balance">
                    <strong style={{ color: info.data.balance > 0 ? "#b91c1c" : "#15803d" }}>{money(Math.abs(info.data.balance))}</strong>
                    {info.data.balance < 0 ? " (advance)" : ""}
                  </Row>
                </div>
                <Link
                  href={`/simple/students/${info.data.id}`}
                  style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", textDecoration: "none", marginTop: 2 }}
                >
                  View full profile →
                </Link>
              </div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ color: "#111827", textAlign: "right" }}>{children}</span>
    </div>
  );
}
