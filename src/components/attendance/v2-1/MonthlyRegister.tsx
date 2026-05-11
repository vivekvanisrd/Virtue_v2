"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Filter,
  Check,
  X,
  Clock,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { getMonthlyStaffAttendanceSummary } from "@/lib/actions/attendance-actions";

export function MonthlyRegister() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [staff, setStaff] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    const [staffRes, attRes] = await Promise.all([
      getStaffDirectoryAction(),
      getMonthlyStaffAttendanceSummary(month, year, "GLOBAL")
    ]);

    if (staffRes.success) setStaff(staffRes.data);
    if (attRes.success) setAttendanceData(attRes.summary || {});
    setLoading(false);
  };

  const nextMonth = () => setCurrentDate(new Date(year, month, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Loading Monthly Ledger...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-2xl font-black italic tracking-tighter uppercase min-w-[200px] text-center">
                {currentDate.toLocaleString('default', { month: 'long' })} {year}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-6 py-3 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all">
              <Download className="w-4 h-4" /> Export Report
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-border shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border-spacing-0">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 min-w-[200px] border-r border-border font-black text-[10px] uppercase tracking-widest text-slate-400">Staff Member</th>
                {Array.from({ length: daysInMonth }).map((_, i) => (
                  <th key={i} className={cn(
                    "px-2 py-4 text-center min-w-[40px] font-black text-[9px] border-r border-slate-100",
                    new Date(year, month-1, i+1).getDay() === 0 ? "bg-rose-50 text-rose-400" : "text-slate-400"
                  )}>
                    {i + 1}
                    <div className="text-[7px] opacity-40">{new Date(year, month-1, i+1).toLocaleString('default', { weekday: 'short' }).charAt(0)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-border shadow-[5px_0_10px_rgba(0,0,0,0.02)]">
                     <p className="text-xs font-black text-slate-900 truncate uppercase italic">{s.firstName}</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{s.staffCode}</p>
                  </td>
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                    const status = attendanceData[s.id]?.days?.[dateKey]?.status;
                    const isLate = attendanceData[s.id]?.days?.[dateKey]?.isLate;
                    const isSunday = new Date(year, month-1, i+1).getDay() === 0;

                    return (
                      <td key={i} className={cn(
                        "px-2 py-4 text-center border-r border-slate-100",
                        isSunday && "bg-rose-50/30"
                      )}>
                        {status === "Present" ? (
                           <div className="flex flex-col items-center">
                              <div className={cn("w-2 h-2 rounded-full", isLate ? "bg-amber-500" : "bg-emerald-500")} />
                              {isLate && <Clock className="w-2 h-2 text-amber-500 mt-1" />}
                           </div>
                        ) : status === "Absent" ? (
                           <X className="w-3 h-3 text-rose-400 mx-auto" />
                        ) : (
                           <Minus className="w-2 h-2 text-slate-200 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-8 p-6 bg-slate-50 rounded-3xl border border-dashed border-border">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Present / On-Time</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Late Arrival</span>
         </div>
         <div className="flex items-center gap-2">
            <X className="w-3 h-3 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Absent</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-rose-100 rounded-sm" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sunday / Holiday</span>
         </div>
      </div>
    </div>
  );
}
