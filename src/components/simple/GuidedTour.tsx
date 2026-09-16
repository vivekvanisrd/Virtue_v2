"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type TourStep = {
  /** CSS selector for a `data-tour="..."` attribute already on the target element. */
  target: string;
  title: string;
  body: string;
};

const SEEN_KEY_PREFIX = "simple-tour-seen-";

/**
 * A small, in-house step-by-step walkthrough for one page: dims everything
 * except the current target element (a spotlight, via a giant box-shadow —
 * simpler and more robust than an SVG mask) and shows a tooltip with
 * Back/Next/Skip. Deliberately single-page, not a cross-page product tour:
 * cross-page tours need to persist state through navigation, which adds a
 * lot of complexity for a first pass. Each page that wants a tour renders
 * its own <GuidedTour tourId="..." steps={...} />, plus a floating button so
 * staff can replay it any time, not just on first visit.
 */
export function GuidedTour({ tourId, steps }: { tourId: string; steps: TourStep[] }) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      if (!localStorage.getItem(SEEN_KEY_PREFIX + tourId)) {
        const t = setTimeout(() => setActive(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable (private window, etc.) — just skip auto-start.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(() => {
    if (!active) return;
    function updateRect() {
      const el = document.querySelector(steps[stepIndex]?.target ?? "");
      setRect(el ? el.getBoundingClientRect() : null);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, stepIndex, steps]);

  function finish() {
    setActive(false);
    setStepIndex(0);
    try {
      localStorage.setItem(SEEN_KEY_PREFIX + tourId, "1");
    } catch {
      // ignore
    }
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStepIndex(0);
          setActive(true);
        }}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 16px",
          borderRadius: 999,
          border: "none",
          background: "#111827",
          color: "#ffffff",
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
        }}
      >
        🔎 Take a tour
      </button>

      {mounted &&
        active &&
        step &&
        createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
            {rect ? (
              <div
                style={{
                  position: "fixed",
                  top: rect.top - 6,
                  left: rect.left - 6,
                  width: rect.width + 12,
                  height: rect.height + 12,
                  borderRadius: 10,
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)",
                  border: "2px solid #2563eb",
                  pointerEvents: "none",
                  transition: "all 0.2s ease",
                }}
              />
            ) : (
              <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)" }} />
            )}

            <div
              style={{
                position: "fixed",
                top: rect ? Math.min(rect.bottom + 16, window.innerHeight - 200) : "50%",
                left: rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 336) : "50%",
                transform: rect ? undefined : "translate(-50%, -50%)",
                width: 320,
                background: "#ffffff",
                borderRadius: 12,
                padding: 20,
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>
                STEP {stepIndex + 1} OF {steps.length}
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{step.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#4b5563", lineHeight: 1.5 }}>{step.body}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <button
                  type="button"
                  onClick={finish}
                  style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Skip
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => setStepIndex((i) => i - 1)}
                      style={{ fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
                    style={{ fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" }}
                  >
                    {isLast ? "Done" : "Next"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
