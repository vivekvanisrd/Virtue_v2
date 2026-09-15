"use client";

/**
 * A genuine spreadsheet grid (jspreadsheet-ce — free/MIT) for staff who are
 * used to Excel and don't want to learn a form-based ERP: cell-by-cell
 * editing, click-and-drag, copy/paste, keyboard navigation. "Save changes"
 * diffs every row against what was loaded and only sends what actually
 * changed to the server action passed in as `onSave`.
 *
 * Sizes itself to whatever screen it's on: column widths stretch to fill
 * the full available width on a wide monitor (instead of leaving dead space
 * next to a fixed-width grid), and the grid's height fills the remaining
 * viewport height so the page itself doesn't need to scroll to reach the
 * Save button — only the rows scroll, inside their own pane, same as a
 * frozen-header spreadsheet.
 */

import { useEffect, useRef, useState } from "react";
import jspreadsheet, { type JspreadsheetInstanceElement } from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";

export type ExcelColumn = {
  key: string;
  title: string;
  type?: "text" | "numeric";
  width?: number;
  readOnly?: boolean;
};

const MIN_ROW_AREA_HEIGHT = 240;

export function ExcelView<T extends Record<string, any>>({
  columns,
  rows,
  idKey,
  onSave,
}: {
  columns: ExcelColumn[];
  rows: T[];
  idKey: keyof T;
  onSave: (
    changedRows: { id: string; changes: Record<string, string | number> }[]
  ) => Promise<{ success: boolean; saved?: number; failed?: number; errors?: string[] }>;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ReturnType<typeof jspreadsheet>[number] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  // Bumped on window resize to force the grid to rebuild at the new size —
  // jspreadsheet lays out fixed pixel columns/height once at creation, it
  // doesn't itself react to the container changing size afterward.
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    let frame = 0;
    function onResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setResizeTick((t) => t + 1));
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    // Defensive clear: React 18 dev-mode Strict Mode mounts effects twice, and
    // jspreadsheet appends into the container rather than replacing it, so
    // without this a fast mount/unmount/remount leaves two grids stacked.
    el.innerHTML = "";

    // Stretch columns to fill the actual available width instead of leaving
    // empty space on a wide monitor (and never below what each column asked
    // for, so small screens still get a normal horizontal scrollbar).
    const availableWidth = wrapper.clientWidth || 900;
    const requestedWidths = columns.map((c) => c.width ?? 140);
    const requestedTotal = requestedWidths.reduce((a, b) => a + b, 0);
    const extra = Math.max(0, availableWidth - requestedTotal - 40 /* row-number column */);
    const stretchTargets = columns.reduce((n, c) => n + (c.readOnly ? 0 : 1), 0) || columns.length;
    const finalWidths = columns.map((c, i) => {
      if (extra === 0) return requestedWidths[i];
      const share = c.readOnly ? 0 : extra / stretchTargets;
      return requestedWidths[i] + share;
    });

    // Fill from just below the grid's own top offset down to near the
    // bottom of the viewport, so the page doesn't need its own scroll to
    // reach "Save changes" on a tall monitor — only the row area scrolls.
    const top = wrapper.getBoundingClientRect().top;
    const tableHeight = Math.max(MIN_ROW_AREA_HEIGHT, window.innerHeight - top - 48);

    const data = rows.map((r) => {
      const obj: Record<string, string | number> = {};
      for (const c of columns) obj[c.key] = r[c.key] ?? "";
      return obj;
    });

    const instances = jspreadsheet(el, {
      tabs: false,
      toolbar: false,
      worksheets: [
        {
          data,
          columns: columns.map((c, i) => ({
            name: c.key,
            title: c.title,
            type: c.type ?? "text",
            width: finalWidths[i],
            readOnly: c.readOnly ?? false,
          })),
          columnSorting: true,
          filters: true,
          allowInsertRow: false,
          allowInsertColumn: false,
          allowDeleteRow: false,
          allowDeleteColumn: false,
          allowRenameColumn: false,
          tableOverflow: true,
          tableWidth: "100%",
          tableHeight: `${tableHeight}px`,
        },
      ],
    });
    instanceRef.current = instances[0];

    return () => {
      jspreadsheet.destroy(el as JspreadsheetInstanceElement, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, resizeTick]);

  async function handleSave() {
    const instance = instanceRef.current;
    if (!instance) return;
    setIsSaving(true);
    setMessage(null);

    // Read as a plain 2D array (guaranteed shape) rather than the asJson
    // variant — that one returns a shape this library version doesn't
    // actually produce as a real array, which breaks a plain .forEach.
    const current = instance.getData() as unknown as (string | number)[][];
    const changedRows: { id: string; changes: Record<string, string | number> }[] = [];

    current.forEach((row, i) => {
      const original = rows[i];
      if (!original) return;
      const changes: Record<string, string | number> = {};
      columns.forEach((c, colIndex) => {
        if (c.readOnly) return;
        const newVal = row[colIndex];
        const oldVal = original[c.key] ?? "";
        if (String(newVal ?? "") !== String(oldVal ?? "")) changes[c.key] = newVal;
      });
      if (Object.keys(changes).length > 0) {
        changedRows.push({ id: String(original[idKey]), changes });
      }
    });

    if (changedRows.length === 0) {
      setMessage({ kind: "success", text: "Nothing changed." });
      setIsSaving(false);
      return;
    }

    const res = await onSave(changedRows);
    if (res.success) {
      setMessage({ kind: "success", text: `Saved ${changedRows.length} row(s).` });
    } else {
      setMessage({
        kind: "error",
        text: `Saved ${res.saved ?? 0}, failed ${res.failed ?? changedRows.length}${res.errors?.length ? ` — ${res.errors[0]}` : ""}`,
      });
    }
    setIsSaving(false);
  }

  return (
    <div ref={wrapperRef} style={{ display: "grid", gap: 10, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>Edit cells directly, like Excel — then save.</p>
        <button onClick={handleSave} disabled={isSaving} style={buttonStyle}>
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>
      <div ref={containerRef} style={{ width: "100%", overflowX: "auto" }} />
      {message && (
        <p style={{ margin: 0, fontWeight: 600, color: message.kind === "success" ? "#15803d" : "#b91c1c" }}>{message.text}</p>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: "#15803d",
  color: "#ffffff",
  cursor: "pointer",
};
