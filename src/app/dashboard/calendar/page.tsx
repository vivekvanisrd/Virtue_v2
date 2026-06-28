"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sun,
  BookOpen,
  Landmark,
  Plus,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Download,
} from "lucide-react";
import {
  getCalendarMonthAction,
  setCalendarDayAction,
  resetCalendarDayAction,
  loadPublicHolidaysAction,
  updateSaturdayPolicyAction,
  CalendarDay,
  CalendarDayType,
} from "@/lib/actions/calendar-actions";
import { useTenant } from "@/context/tenant-context";

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const getTodayInTimezone = (tz: string) => {
  try {
    const options = { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date());
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
};

const TYPE_META: Record<CalendarDayType, { label: string; bg: string; text: string; dot: string }> = {
  WORKING:       { label: "Working",        bg: "bg-emerald-950/40",  text: "text-emerald-300", dot: "bg-emerald-500" },
  EXTRA_WORKING: { label: "Extra Working",  bg: "bg-blue-950/40",     text: "text-blue-300",    dot: "bg-blue-500" },
  HOLIDAY:       { label: "Holiday",        bg: "bg-rose-950/40",     text: "text-rose-300",    dot: "bg-rose-500" },
  PUBLIC_HOLIDAY:{ label: "Public Holiday", bg: "bg-amber-950/40",    text: "text-amber-300",   dot: "bg-amber-500" },
  WEEKLY_OFF:    { label: "Weekly Off",     bg: "bg-slate-800/60",    text: "text-slate-400",   dot: "bg-slate-500" },
};

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium
      ${ok ? "bg-emerald-900/90 border-emerald-700 text-emerald-200" : "bg-rose-900/90 border-rose-700 text-rose-200"}`}>
      {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  day,
  onClose,
  onSave,
  onReset,
  saving,
  activeBranchId,
  userRole,
}: {
  day: CalendarDay;
  onClose: () => void;
  onSave: (type: CalendarDayType, reason: string, targetBranchId: string | null) => void;
  onReset: (targetBranchId: string | null) => void;
  saving: boolean;
  activeBranchId: string | null;
  userRole?: string;
}) {
  const [type, setType] = useState<CalendarDayType>(day.type === "WORKING" || day.type === "WEEKLY_OFF" ? "HOLIDAY" : day.type);
  const [reason, setReason] = useState(day.reason || "");
  const [scope, setScope] = useState<"GLOBAL" | "BRANCH">(day.id && !activeBranchId ? "GLOBAL" : "BRANCH");

  const isAutoDay = !day.isOverride && day.id === "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg">
            {new Date(day.date + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Set how this day is counted in payroll</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-2 gap-2">
            {(["HOLIDAY", "PUBLIC_HOLIDAY", "EXTRA_WORKING", "WEEKLY_OFF"] as CalendarDayType[]).map((t) => {
              const m = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                    ${type === t ? `${m.bg} ${m.text} border-current` : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                >
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Reason */}
          <div>
            <label className="text-slate-400 text-xs font-medium uppercase tracking-wider block mb-1.5">Reason *</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual Day, School Closure, Compensatory Working..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Scope Selector */}
          {activeBranchId && (
            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wider block font-mono">Target Scope</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope("BRANCH")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider
                    ${scope === "BRANCH" ? "bg-blue-600/20 text-blue-400 border-blue-500" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                >
                  Branch Only
                </button>
                {(userRole === "OWNER" || userRole === "DEVELOPER") && (
                  <button
                    type="button"
                    onClick={() => setScope("GLOBAL")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all uppercase tracking-wider
                      ${scope === "GLOBAL" ? "bg-purple-600/20 text-purple-400 border-purple-500" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}
                  >
                    Whole School
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {day.isOverride && (
            <button
              onClick={() => onReset(scope === "GLOBAL" ? null : activeBranchId)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 border border-slate-700 text-sm hover:border-slate-500 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to Auto
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} type="button" className="px-4 py-2.5 rounded-xl text-slate-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(type, reason, scope === "GLOBAL" ? null : activeBranchId)}
            disabled={saving || !reason.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const tenant = useTenant();
  const branchId = tenant?.branchId || null;
  const userRole = tenant?.userRole;

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [workingDays, setWorkingDays] = useState(0);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [satPolicy, setSatPolicy] = useState<"ALL_WORKING" | "SECOND_OFF" | "ALL_OFF">("SECOND_OFF");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCalendarMonthAction(year, month, branchId || undefined);
    if (res.success) {
      setDays(res.days);
      setWorkingDays(res.workingDays);
      if (res.satPolicy) setSatPolicy(res.satPolicy as any);
      if (res.timezone) setTimezone(res.timezone);
    }
    setLoading(false);
  }, [year, month, branchId]);

  useEffect(() => { load(); }, [load]);

  const navigate = (dir: -1 | 1) => {
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    setMonth(m);
    setYear(y);
  };

  const handleSave = (type: CalendarDayType, reason: string, targetBranchId: string | null) => {
    if (!selected) return;
    startTransition(async () => {
      const res = await setCalendarDayAction(selected.date, type, reason, targetBranchId || undefined);
      if (res.success) { showToast("Day updated.", true); await load(); }
      else showToast(res.error || "Failed to save.", false);
      setSelected(null);
    });
  };

  const handleReset = (targetBranchId: string | null) => {
    if (!selected) return;
    startTransition(async () => {
      const res = await resetCalendarDayAction(selected.date, targetBranchId || undefined);
      if (res.success) { showToast("Reset to automatic.", true); await load(); }
      else showToast(res.error || "Failed to reset.", false);
      setSelected(null);
    });
  };

  const handleLoadHolidays = () => {
    startTransition(async () => {
      const res = await loadPublicHolidaysAction(year);
      if (res.success) { showToast(res.message || "Holidays loaded.", true); await load(); }
      else showToast(res.error || "Failed.", false);
    });
  };

  const handleSatPolicy = (p: typeof satPolicy) => {
    setSatPolicy(p);
    startTransition(async () => {
      const res = await updateSaturdayPolicyAction(p);
      if (res.success) { showToast("Saturday policy updated.", true); await load(); }
      else showToast(res.error || "Failed.", false);
    });
  };

  // Build grid with leading empty cells
  const firstDay = days.length > 0 ? new Date(days[0].date + "T12:00:00").getDay() : 0;
  const emptyCells = Array(firstDay).fill(null);

  // Stats
  const stats = {
    working: days.filter(d => d.type === "WORKING" || d.type === "EXTRA_WORKING").length,
    holidays: days.filter(d => d.type === "HOLIDAY" || d.type === "PUBLIC_HOLIDAY").length,
    weeklyOff: days.filter(d => d.type === "WEEKLY_OFF").length,
    overrides: days.filter(d => d.isOverride).length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <CalendarDays className="w-7 h-7 text-blue-500" />
              School Calendar
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage working days, holidays and payroll calendar</p>
          </div>
          <button
            onClick={handleLoadHolidays}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 border border-amber-600/40 text-amber-300 text-sm font-medium hover:bg-amber-600/30 transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Load India Holidays {year}
          </button>
        </div>

        {/* Saturday Policy */}
        <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <Settings2 className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-400 text-sm font-medium">Saturday Policy:</span>
          {(["ALL_WORKING", "SECOND_OFF", "ALL_OFF"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleSatPolicy(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${satPolicy === p ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500"}`}
            >
              {p === "ALL_WORKING" ? "All Working" : p === "SECOND_OFF" ? "2nd Sat Off" : "All Off"}
            </button>
          ))}
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{MONTH_NAMES[month - 1]} {year}</div>
            <div className="text-slate-400 text-sm mt-0.5">{workingDays} working days this month</div>
          </div>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Working Days", value: stats.working, icon: BookOpen, color: "text-emerald-400" },
            { label: "Holidays", value: stats.holidays, icon: Landmark, color: "text-amber-400" },
            { label: "Weekly Off", value: stats.weeklyOff, icon: Sun, color: "text-slate-400" },
            { label: "Manual Overrides", value: stats.overrides, icon: Settings2, color: "text-blue-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-slate-500 text-xs">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-800">
            {DAY_NAMES.map((d) => (
              <div key={d} className={`py-3 text-center text-xs font-semibold uppercase tracking-wider
                ${d === "Sun" ? "text-rose-400" : d === "Sat" ? "text-blue-400" : "text-slate-400"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {emptyCells.map((_, i) => (
                <div key={`empty-${i}`} className="h-20 border-b border-r border-slate-800/50" />
              ))}
              {days.map((day) => {
                const meta = TYPE_META[day.type];
                const dateNum = parseInt(day.date.split("-")[2]);
                const todayStr = getTodayInTimezone(timezone);
                const isToday = day.date === todayStr;
                const isWeekend = new Date(day.date + "T12:00:00").getDay() === 0 || new Date(day.date + "T12:00:00").getDay() === 6;

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelected(day)}
                    className={`h-20 p-2 border-b border-r border-slate-800/50 text-left transition-all hover:brightness-125 relative group
                      ${meta.bg} ${day.type === "WORKING" ? "hover:bg-emerald-900/30" : ""}`}
                  >
                    {/* Date number */}
                    <div className={`text-sm font-bold mb-1 w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? "bg-blue-600 text-white" : isWeekend ? "text-slate-400" : "text-slate-200"}`}>
                      {dateNum}
                    </div>

                    {/* Type label */}
                    {day.type !== "WORKING" && (
                      <div className={`text-[10px] font-medium leading-tight ${meta.text}`}>
                        {day.reason || meta.label}
                      </div>
                    )}

                    {/* Override indicator */}
                    {day.isOverride && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" title="Manual override" />
                    )}

                    {/* Hover edit hint */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-slate-900/80 rounded-lg p-1">
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-400">
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Manual Override
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      {selected && (
        <EditModal
          day={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onReset={handleReset}
          saving={isPending}
          activeBranchId={branchId}
          userRole={userRole}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
