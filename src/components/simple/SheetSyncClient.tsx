"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { checkSheetForUpdates, syncSelectedSheetRows, getSheetSyncAuditLog } from "@/lib/actions/simple/sheet-sync-actions";
import { PAGE_SIZE, Pager, SortHeader, dateValue, formatDate, thStyle, tdStyle, useSort } from "./table-helpers";

type CheckResult = Awaited<ReturnType<typeof checkSheetForUpdates>>;
type CheckData = Extract<CheckResult, { success: true }>["data"];
type StudentRow = CheckData["students"][number];
type PaymentRow = CheckData["payments"][number];
type SyncResult = Awaited<ReturnType<typeof syncSelectedSheetRows>>;
type AuditLogResult = Awaited<ReturnType<typeof getSheetSyncAuditLog>>;
type AuditLogEntry = Extract<AuditLogResult, { success: true }>["data"][number];

type StatusFilter = "new" | "imported" | "all";
type FlagFilter = "all" | "hide" | "only";
const UNKNOWN_BRANCH = "__unknown__";

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
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [flagFilter, setFlagFilter] = useState<FlagFilter>("all");
  const [missingOnly, setMissingOnly] = useState(false);
  const [studentPage, setStudentPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);

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
        const log = await getSheetSyncAuditLog();
        if (log.success) setAuditLog(log.data);
      } else {
        setError(res.error);
      }
    });
  }

  function loadAuditLog() {
    startTransition(async () => {
      const res = await getSheetSyncAuditLog();
      if (res.success) setAuditLog(res.data);
    });
  }

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSet(next);
  }

  function toggleAll(ids: string[], set: Set<string>, setSet: (s: Set<string>) => void) {
    const allSelected = ids.length > 0 && ids.every((id) => set.has(id));
    const next = new Set(set);
    if (allSelected) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    setSet(next);
  }

  const totalSelected = selectedStudents.size + selectedPayments.size;

  const branchOptions = useMemo(() => {
    if (!data) return [];
    const codes = new Set<string>();
    for (const s of data.students) codes.add(s.branchCode || UNKNOWN_BRANCH);
    for (const p of data.payments) codes.add(p.branchCode || UNKNOWN_BRANCH);
    return [...codes].sort();
  }, [data]);

  const classOptions = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    for (const s of data.students) names.add(s.resolvedClassName || s.className || UNKNOWN_BRANCH);
    return [...names].sort();
  }, [data]);

  const searchLower = search.trim().toLowerCase();

  const minAmountNum = minAmount.trim() ? Number(minAmount) : null;
  const maxAmountNum = maxAmount.trim() ? Number(maxAmount) : null;

  const filteredStudents = useMemo(() => {
    if (!data) return [];
    return data.students.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (branchFilter !== "all" && (s.branchCode || UNKNOWN_BRANCH) !== branchFilter) return false;
      if (classFilter !== "all" && (s.resolvedClassName || s.className || UNKNOWN_BRANCH) !== classFilter) return false;
      if (flagFilter === "hide" && s.looksLikeDuplicate) return false;
      if (flagFilter === "only" && !s.looksLikeDuplicate) return false;
      if (missingOnly && !s.hasMissingData) return false;
      if (searchLower) {
        const haystack = `${s.sheetId} ${s.name} ${s.parentName} ${s.phone || ""}`.toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
  }, [data, statusFilter, branchFilter, classFilter, flagFilter, missingOnly, searchLower]);

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    return data.payments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (branchFilter !== "all" && (p.branchCode || UNKNOWN_BRANCH) !== branchFilter) return false;
      if (modeFilter !== "all" && p.mode !== modeFilter) return false;
      if (minAmountNum !== null && p.amount < minAmountNum) return false;
      if (maxAmountNum !== null && p.amount > maxAmountNum) return false;
      if (flagFilter === "hide" && p.looksUncertain) return false;
      if (flagFilter === "only" && !p.looksUncertain) return false;
      if (missingOnly && !p.hasMissingData) return false;
      if (searchLower) {
        const haystack = `${p.receipt} ${p.admNo} ${p.name} ${p.collectedBy || ""}`.toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
  }, [data, statusFilter, branchFilter, modeFilter, minAmountNum, maxAmountNum, flagFilter, missingOnly, searchLower]);

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
        case "date":
          return dateValue(row.paymentDate);
        case "branch":
          return row.branchCode || "";
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

  const eligibleStudentIds = filteredStudents.filter((s) => s.status === "new" && s.sheetStatusOk).map((s) => s.sheetId);
  const allStudentsSelected = eligibleStudentIds.length > 0 && eligibleStudentIds.every((id) => selectedStudents.has(id));

  const eligiblePaymentIds = filteredPayments
    .filter((p) => p.status === "new" && p.entryStatusOk && (!!p.matchedStudent || selectedStudents.has(p.admNo)))
    .map((p) => p.receipt);
  const allPaymentsSelected = eligiblePaymentIds.length > 0 && eligiblePaymentIds.every((id) => selectedPayments.has(id));

  // Keeps the current page from pointing past the end (or lingering on a
  // stale page) whenever a filter narrows or widens the result set.
  useEffect(() => {
    setStudentPage(1);
  }, [statusFilter, branchFilter, classFilter, flagFilter, missingOnly, searchLower]);
  useEffect(() => {
    setPaymentPage(1);
  }, [statusFilter, branchFilter, modeFilter, minAmountNum, maxAmountNum, flagFilter, missingOnly, searchLower]);

  const studentTotalPages = Math.max(1, Math.ceil(studentSort.sorted.length / PAGE_SIZE));
  const paymentTotalPages = Math.max(1, Math.ceil(paymentSort.sorted.length / PAGE_SIZE));
  const studentPageClamped = Math.min(studentPage, studentTotalPages);
  const paymentPageClamped = Math.min(paymentPage, paymentTotalPages);
  const studentPageRows = studentSort.sorted.slice((studentPageClamped - 1) * PAGE_SIZE, studentPageClamped * PAGE_SIZE);
  const paymentPageRows = paymentSort.sorted.slice((paymentPageClamped - 1) * PAGE_SIZE, paymentPageClamped * PAGE_SIZE);

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
              flexDirection: "column",
              gap: 12,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
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

            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, admission no, receipt, phone…"
                style={{ fontSize: 13, padding: "7px 12px", borderRadius: 8, border: "1px solid #d1d5db", minWidth: 240 }}
              />

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Branch:</span>
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#374151" }}
                >
                  <option value="all">All branches</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b === UNKNOWN_BRANCH ? "Unrecognized / unknown" : b}
                    </option>
                  ))}
                </select>
              </div>

              {showStudents && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Class:</span>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#374151" }}
                  >
                    <option value="all">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c} value={c}>
                        {c === UNKNOWN_BRANCH ? "Unrecognized / unknown" : c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showPayments && (
                <>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Mode:</span>
                    <select
                      value={modeFilter}
                      onChange={(e) => setModeFilter(e.target.value)}
                      style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#374151" }}
                    >
                      <option value="all">Cash + Online</option>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Amount ₹:</span>
                    <input
                      type="number"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="min"
                      style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: 80 }}
                    />
                    <span style={{ color: "#9ca3af" }}>–</span>
                    <input
                      type="number"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      placeholder="max"
                      style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", width: 80 }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Duplicates / uncertain:</span>
                {([
                  ["all", "All"],
                  ["hide", "Ignore"],
                  ["only", "Only these"],
                ] as [FlagFilter, string][]).map(([f, label]) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFlagFilter(f)}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: flagFilter === f ? "1px solid #b45309" : "1px solid #d1d5db",
                      background: flagFilter === f ? "#fffbeb" : "#ffffff",
                      color: flagFilter === f ? "#92400e" : "#374151",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: "#374151", cursor: "pointer" }}>
                <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
                Missing a field (unrecognized branch/class, no phone, or no collector/reference)
              </label>
            </div>
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
                        <th style={thStyle}>
                          <input
                            type="checkbox"
                            title="Select all visible, eligible rows"
                            checked={allStudentsSelected}
                            disabled={eligibleStudentIds.length === 0}
                            onChange={() => toggleAll(eligibleStudentIds, selectedStudents, setSelectedStudents)}
                          />
                        </th>
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
                      {studentPageRows.map((row, i) => (
                        <tr key={`${row.sheetId}-${i}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                          <td style={tdStyle}>
                            {row.status === "imported" ? (
                              <span title="Already in the ERP" style={{ color: "#9ca3af" }}>
                                —
                              </span>
                            ) : !row.sheetStatusOk ? (
                              <span title={`Sheet status: ${row.sheetStatus}`} style={{ color: "#9ca3af" }}>
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
                          <td style={tdStyle}>{(studentPageClamped - 1) * PAGE_SIZE + i + 1}</td>
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
                            ) : !row.sheetStatusOk ? (
                              <span style={{ color: "#b91c1c", fontWeight: 600 }}>⛔ Sheet status "{row.sheetStatus}" — not imported</span>
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
                  <Pager page={studentPageClamped} totalPages={studentTotalPages} totalRows={studentSort.sorted.length} onChange={setStudentPage} />
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
                        <th style={thStyle}>
                          <input
                            type="checkbox"
                            title="Select all visible, eligible rows"
                            checked={allPaymentsSelected}
                            disabled={eligiblePaymentIds.length === 0}
                            onChange={() => toggleAll(eligiblePaymentIds, selectedPayments, setSelectedPayments)}
                          />
                        </th>
                        <th style={thStyle}>#</th>
                        <SortHeader label="Date" sortKey="date" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Receipt" sortKey="receipt" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Student" sortKey="name" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Branch" sortKey="branch" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Amount" sortKey="amount" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Mode / For" sortKey="mode" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Collected by" sortKey="collectedBy" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                        <SortHeader label="Status" sortKey="status" activeKey={paymentSort.sortKey} dir={paymentSort.sortDir} onSort={paymentSort.onSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {paymentPageRows.map((row, i) => {
                        const isNewStudentInThisBatch = filteredStudents.some((s) => s.sheetId === row.admNo && selectedStudents.has(s.sheetId));
                        const canImport = row.status === "new" && row.entryStatusOk && (!!row.matchedStudent || isNewStudentInThisBatch);
                        return (
                          <tr key={`${row.receipt}-${i}`} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                            <td style={tdStyle}>
                              {row.status === "imported" ? (
                                <span title="Already recorded" style={{ color: "#9ca3af" }}>
                                  —
                                </span>
                              ) : !row.entryStatusOk ? (
                                <span title={`Entry Status: ${row.entryStatus}`} style={{ color: "#9ca3af" }}>
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
                            <td style={tdStyle}>{(paymentPageClamped - 1) * PAGE_SIZE + i + 1}</td>
                            <td style={tdStyle}>{formatDate(row.paymentDate)}</td>
                            <td style={tdStyle}>{row.receipt}</td>
                            <td style={tdStyle}>
                              {row.name}
                              <div style={{ color: "#6b7280" }}>{row.admNo}</div>
                            </td>
                            <td style={tdStyle}>{row.branchCode || <span style={{ color: "#b91c1c" }}>unknown</span>}</td>
                            <td style={tdStyle}>₹{row.amount.toLocaleString("en-IN")}</td>
                            <td style={tdStyle}>
                              {row.mode}
                              <div style={{ color: "#6b7280" }}>{row.feeHead}</div>
                            </td>
                            <td style={tdStyle}>
                              {row.collectedBy || <span style={{ color: "#b91c1c" }}>missing</span>}
                              {row.mode !== "Cash" && !row.reference && <div style={{ color: "#b91c1c" }}>no reference</div>}
                            </td>
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
                              ) : !row.entryStatusOk ? (
                                <span style={{ color: "#b91c1c", fontWeight: 600 }}>⛔ Entry Status "{row.entryStatus}" — not imported</span>
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
                  <Pager page={paymentPageClamped} totalPages={paymentTotalPages} totalRows={paymentSort.sorted.length} onChange={setPaymentPage} />
                </div>
              )}
            </section>
          )}

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
            <button
              type="button"
              onClick={() => {
                const next = !showAuditLog;
                setShowAuditLog(next);
                if (next && auditLog.length === 0) loadAuditLog();
              }}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: "10px 16px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              {showAuditLog ? "Hide sync log" : "View sync log"}
            </button>
          </div>

          {showAuditLog && (
            <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>Recent sync activity</h2>
              {auditLog.length === 0 ? (
                <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Nothing synced yet.</p>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto", display: "grid", gap: 4 }}>
                  {auditLog.map((entry, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f3f4f6", color: entry.success ? "#166534" : "#b91c1c" }}>
                      <strong>{new Date(entry.at).toLocaleString("en-IN")}</strong> — {entry.actor} ({entry.role}) {entry.success ? "✅" : "⚠️"}{" "}
                      <span style={{ textTransform: "capitalize" }}>{entry.type}</span>: {entry.label} — {entry.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
