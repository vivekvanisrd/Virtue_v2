"use client";

import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  CalendarDays,
  XCircle,
  LayoutGrid,
  Rows,
  RefreshCcw
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { overrideAttendanceStatusAction, getMonthlyAttendanceMatrixAction } from "@/lib/actions/attendance-v2-actions";
import { useTabs } from "@/context/tab-context";
import { Users as UserIcon } from "lucide-react";

export function MonthlyRegister() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staff, setStaff] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, Record<number, any>>>({});
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ staffId: string, day: number, dayDate: Date, attendanceId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<"COMFORT" | "COMPACT">("COMPACT");
  const [isSaving, setIsSaving] = useState(false);
  const [hoveredStaffId, setHoveredStaffId] = useState<string | null>(null);
  const { openTab } = useTabs();

  // 🖱️ Kinetic Panning State
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const fetchRegistry = async () => {
    setLoading(true);
    try {
        const [staffRes, matrixRes] = await Promise.all([
          getStaffDirectoryAction(),
          getMonthlyAttendanceMatrixAction(currentDate.getMonth(), currentDate.getFullYear())
        ]);
        if (staffRes.success) setStaff(staffRes.data);
        if (matrixRes.success) setMatrix(matrixRes.data);
    } catch (err) {
        console.error("Registry Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [currentDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return "bg-emerald-500 text-white";
      case "Late": return "bg-amber-500 text-white";
      case "Absent": return "bg-rose-500 text-white";
      case "Half-Day": return "bg-violet-500 text-white";
      case "Weekly-Off": return "bg-slate-100 text-slate-400";
      default: return "bg-slate-50";
    }
  };

  const handleOverride = async (status: string) => {
    if (!editingCell || isSaving) return;
    
    setIsSaving(true);
    try {
        const res = await overrideAttendanceStatusAction(
            editingCell.attendanceId || `TEMP-${editingCell.staffId}-${editingCell.day}`, 
            editingCell.staffId, 
            editingCell.dayDate, 
            status
        );

        if (res.success) {
          setEditingCell(null);
          await fetchRegistry();
        } else {
            alert(res.error || "Override Failed: Authority mismatch.");
        }
    } catch (err) {
        alert("SYSTEM_REJECT: Matrix write failure.");
    } finally {
        setIsSaving(false);
    }
  };

  const openProfile = (id: string, name: string) => {
    openTab({
        id: `staff-profile-${id}`,
        title: `${name.split(' ')[0]}'s Profile`,
        icon: UserIcon,
        component: "Staff",
        params: { staffId: id, forceEdit: true }
    });
  };

  // 🖱️ Kinetic Scroll Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === "COMPACT") return;
    setIsDown(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };
  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 2;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    <div className="bg-white rounded-[3rem] border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* ───── REGISTER HEADER ───── */}
      <div className="p-8 lg:p-10 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6 bg-slate-50/50">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <CalendarDays className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-900">
              Attendance Matrix <span className="text-blue-600">v2.1</span>
            </h3>
            <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.3em]">
              {format(currentDate, "MMMM yyyy")} • {staff.length} Active Personnel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
            {/* View Option Toggle */}
            <div className="flex bg-white rounded-2xl border border-border p-1 shadow-sm">
                <button onClick={() => setViewMode("COMFORT")} className={cn("p-3 rounded-xl transition-all", viewMode === "COMFORT" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>
                    <Rows className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("COMPACT")} className={cn("p-3 rounded-xl transition-all", viewMode === "COMPACT" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50")}>
                    <LayoutGrid className="w-4 h-4" />
                </button>
            </div>

           <div className="flex bg-white rounded-2xl border border-border p-1 shadow-sm">
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-slate-50 rounded-xl transition-colors">
               <ChevronLeft className="w-5 h-5 text-slate-600" />
             </button>
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-slate-50 rounded-xl transition-colors">
               <ChevronRight className="w-5 h-5 text-slate-600" />
             </button>
           </div>
           
           <button className="flex-1 lg:flex-none px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3">
             <Save className="w-4 h-4" /> Bulk Pulse
           </button>
        </div>
      </div>

      {/* ───── REGISTER GRID (⚡ COMPACT NO-SCROLL VERSION) ───── */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
            "overflow-x-auto custom-scrollbar select-none",
            isDown ? "cursor-grabbing" : "cursor-grab"
        )}
      >
        <table className={cn(
            "w-full border-collapse",
            viewMode === "COMPACT" ? "table-fixed" : "min-w-max"
        )}>
          <thead>
            <tr className="bg-slate-50/80 border-b border-border text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono">
              <th className={cn(
                  "py-6 text-left border-r border-border backdrop-blur-md sticky left-0 bg-white/80 z-30 transition-all",
                  viewMode === "COMPACT" ? "w-[180px] px-6" : "min-w-[280px] px-10"
              )}>Personnel Registry</th>
              {days.map((day) => {
                const dayNum = day.getDate();
                const isSun = isSunday(day);
                return (
                  <th key={day.toString()} className={cn(
                    "px-0.5 text-center border-r border-slate-100",
                    viewMode === "COMFORT" ? "min-w-[60px] py-6" : "w-[2.6%] py-4",
                    isSun && "bg-slate-100/30 text-slate-200"
                  )}>
                    <p className="opacity-30">{format(day, "EE")[0]}</p>
                    <p className={cn("text-slate-900", viewMode === "COMFORT" ? "text-sm" : "text-[10px]")}>{dayNum}</p>
                  </th>
                );
              })}
              <th className="w-16 py-6 text-center bg-slate-100/50 sticky right-0 z-20 border-l border-border text-[7px]">MTD</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const staffMatrix = matrix[s.id] || {};
              const records = Object.values(staffMatrix) as any[];
              const mtd = {
                present: records.filter(r => r.status === "Present" || r.status === "Late").length,
                absent: records.filter(r => r.status === "Absent").length,
                late: records.filter(r => r.status === "Late").length,
                halfDay: records.filter(r => r.status === "Half-Day").length,
                lp: records.filter(r => r.status === "LP").length
              };

              return (
                <tr key={s.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 h-9">
                  <td className={cn(
                      "py-3 border-r border-border sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-30 relative",
                      viewMode === "COMPACT" ? "px-6" : "px-10"
                  )}>
                    <div 
                        className="flex items-center gap-2 cursor-pointer"
                        onMouseEnter={() => setHoveredStaffId(s.id)}
                        onMouseLeave={() => setHoveredStaffId(null)}
                        onClick={() => openProfile(s.id, `${s.firstName} ${s.lastName}`)}
                    >
                       <div className={cn(
                           "bg-slate-100 rounded-lg flex items-center justify-center font-black text-slate-400 uppercase group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden",
                           viewMode === "COMPACT" ? "w-6 h-6 text-[8px]" : "w-10 h-10 text-xs"
                       )}>
                          {s.firstName[0]}{s.lastName[0]}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={cn(
                              "font-black text-slate-900 uppercase tracking-tight truncate italic group-hover:text-blue-600 transition-colors",
                              viewMode === "COMPACT" ? "text-[10px]" : "text-[11px]"
                          )}>
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest">{s.staffCode}</p>
                       </div>
                    </div>

                    {/* ───── SOVEREIGN SUMMARY TOOLTIP ───── */}
                    {hoveredStaffId === s.id && (
                        <div className="absolute left-[80%] top-[90%] w-56 bg-white/95 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 z-[100] animate-in zoom-in-95 fade-in duration-300 pointer-events-none">
                            <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xs text-slate-400">
                                    {s.firstName[0]}{s.lastName[0]}
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{s.firstName}</h4>
                                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Month Review</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                                    <p className="text-emerald-700 text-lg font-black leading-none">{mtd.present}</p>
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mt-1">Present</p>
                                </div>
                                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                                    <p className="text-rose-700 text-lg font-black leading-none">{mtd.absent}</p>
                                    <p className="text-[7px] font-black text-rose-500 uppercase tracking-widest mt-1">Absent</p>
                                </div>
                                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
                                    <p className="text-amber-700 text-lg font-black leading-none">{mtd.late}</p>
                                    <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest mt-1">Late</p>
                                </div>
                                <div className="bg-violet-50 p-3 rounded-2xl border border-violet-100 text-center">
                                    <p className="text-violet-700 text-lg font-black leading-none">{mtd.lp}</p>
                                    <p className="text-[7px] font-black text-violet-500 uppercase tracking-widest mt-1">LP</p>
                                </div>
                            </div>
                            <p className="text-center text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-5 italic">Click to view full identity</p>
                        </div>
                    )}
                  </td>
                  {days.map((day) => {
                    const dayNum = day.getDate();
                    const record = staffMatrix[dayNum];
                    const isSun = isSunday(day);
                    const status = record?.status || (isSun ? "Weekly-Off" : "Empty");
                    
                    const isEditing = editingCell?.staffId === s.id && editingCell.day === dayNum;

                    return (
                      <td key={day.toString()} className={cn(
                        "p-0.5 border-r border-slate-50 transition-all relative",
                        isSun && "bg-slate-50/10",
                        isEditing && "z-50"
                      )}>
                        <div 
                          onClick={(e) => { e.stopPropagation(); setEditingCell({ staffId: s.id, day: dayNum, dayDate: day, attendanceId: record?.id }); }}
                          className={cn(
                            "w-full rounded-md flex items-center justify-center font-black cursor-pointer hover:shadow-md active:scale-95 transition-all relative overflow-hidden",
                            viewMode === "COMFORT" ? "h-10 text-[9px]" : "h-6 text-[8px]",
                            getStatusColor(status)
                          )}
                        >
                          {status === "Present" && "P"}
                          {status === "Late" && "L"}
                          {status === "Absent" && "A"}
                          {status === "Half-Day" && "HD"}
                          {status === "LP" && "LP"}
                          {status === "Weekly-Off" && "—"}
                          {record?.isOverridden && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full border border-blue-500 shadow-sm" />}
                        </div>

                        {/* ───── QUICK ACTION HUD ───── */}
                        {isEditing && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white rounded-2xl p-2 shadow-2xl flex items-center gap-1 z-50 animate-in zoom-in-95 duration-200 border border-white/10">
                                {[
                                    { label: "P", status: "Present", color: "bg-emerald-500" },
                                    { label: "A", status: "Absent", color: "bg-rose-500" },
                                    { label: "L", status: "Late", color: "bg-amber-500" },
                                    { label: "HD", status: "Half-Day", color: "bg-violet-500" },
                                    { label: "LP", status: "LP", color: "bg-slate-600" }
                                ].map((btn) => (
                                    <button 
                                        key={btn.label}
                                        onClick={(e) => { e.stopPropagation(); handleOverride(btn.status); }}
                                        disabled={isSaving}
                                        className={cn(
                                            "w-9 h-9 rounded-xl font-black text-[10px] border border-white/10 hover:scale-110 active:scale-95 transition-all outline-none shadow-xl flex items-center justify-center",
                                            btn.color,
                                            isSaving && "animate-spin opacity-50"
                                        )}
                                    >
                                        {isSaving ? <RefreshCcw className="w-4 h-4" /> : btn.label}
                                    </button>
                                ))}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingCell(null); }}
                                    disabled={isSaving}
                                    className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-30"
                                >
                                    <XCircle className="w-4 h-4 text-white/40" />
                                </button>
                            </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="w-16 h-full font-black text-slate-900 text-[10px] text-center sticky right-0 bg-slate-50 border-l border-border z-20 transition-colors group-hover:bg-slate-100">
                    {mtd.present}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* ─── HI-FIDELITY GRID OVERLAY ─── */}
        {loading && staff.length > 0 && (
            <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] z-10 pointer-events-none" />
        )}
      </div>

      {/* ───── LOADING SHIMMER ───── */}
      {loading && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-600/10 overflow-hidden">
              <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite] w-[40%]" />
          </div>
      )}

      {/* ───── REGISTER LEGEND ───── */}
      <div className="p-8 bg-slate-50 border-t border-border flex flex-wrap items-center gap-8 justify-center">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-md" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Present (P)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-md" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Late (L)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-500 rounded-md" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Absent (A)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-violet-500 rounded-md" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Half-Day (HD)</span>
         </div>
         <div className="flex items-center gap-2 ml-8 italic opacity-40">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full border border-white shadow-sm" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-900">Overridden Pulse</span>
         </div>
      </div>
      
      <style jsx global>{`
          @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
          }
      `}</style>
    </div>
  );
}
