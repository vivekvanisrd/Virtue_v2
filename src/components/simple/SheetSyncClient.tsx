"use client";

import { useState, useTransition } from "react";
import { checkSheetForUpdates, syncSelectedSheetRows } from "@/lib/actions/simple/sheet-sync-actions";

type CheckResult = Awaited<ReturnType<typeof checkSheetForUpdates>>;
type NewStudentRow = Extract<CheckResult, { success: true }>["data"]["newStudents"][number];
type NewPaymentRow = Extract<CheckResult, { success: true }>["data"]["newPayments"][number];
type SyncResult = Awaited<ReturnType<typeof syncSelectedSheetRows>>;

export function SheetSyncClient() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Extract<CheckResult, { success: true }>["data"] | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<SyncResult["results"] | null>(null);

  function runCheck() {
    setError(null);
    setSyncResults(null);
    startTransition(async () => {
      const res = await checkSheetForUpdates();
      if (res.success) {
        setData(res.data);
        setSelectedStudents(new Set());
        setSelectedPayments(new Set());
      } else {
        setError(res.error);
        setData(null);
      }
    });
  }

  function runSync() {
    setError(null);
    startTransition(async () => {
      const res = await syncSelectedSheetRows({
        newStudentSheetIds: [...selectedStudents],
        newPaymentReceipts: [...selectedPayments],
      });
      if (res.success) {
        setSyncResults(res.results);
        // Re-check so the list reflects what's actually left to review.
        const refreshed = await checkSheetForUpdates();
        if (refreshed.success) {
          setData(refreshed.data);
          setSelectedStudents(new Set());
          setSelectedPayments(new Set());
        }
      } else {
        setError(res.error);
      }
    });
  }

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSet(next);
  }

  const totalSelected = selectedStudents.size + selectedPayments.size;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#1e3a8a" }}>
          This only ever reads the <strong>STUDENT_MASTER</strong> and <strong>FEE_COLLECTION</strong> tabs of the school's
          Google Sheet — nothing else. Nothing is imported automatically: check the sheet, review each row below, tick the
          ones you want, then sync. Every match is shown with its evidence (exact admission number, a formatting-tolerant
          guess, or a phone-number match to an existing student) so you can catch a typo'd duplicate before it's created.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={isPending}
          onClick={runCheck}
          style={{
            fontSize: 15,
            fontWeight: 600,
            padding: "12px 18px",
            borderRadius: 8,
            border: "none",
            background: isPending ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          {isPending && !data ? "Checking…" : "Check sheet for updates"}
        </button>
        {data && (
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            Checked {new Date(data.checkedAt).toLocaleString("en-IN")} — {data.newStudents.length} new student row(s),{" "}
            {data.newPayments.length} new payment row(s)
          </span>
        )}
      </div>

      {error && (
        <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>
          {error}
        </p>
      )}

      {syncResults && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14, display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#15803d" }}>Sync result</p>
          {syncResults.map((r, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14, color: r.success ? "#166534" : "#b91c1c" }}>
              {r.success ? "✅" : "⚠️"} {r.label} — {r.message}
            </p>
          ))}
        </div>
      )}

      {data && (
        <>
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
              New students in STUDENT_MASTER ({data.newStudents.length})
            </h2>
            {data.newStudents.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>No new admission numbers found.</p>
            ) : (
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                      <th style={thStyle}></th>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Adm No</th>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Parent / Phone</th>
                      <th style={thStyle}>Branch / Class</th>
                      <th style={thStyle}>Tuition</th>
                      <th style={thStyle}>Match check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.newStudents.map((row: NewStudentRow, i: number) => (
                      <tr key={row.sheetId} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(row.sheetId)}
                            onChange={() => toggle(selectedStudents, setSelectedStudents, row.sheetId)}
                          />
                        </td>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{row.sheetId}</td>
                        <td style={tdStyle}>{row.name}</td>
                        <td style={tdStyle}>
                          {row.parentName || "—"}
                          {row.phone ? <div style={{ color: "#6b7280" }}>{row.phone}</div> : null}
                        </td>
                        <td style={tdStyle}>
                          {row.branchCode}
                          {!row.resolvedBranchId && <div style={{ color: "#b91c1c" }}>unrecognized branch</div>}
                          <div style={{ color: "#6b7280" }}>
                            {row.className}
                            {row.resolvedClassName ? ` → ${row.resolvedClassName}` : row.className ? " (unrecognized)" : ""}
                          </div>
                        </td>
                        <td style={tdStyle}>{row.tuitionFee ? `₹${row.tuitionFee.toLocaleString("en-IN")}` : "not set in sheet"}</td>
                        <td style={tdStyle}>
                          {row.looksLikeDuplicate ? (
                            <div style={{ color: "#b45309", fontWeight: 600 }}>
                              ⚠️ Possible duplicate
                              {row.canonicalMatch && (
                                <div style={{ fontWeight: 400 }}>
                                  Admission no. resembles {row.canonicalMatch.name} ({row.canonicalMatch.admissionNumber})
                                </div>
                              )}
                              {row.phoneMatch && (
                                <div style={{ fontWeight: 400 }}>
                                  Phone matches {row.phoneMatch.name} ({row.phoneMatch.admissionNumber})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#15803d" }}>✅ No match — looks new</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
              New payments in FEE_COLLECTION ({data.newPayments.length})
            </h2>
            {data.newPayments.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 14 }}>No new receipt numbers found.</p>
            ) : (
              <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                      <th style={thStyle}></th>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Receipt</th>
                      <th style={thStyle}>Student</th>
                      <th style={thStyle}>Amount</th>
                      <th style={thStyle}>Mode / For</th>
                      <th style={thStyle}>Collected by</th>
                      <th style={thStyle}>Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.newPayments.map((row: NewPaymentRow, i: number) => {
                      const isNewStudentInThisBatch = selectedStudents.has(row.admNo) || data.newStudents.some((s) => s.sheetId === row.admNo && selectedStudents.has(s.sheetId));
                      const canImport = !!row.matchedStudent || isNewStudentInThisBatch;
                      return (
                        <tr key={row.receipt} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                          <td style={tdStyle}>
                            <input
                              type="checkbox"
                              disabled={!canImport}
                              checked={selectedPayments.has(row.receipt)}
                              onChange={() => toggle(selectedPayments, setSelectedPayments, row.receipt)}
                            />
                          </td>
                          <td style={tdStyle}>{i + 1}</td>
                          <td style={tdStyle}>{row.receipt}</td>
                          <td style={tdStyle}>
                            {row.name}
                            <div style={{ color: "#6b7280" }}>{row.admNo}</div>
                          </td>
                          <td style={tdStyle}>₹{row.amount.toLocaleString("en-IN")}</td>
                          <td style={tdStyle}>
                            {row.mode}
                            <div style={{ color: "#6b7280" }}>{row.feeHead}</div>
                          </td>
                          <td style={tdStyle}>{row.collectedBy || "—"}</td>
                          <td style={tdStyle}>
                            {row.matchedStudent ? (
                              <span style={{ color: row.matchIsExact ? "#15803d" : "#b45309" }}>
                                {row.matchIsExact ? "✅" : "⚠️ guess —"} {row.matchedStudent.name} ({row.matchedStudent.admissionNumber})
                              </span>
                            ) : isNewStudentInThisBatch ? (
                              <span style={{ color: "#2563eb" }}>Will use the new student ticked above</span>
                            ) : (
                              <span style={{ color: "#b91c1c" }}>No match — tick the student above first, or cannot import</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div>
            <button
              type="button"
              disabled={isPending || totalSelected === 0}
              onClick={runSync}
              style={{
                fontSize: 16,
                fontWeight: 600,
                padding: "14px 20px",
                borderRadius: 10,
                border: "none",
                background: totalSelected === 0 ? "#d1d5db" : isPending ? "#86efac" : "#16a34a",
                color: "#ffffff",
                cursor: totalSelected === 0 || isPending ? "default" : "pointer",
              }}
            >
              {isPending ? "Syncing…" : `Sync ${totalSelected} selected row(s)`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "8px 10px", fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "10px", color: "#111827", verticalAlign: "top" };
