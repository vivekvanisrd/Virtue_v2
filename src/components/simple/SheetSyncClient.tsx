"use client";

import { useMemo, useState, useTransition } from "react";
import { checkSheetForUpdates, syncSelectedSheetRows } from "@/lib/actions/simple/sheet-sync-actions";

type CheckResult = Awaited<ReturnType<typeof checkSheetForUpdates>>;
type CheckData = Extract<CheckResult, { success: true }>["data"];
type StudentRow = CheckData["students"][number];
type PaymentRow = CheckData["payments"][number];
type SyncResult = Awaited<ReturnType<typeof syncSelectedSheetRows>>;

type StatusFilter = "new" | "imported" | "all";
type SortDir = "asc" | "desc";

function useSort<T>(rows: T[], getValue: (row: T, key: string) => string | number, defaultKey: string) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function onSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, onSort };
}

function SortHeader({ label, sortKey, activeKey, dir, onSort }: { label: string; sortKey: string; activeKey: string; dir: SortDir; onSort: (k: string) => void }) {
  const active = sortKey === activeKey;
  return (
    <th style={thStyle}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        style={{
          all: "unset",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: active ? "#1d4ed8" : "#6b7280",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {label}
        <span style={{ fontSize: 10, opacity: active ? 1 : 0.35 }}>{active ? (dir === "asc" ? "▲" : "▼") : "▲"}</span>
      </button>
    </th>
  );
}

export function SheetSyncClient() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CheckData | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<SyncResult["results"] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new");
  const [showStudents, setShowStudents] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

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

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data.students;
    return data.students.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    if (statusFilter === "all") return data.payments;
    return data.payments.filter((p) => p.status === statusFilter);
  }, [data, statusFilter]);

  const studentSort = useSort<StudentRow>(
    filteredStudents,
    (row, key) => {
      switch (key) {
        case "sheetId":
          return row.sheetId;
        case "name":
          return row.name;
        case "branch":
          return row.branchCode;
        case "class":
          return row.className;
        case "tuition":
          return row.tuitionFee || 0;
        case "status":
          return row.status;
        default:
          return "";
      }
    },
    "name"
  );

  const paymentSort = useSort<PaymentRow>(
    filteredPayments,
    (row, key) => {
      switch (key) {
        case "receipt":
          return Number(row.receipt) || row.receipt;
        case "name":
          return row.name;
        case "amount":
          return row.amount;
        case "mode":
          return row.mode;
        case "collectedBy":
          return row.collectedBy || "";
        case "status":
          return row.status;
        default:
          return "";
      }
    },
    "receipt"
  );

  const newStudentCount = data ? data.students.filter((s) => s.status === "new").length : 0;
  const newPaymentCount = data ? data.payments.filter((p) => p.status === "new").length : 0;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#1e3a8a" }}>
          This only ever reads the <strong>STUDENT_MASTER</strong> and <strong>FEE_COLLECTION</strong> tabs of the school's
          Google Sheet — nothing else. Nothing is imported automatically: check the sheet, review each row below, tick the
          ones you want, then sync. Every match is shown with its evidence (exact admission number, a formatting-tolerant
          guess, or a phone-number match to an existing student) so you can catch a typo'd duplicate before it's created.
          Rows already in the ERP show up too (switch the filter below to "Already imported" or "All") but can't be ticked
          again.
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
            Checked {new Date(data.checkedAt).toLocaleString("en-IN")} — {newStudentCount} new student row(s), {newPaymentCount} new
            payment row(s)
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
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Show:</span>
              {(["new", "imported", "all"] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: statusFilter === f ? "1px solid #2563eb" : "1px solid #d1d5db",
                    background: statusFilter === f ? "#eff6ff" : "#ffffff",
                    color: statusFilter === f ? "#1d4ed8" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {f === "new" ? "New only" : f === "imported" ? "Already imported" : "All"}
                </button>
              ))}
            </div>
            <div style={{ width: 1, alignSelf: "stretch", background: "#e5e7eb" }} />
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={showStudents} onChange={(e) => setShowStudents(e.target.checked)} />
              Students
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" }}>
              <input type="checkbox" checked={showPayments} onChange={(e) => setShowPayments(e.target.checked)} />
              Payments
            </label>
          </div>

          {showStudents && (
            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
                Students in STUDENT_MASTER ({filteredStudents.length})
              </h2>
              {filteredStudents.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>No rows match this filter.</p>
              ) : (
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                        <th style={thStyle}></th>
                        <th style={thStyle}>#</th>
                        <SortHeader label="Adm No" sortKey="sheetId" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                        <SortHeader label="Name" sortKey="name" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                        <th style={thStyle}>Parent / Phone</th>
                        <SortHeader label="Branch" sortKey="branch" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                        <SortHeader label="Class" sortKey="class" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                        <SortHeader label="Tuition" sortKey="tuition" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                        <SortHeader label="Status" sortKey="status" activeKey={studentSort.sortKey} dir={studentSort.sortDir} onSort={studentSort.onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {studentSort.sorted.map((row, i) => (
                        <tr key={`${row.sheetId}-${i}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                          <td style={tdStyle}>
                            {row.status === "imported" ? (
                              <span title="Already in the ERP" style={{ color: "#9ca3af" }}>
                                —
                              </span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selectedStudents.has(row.sheetId)}
                                onChange={() => toggle(selectedStudents, setSelectedStudents, row.sheetId)}
                              />
                            )}
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
                            {row.status === "new" && !row.resolvedBranchId && <div style={{ color: "#b91c1c" }}>unrecognized branch</div>}
                          </td>
                          <td style={tdStyle}>
                            {row.className}
                            {row.status === "new" && (
                              <div style={{ color: "#6b7280" }}>{row.resolvedClassName ? `→ ${row.resolvedClassName}` : row.className ? "(unrecognized)" : ""}</div>
                            )}
                          </td>
                          <td style={tdStyle}>{row.tuitionFee ? `₹${row.tuitionFee.toLocaleString("en-IN")}` : "not set in sheet"}</td>
                          <td style={tdStyle}>
                            {row.status === "imported" ? (
                              <span style={{ color: "#6b7280" }}>
                                ✓ Imported {row.matchedStudent ? `— ${row.matchedStudent.name} (${row.matchedStudent.admissionNumber})` : ""}
                              </span>
                            ) : row.looksLikeDuplicate ? (
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
          )}

          {showPayments && (
            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>
                Payments in FEE_COLLECTION ({filteredPayments.length})
              </h2>
              {filteredPayments.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14 }}>No rows match this filter.</p>
              ) : (
                <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                        <th style={thStyle}></th>
                        <th style={thStyle}>#</th>
                        <SortHeader label="Receipt" sortKey="receipt" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Student" sortKey="name" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Amount" sortKey="amount" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Mode / For" sortKey="mode" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Collected by" sortKey="collectedBy" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Status" sortKey="status" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {paymentSort.sorted.map((row, i) => {
                        const isNewStudentInThisBatch = filteredStudents.some((s) => s.sheetId === row.admNo && selectedStudents.has(s.sheetId));
                        const canImport = row.status === "new" && (!!row.matchedStudent || isNewStudentInThisBatch);
                        return (
                          <tr key={`${row.receipt}-${i}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                            <td style={tdStyle}>
                              {row.status === "imported" ? (
                                <span title="Already recorded" style={{ color: "#9ca3af" }}>
                                  —
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  disabled={!canImport}
                                  checked={selectedPayments.has(row.receipt)}
                                  onChange={() => toggle(selectedPayments, setSelectedPayments, row.receipt)}
                                />
                              )}
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
                              {row.status === "imported" ? (
                                <span style={{ color: "#6b7280" }}>
                                  ✓ Already recorded
                                  {row.matchMethod === "amount" && (
                                    <div style={{ color: "#b45309", fontWeight: 400 }}>
                                      matched by amount, not receipt — this student already has a same-amount, same-term payment on
                                      file (likely the original bulk import, which didn't keep receipt numbers)
                                    </div>
                                  )}
                                </span>
                              ) : row.matchedStudent ? (
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
          )}

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
