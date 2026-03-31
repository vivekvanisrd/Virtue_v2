"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  History,
  AlertCircle,
  Zap,
  ArrowRightCircle,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { submitStaffAttendanceAction } from "@/lib/actions/attendance-actions";

export function StaffAttendanceSheet() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Attendance State: Record per staffId
  const [attendance, setAttendance] = useState<Record<string, { 
    status: "Present" | "Absent" | "Half-Day" | "LOP",
    checkIn?: string,
    checkOut?: string
  }>>({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const result = await getStaffDirectoryAction();
    if (result.success) {
      setStaff(result.data);
      // Initialize with default "Present" at school start time
      const initial: any = {};
      result.data.forEach((s: any) => {
        initial[s.id] = { status: "Present", checkIn: "08:30", checkOut: "16:30" };
      });
      setAttendance(initial);
    }
    setLoading(false);
  };

  const updateEntry = (staffId: string, updates: any) => {
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], ...updates }
    }));
  };

  const setBulkTiming = (time: string, type: "checkIn" | "checkOut") => {
    const updated = { ...attendance };
    Object.keys(updated).forEach(id => {
       if (updated[id].status === "Present" || updated[id].status === "Half-Day") {
          updated[id][type] = time;
       }
    });
    setAttendance(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = Object.entries(attendance).map(([staffId, data]) => ({
      staffId,
      ...data,
      date
    }));
    
    const result = await submitStaffAttendanceAction(payload);
    if (result.success) {
      alert("Attendance Saved Successfully");
    } else {
      alert("Error: " + result.error);
    }
    setSubmitting(false);
  };

  const filteredStaff = staff.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-20 text-center opacity-40 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Syncing Precision Attendance Sheet...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      {/* ─── Control Bar ─── */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
              <Calendar className="w-6 h-6" />
           </div>
           <div>
              <input 
                 type="date"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
                 className="text-2xl font-black tracking-tighter bg-transparent border-none p-0 outline-none w-auto cursor-pointer"
              />
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-1 text-slate-400">Staff Attendance Ledger</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input 
                 type="text"
                 placeholder="Search staff..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full lg:w-64 pl-11 pr-4 py-3 bg-slate-50 border border-border rounded-2xl text-xs font-bold outline-none"
              />
           </div>
           {/* Bulk Helpers */}
           <div className="flex bg-slate-100 p-1 rounded-2xl border border-border">
              <button onClick={() => setBulkTiming("08:30", "checkIn")} className="px-3 py-2 bg-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm border border-border/50">8:30 IN</button>
              <button onClick={() => setBulkTiming("16:30", "checkOut")} className="px-3 py-2 hover:bg-slate-50 text-[9px] font-black uppercase tracking-widest rounded-xl">4:30 OUT</button>
           </div>
        </div>
      </div>

      {/* ─── High Density Attendance Grid ─── */}
      <div className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="bg-slate-50 border-b border-border font-black text-[10px] uppercase tracking-widest text-foreground/40">
                     <th className="px-8 py-5">Staff Information</th>
                     <th className="px-8 py-5">Attendance Status</th>
                     <th className="px-8 py-5 text-blue-600">Entry Time</th>
                     <th className="px-8 py-5 text-indigo-600">Exit Time</th>
                     <th className="px-8 py-5 text-right">Notes</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredStaff.map((s) => (
                     <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className={cn(
                                 "w-2 h-10 rounded-full",
                                 attendance[s.id]?.status === "Present" ? "bg-emerald-500" :
                                 attendance[s.id]?.status === "Absent" ? "bg-rose-500" : "bg-amber-500"
                              )} />
                              <div>
                                 <p className="font-black text-slate-900 text-sm tracking-tight">{s.firstName} {s.lastName}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.staffCode}</p>
                              </div>
                           </div>
                        </td>
                        
                        <td className="px-8 py-6">
                           <select 
                              value={attendance[s.id]?.status}
                              onChange={(e) => updateEntry(s.id, { status: e.target.value })}
                              className={cn(
                                 "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all outline-none",
                                 attendance[s.id]?.status === "Present" ? "bg-emerald-100/50 border-emerald-200 text-emerald-700" :
                                 attendance[s.id]?.status === "Absent" ? "bg-rose-100/50 border-rose-200 text-rose-700" : "bg-amber-100/50 border-amber-200 text-amber-700"
                              )}
                           >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Half-Day">Half-Day</option>
                              <option value="LOP">Loss of Pay</option>
                           </select>
                        </td>

                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-blue-400" />
                              <input 
                                 type="time"
                                 value={attendance[s.id]?.checkIn || ""}
                                 disabled={attendance[s.id]?.status === "Absent"}
                                 onChange={(e) => updateEntry(s.id, { checkIn: e.target.value })}
                                 className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-30"
                              />
                           </div>
                        </td>

                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-indigo-400" />
                              <input 
                                 type="time"
                                 value={attendance[s.id]?.checkOut || ""}
                                 disabled={attendance[s.id]?.status === "Absent"}
                                 onChange={(e) => updateEntry(s.id, { checkOut: e.target.value })}
                                 className="px-3 py-2 bg-slate-50 border border-border rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-30"
                              />
                           </div>
                        </td>

                        <td className="px-8 py-6 text-right">
                           {attendance[s.id]?.checkIn && attendance[s.id]?.checkIn > "09:00" && (
                              <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded-md border border-amber-100">Late Comer</span>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="flex items-center justify-between gap-6 p-10 bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
         <div>
            <h4 className="text-white text-xl font-black tracking-tight mb-2">Finalize Daily Ledger</h4>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">System will auto-calculate payrun penalties for late comers and LOP entries.</p>
         </div>
         <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="px-10 py-5 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
         >
            {submitting ? "Syncing..." : "Submit Staff Attendance"}
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
         </button>
      </div>
    </div>
  );
}
