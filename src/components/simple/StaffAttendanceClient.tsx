"use client";

import { useMemo, useState, useTransition } from "react";
import { getBranchAttendanceSummary, correctAttendanceDay } from "@/lib/actions/simple/staff-attendance-actions";
import { Pager, SortHeader, tdStyle, thStyle, useSort, PAGE_SIZE } from "./table-helpers";

type SummaryResult = Awaited<ReturnType<typeof getBranchAttendanceSummary>>;
type SummaryData = Extract<SummaryResult, { success: true }>["data"];
type StaffRow = SummaryData["rows"][number];

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const STATUS_OPTIONS = ["Present", "Absent", "Late", "Half-Day"] as const;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function StaffAttendanceClient({ branches }: { branches: { id: string; name: string }[] }) {
  const now = new Date();
  const [isPending, startTransition] = useTransition();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [branchId, setBranchId] = useState<string>(branches[0]?.id || "");
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [drilldown, setDrilldown] = useState<StaffRow | null>(null);
  const [correctDate, setCorrectDate] = useState("");
  const [correctStatus, setCorrectStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Present");
  const [correctCheckIn, setCorrectCheckIn] = useState("");
  const [correctCheckOut, setCorrectCheckOut] = useState("");
  const [correctRemarks, setCorrectRemarks] = useState("");
  const [saveMessage, setSaveMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  function load() {
    setError(null);
    startTransition(async () => {
      const res = await getBranchAttendanceSummary({ month, year, branchId: branches.length > 0 ? branchId : undefined });
      if (res.success) {
        setData(res.data);
        setPage(1);
      } else {
        setError(res.error);
        setData(null);
      }
    });
  }

  function submitCorrection() {
    if (!drilldown || !correctDate) return;
    setSaveMessage(null);
    startTransition(async () => {
      const res = await correctAttendanceDay({
        staffId: drilldown.staffId,
        date: correctDate,
        status: correctStatus,
        checkIn: correctCheckIn || null,
        checkOut: correctCheckOut || null,
        remarks: correctRemarks || undefined,
      });
      if (res.success) {
        setSaveMessage({ kind: "success", text: "Saved." });
        load();
      } else {
        setSaveMessage({ kind: "error", text: res.error });
      }
    });
  }

  const sort = useSort<StaffRow>(
    data?.rows || [],
    (row, key) => {
      switch (key) {
        case "name":
          return row.name;
        case "present":
          return row.present;
        case "absent":
          return row.absent;
        case "lwp":
          return row.lwp;
        case "lateCount":
          return row.lateCount;
        default:
          return "";
      }
    },
    "name"
  );

  const totalPages = Math.max(1, Math.ceil(sort.sorted.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageRows = sort.sorted.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);

  const drilldownDays = useMemo(() => {
    if (!drilldown) return [];
    return Object.entries(drilldown.days)
      .map(([date, info]) => ({ date, ...(info as any) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [drilldown]);

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
          onClick={load}
          style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: isPending ? "#93c5fd" : "#2563eb", color: "#ffffff", cursor: isPending ? "default" : "pointer" }}
        >
          {isPending && !data ? "Loading…" : "Load attendance"}
        </button>
      </div>

      {error && (
        <p style={{ margin: 0, color: "#b91c1c", fontWeight: 600, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12 }}>{error}</p>
      )}

      {data && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={thStyle}>#</th>
                <SortHeader label="Name" sortKey="name" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} />
                <th style={thStyle}>Staff code</th>
                <SortHeader label="Present" sortKey="present" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} />
                <SortHeader label="Absent" sortKey="absent" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} />
                <SortHeader label="LWP" sortKey="lwp" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} />
                <SortHeader label="Late count" sortKey="lateCount" activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} />
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={row.staffId} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 1 ? "#f8fafc" : undefined }}>
                  <td style={tdStyle}>{(pageClamped - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={tdStyle}>{row.staffCode}</td>
                  <td style={{ ...tdStyle, color: "#15803d", fontWeight: 600 }}>{row.present}</td>
                  <td style={{ ...tdStyle, color: row.absent > 0 ? "#b91c1c" : "#111827" }}>{row.absent}</td>
                  <td style={tdStyle}>{row.lwp}</td>
                  <td style={{ ...tdStyle, color: row.lateCount > 0 ? "#b45309" : "#111827" }}>{row.lateCount}</td>
                  <td style={tdStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        setDrilldown(row);
                        setSaveMessage(null);
                        setCorrectDate("");
                      }}
                      style={{ fontSize: 13, fontWeight: 600, padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", cursor: "pointer" }}
                    >
                      View / correct
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={pageClamped} totalPages={totalPages} totalRows={sort.sorted.length} onChange={setPage} />
        </div>
      )}

      {drilldown && (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>{drilldown.name} — {MONTH_NAMES[month - 1]} {year}</h2>
            <button type="button" onClick={() => setDrilldown(null)} style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
              Close ✕
            </button>
          </div>

          <div style={{ display: "grid", gap: 4, maxHeight: 200, overflowY: "auto" }}>
            {drilldownDays.length === 0 ? (
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>No attendance rows this month yet.</p>
            ) : (
              drilldownDays.map((d) => (
                <div key={d.date} style={{ fontSize: 13, display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <strong style={{ minWidth: 90 }}>{d.date}</strong>
                  <span>{d.status}</span>
                  {d.isLate && <span style={{ color: "#b45309" }}>Late</span>}
                  {d.checkIn && <span style={{ color: "#6b7280" }}>In: {new Date(d.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                  {d.checkOut && <span style={{ color: "#6b7280" }}>Out: {new Date(d.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
              ))
            )}
          </div>

          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, display: "grid", gap: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#111827" }}>Mark or correct a day</h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Date
                <input type="date" value={correctDate} onChange={(e) => setCorrectDate(e.target.value)} style={selectStyle} />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Status
                <select value={correctStatus} onChange={(e) => setCorrectStatus(e.target.value as any)} style={selectStyle}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Check-in (optional)
                <input type="time" value={correctCheckIn} onChange={(e) => setCorrectCheckIn(e.target.value)} style={selectStyle} />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
                Check-out (optional)
                <input type="time" value={correctCheckOut} onChange={(e) => setCorrectCheckOut(e.target.value)} style={selectStyle} />
              </label>
              <label style={{ display: "grid", gap: 4, fontSize: 13, flex: 1, minWidth: 160 }}>
                Remarks (optional)
                <input type="text" value={correctRemarks} onChange={(e) => setCorrectRemarks(e.target.value)} style={selectStyle} />
              </label>
              <button
                type="button"
                disabled={isPending || !correctDate}
                onClick={submitCorrection}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: !correctDate ? "#d1d5db" : isPending ? "#86efac" : "#16a34a",
                  color: "#ffffff",
                  cursor: !correctDate || isPending ? "default" : "pointer",
                }}
              >
                Save
              </button>
            </div>
            {saveMessage && (
              <p style={{ margin: 0, fontWeight: 600, color: saveMessage.kind === "success" ? "#15803d" : "#b91c1c" }}>{saveMessage.text}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = { fontSize: 14, padding: "8px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" };
