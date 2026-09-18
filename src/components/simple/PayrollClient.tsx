"use client";

import { useState, useTransition } from "react";
import {
  generateBranchPayrollDraft,
  saveDraftEdits,
  syncDraftWithLatestProfiles,
  finalizeBranchPayroll,
  markSlipPaid,
  exportBankFile,
  listPayrollRuns,
} from "@/lib/actions/simple/simple-payroll-actions";

type DraftResult = Awaited<ReturnType<typeof generateBranchPayrollDraft>>;
type DraftData = Extract<DraftResult, { success: true }>["data"];
type SlipRow = DraftData["slips"][number];
type HistoryResult = Awaited<ReturnType<typeof listPayrollRuns>>;
type HistoryRow = Extract<HistoryResult, { success: true }>["data"][number];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export function PayrollClient({ branches }: { branches: { id: string; name: string }[] }) {
  const now = new Date();
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || "");
  const [draft, setDraft] = useState<DraftData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [editedSlips, setEditedSlips] = useState<Record<string, { grossSalary: number; netSalary: number }>>({});

  function generate() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await generateBranchPayrollDraft({ month, year, branchId: branches.length > 0 ? branchId : undefined });
      if (res.success) {
        setDraft(res.data);
        setMessage(res.message || null);
        setEditedSlips({});
      } else {
        setError(res.error);
        setDraft(null);
      }
    });
  }

  function syncProfiles() {
    if (!draft) return;
    startTransition(async () => {
      const res = await syncDraftWithLatestProfiles(draft.id);
      if (res.success) {
        setMessage(res.message || "Synced.");
        generate();
      } else {
        setError(res.error);
      }
    });
  }

  function saveEdits() {
    if (!draft) return;
    const updates = draft.slips.map((s: SlipRow) => ({
      id: s.id,
      attendedDays: s.attendedDays,
      payableDays: s.payableDays,
      lwpDays: s.lwpDays,
      deductions: s.deductions,
      grossSalary: editedSlips[s.id]?.grossSalary ?? s.grossSalary,
      netSalary: editedSlips[s.id]?.netSalary ?? s.netSalary,
    }));
    startTransition(async () => {
      const res = await saveDraftEdits(draft.id, updates);
      if (res.success) {
        setMessage(res.message || "Saved.");
        generate();
      } else {
        setError(res.error);
      }
    });
  }

  function finalize() {
    if (!draft) return;
    startTransition(async () => {
      const res = await finalizeBranchPayroll(draft.id);
      if (res.success) {
        setMessage("Finalized — ledger entries posted.");
        setConfirmingFinalize(false);
        generate();
      } else {
        setError(res.error);
        setConfirmingFinalize(false);
      }
    });
  }

  function downloadCsv(format: "GENERIC" | "AXIS_INTERNAL" | "AXIS_EXTERNAL") {
    if (!draft) return;
    startTransition(async () => {
      const res = await exportBankFile(draft.id, format);
      if (res.success) {
        setMessage(`Bank file ready (${res.csvData.split("\n").length - 1} rows) — copy from the box below.`);
        setError(null);
        setCsvPreview(res.csvData);
      } else {
        setError(res.error);
      }
    });
  }
  const [csvPreview, setCsvPreview] = useState<string | null>(null);

  function loadHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) {
      startTransition(async () => {
        const res = await listPayrollRuns();
        if (res.success) setHistory(res.data);
      });
    }
  }

  const totalGross = draft ? draft.slips.reduce((sum: number, s: SlipRow) => sum + Number(editedSlips[s.id]?.grossSalary ?? s.grossSalary), 0) : 0;
  const totalNet = draft ? draft.slips.reduce((sum: number, s: SlipRow) => sum + Number(editedSlips[s.id]?.netSalary ?? s.netSalary), 0) : 0;
  const isDraftEditable = draft && draft.status !== "APPROVED" && draft.status !== "Approved" && !draft.isLocked;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ ...selectStyle, width: 90 }} />
        {branches.length > 0 && (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={selectStyle}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          disabled={isPending}
          onClick={generate}
          style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: isPending ? "#93c5fd" : "#2563eb", color: "#ffffff", cursor: isPending ? "default" : "pointer" }}
        >
          {isPending && !draft ? "Working…" : "Generate draft"}
        </button>
        <button
          type="button"
          onClick={loadHistory}
          style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
        >
          {showHistory ? "Hide history" : "View history"}
        </button>
      </div>

      {error && (
        <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>{error}</p>
      )}
      {message && (
        <p style={{ margin: 0, color: "#166534", fontWeight: 600, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 12 }}>{message}</p>
      )}

      {showHistory && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px", color: "#111827" }}>Finalized payroll history</h2>
          {!history || history.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>No finalized runs yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyleLocal}>Month</th>
                  <th style={thStyleLocal}>Staff</th>
                  <th style={thStyleLocal}>Gross</th>
                  <th style={thStyleLocal}>Net</th>
                  <th style={thStyleLocal}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r: any, i: number) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                    <td style={tdStyleLocal}>{MONTH_NAMES[r.month - 1]} {r.year}</td>
                    <td style={tdStyleLocal}>{r.staffCount}</td>
                    <td style={tdStyleLocal}>{money(r.totalGross)}</td>
                    <td style={tdStyleLocal}>{money(r.totalNet)}</td>
                    <td style={tdStyleLocal}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {draft && (
        <>
          <div style={{ display: "flex", gap: 20, background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Status</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{draft.status}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Total gross</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{money(totalGross)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Total net</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d" }}>{money(totalNet)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Staff</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{draft.slips.length}</div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={thStyleLocal}>#</th>
                  <th style={thStyleLocal}>Staff</th>
                  <th style={thStyleLocal}>Attended</th>
                  <th style={thStyleLocal}>LWP</th>
                  <th style={thStyleLocal}>Payable days</th>
                  <th style={thStyleLocal}>Gross</th>
                  <th style={thStyleLocal}>Net</th>
                  <th style={thStyleLocal}>Slip status</th>
                </tr>
              </thead>
              <tbody>
                {draft.slips.map((s: SlipRow, i: number) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                    <td style={tdStyleLocal}>{i + 1}</td>
                    <td style={tdStyleLocal}>
                      {(s as any).staff?.firstName} {(s as any).staff?.lastName}
                    </td>
                    <td style={tdStyleLocal}>{s.attendedDays ?? "—"}</td>
                    <td style={{ ...tdStyleLocal, color: (s.lwpDays || 0) > 0 ? "#b91c1c" : "#111827" }}>{s.lwpDays ?? 0}</td>
                    <td style={tdStyleLocal}>{s.payableDays ?? "—"}</td>
                    <td style={tdStyleLocal}>
                      {isDraftEditable ? (
                        <input
                          type="number"
                          defaultValue={s.grossSalary}
                          onChange={(e) =>
                            setEditedSlips((prev) => ({ ...prev, [s.id]: { grossSalary: Number(e.target.value), netSalary: prev[s.id]?.netSalary ?? s.netSalary } }))
                          }
                          style={{ ...selectStyle, width: 100 }}
                        />
                      ) : (
                        money(s.grossSalary)
                      )}
                    </td>
                    <td style={tdStyleLocal}>
                      {isDraftEditable ? (
                        <input
                          type="number"
                          defaultValue={s.netSalary}
                          onChange={(e) =>
                            setEditedSlips((prev) => ({ ...prev, [s.id]: { grossSalary: prev[s.id]?.grossSalary ?? s.grossSalary, netSalary: Number(e.target.value) } }))
                          }
                          style={{ ...selectStyle, width: 100 }}
                        />
                      ) : (
                        <strong>{money(s.netSalary)}</strong>
                      )}
                    </td>
                    <td style={tdStyleLocal}>
                      {s.status}
                      {s.status === "Approved" || s.status === "APPROVED" ? (
                        <button
                          type="button"
                          onClick={() => {
                            const mode = window.prompt("Payment mode (e.g. Bank Transfer, Cash)?", "Bank Transfer");
                            if (!mode) return;
                            const ref = window.prompt("Payment reference / UTR?") || "";
                            startTransition(async () => {
                              const res = await markSlipPaid(s.id, mode, ref);
                              if (res.success) generate();
                              else setError(res.error);
                            });
                          }}
                          style={{ marginLeft: 8, fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", cursor: "pointer" }}
                        >
                          Mark paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isDraftEditable && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={isPending}
                onClick={saveEdits}
                style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                Save changes
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={syncProfiles}
                style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                Sync new/changed staff
              </button>
              {!confirmingFinalize ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmingFinalize(true)}
                  style={{ fontSize: 14, fontWeight: 700, padding: "10px 16px", borderRadius: 8, border: "none", background: "#16a34a", color: "#ffffff", cursor: "pointer" }}
                >
                  Finalize payroll
                </button>
              ) : (
                <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px" }}>
                  <span style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>Post ledger entries for {money(totalNet)}? This can't be undone from here.</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={finalize}
                    style={{ fontSize: 13, fontWeight: 700, padding: "8px 14px", borderRadius: 6, border: "none", background: "#b45309", color: "#ffffff", cursor: "pointer" }}
                  >
                    Yes, finalize
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingFinalize(false)}
                    style={{ fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {!isDraftEditable && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => downloadCsv("GENERIC")}
                style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
              >
                Export bank file (generic CSV)
              </button>
            </div>
          )}

          {csvPreview && (
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>Bank file (copy this)</h3>
              <textarea readOnly value={csvPreview} style={{ width: "100%", height: 160, fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = { fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" };
const thStyleLocal: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" };
const tdStyleLocal: React.CSSProperties = { padding: "10px", color: "#111827", verticalAlign: "top" };
