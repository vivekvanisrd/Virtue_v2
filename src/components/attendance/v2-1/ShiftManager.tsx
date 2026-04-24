"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  RefreshCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
    getAttendancePoliciesAction, 
    upsertAttendancePolicyAction, 
    deleteAttendancePolicyAction 
} from "@/lib/actions/attendance-v2-actions";

export function ShiftManager() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newShift, setNewShift] = useState({
    id: undefined as string | undefined,
    name: "",
    startTime: "08:30",
    endTime: "16:30",
    gracePeriod: 15,
    halfDayMinutes: 240,
    weeklyOffs: [0] // Sunday
  });

  const fetchShifts = async () => {
    setLoading(true);
    setError(null);
    try {
        const res = await getAttendancePoliciesAction();
        if (res.success) {
            setShifts(res.data);
        } else {
            setError(res.error);
        }
    } catch (err: any) {
        setError("Network or server failure.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h * 60) + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handleCreate = async () => {
     if (!newShift.name) return alert("Please provide a schedule name.");
     
     setIsSubmitting(true);
     try {
         const payload = {
             ...newShift,
             startMinutes: timeToMinutes(newShift.startTime),
             endMinutes: timeToMinutes(newShift.endTime),
         };
         // Clean up temp UI fields
         delete (payload as any).startTime;
         delete (payload as any).endTime;

         const res = await upsertAttendancePolicyAction(payload);
         if (res.success) {
             setIsAdding(false);
             fetchShifts();
             setNewShift({
                id: undefined,
                name: "",
                startTime: "08:30",
                endTime: "16:30",
                gracePeriod: 15,
                halfDayMinutes: 240,
                weeklyOffs: [0]
             });
         } else {
             alert(res.error || "Failed to deploy schedule.");
         }
     } catch (err: any) {
         alert("Technical failure during deployment: " + err.message);
     } finally {
         setIsSubmitting(false);
     }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the timing logic for all assigned staff.")) return;
    
    try {
        const res = await deleteAttendancePolicyAction(id);
        if (res.success) fetchShifts();
        else alert(res.error || "Failed to delete policy.");
    } catch (err) {
        alert("Action rejected by server.");
    }
  };

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-2xl font-black italic tracking-tighter uppercase">Shift & Schedule HQ</h3>
           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Assigning Time-Based Logic to Branch Staff</p>
        </div>
        <button 
           onClick={() => setIsAdding(true)}
           className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3"
        >
           <Plus className="w-4 h-4" /> Create New Schedule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading && Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="h-64 bg-slate-100 rounded-[2.5rem] animate-pulse" />
         ))}

         {error && (
             <div className="col-span-full p-10 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex flex-col items-center justify-center text-rose-500 gap-4">
                 <ShieldAlert className="w-10 h-10" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
                 <button onClick={fetchShifts} className="px-6 py-3 bg-white border border-rose-200 rounded-xl text-[9px] font-black uppercase hover:bg-rose-100 transition-colors">Retry Sync</button>
             </div>
         )}

         {shifts.length === 0 && !loading && !error && (
             <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400 gap-4">
                 <Clock className="w-12 h-12 opacity-20" />
                 <p className="text-[10px] font-black uppercase tracking-widest">No Active Schedules Found</p>
             </div>
         )}

         {shifts.map((shift) => (
            <div key={shift.id} className="p-8 bg-white border border-border rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="flex justify-between items-start mb-10">
                   <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                      <Clock className="w-5 h-5" />
                   </div>
                   <span className={cn(
                       "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                       shift.name === "Default" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                   )}>
                       {shift.name === "Default" ? "System Primary" : "Custom Group"}
                   </span>
                </div>
                
                <h4 className="text-xl font-black uppercase italic tracking-tighter mb-1">{shift.name}</h4>
                <div className="flex items-center gap-2 mb-8">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Active Logic</p>
                </div>

                <div className="space-y-4 border-t border-slate-50 pt-6">
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black opacity-30 uppercase">Hours</span>
                      <span className="text-[10px] font-black text-slate-900">
                          {minutesToTime(shift.startMinutes)} — {minutesToTime(shift.endMinutes)}
                      </span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black opacity-30 uppercase">Grace</span>
                      <span className="text-[10px] font-black text-emerald-600">{shift.gracePeriod} Minutes</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-[10px] font-black opacity-30 uppercase">Offs</span>
                      <div className="flex gap-1">
                         {DAYS.map((d, i) => (
                            <span key={d} className={cn(
                               "text-[9px] font-black p-1 uppercase",
                               shift.weeklyOffs.includes(i) ? "text-rose-500 underline" : "text-slate-200"
                            )}>{d}</span>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4 bg-slate-50 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300 flex gap-2">
                   <button 
                      onClick={() => {
                          setNewShift({
                              id: shift.id,
                              name: shift.name,
                              startTime: minutesToTime(shift.startMinutes),
                              endTime: minutesToTime(shift.endMinutes),
                              gracePeriod: shift.gracePeriod,
                              halfDayMinutes: shift.halfDayMinutes,
                              weeklyOffs: shift.weeklyOffs
                          });
                          setIsAdding(true);
                      }}
                      className="flex-1 py-3 bg-white border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors"
                   >
                       Configure
                   </button>
                   {shift.name !== "Default" && (
                       <button 
                          onClick={() => handleDelete(shift.id)}
                          className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                       >
                           <Trash2 className="w-4 h-4" />
                       </button>
                   )}
                </div>
            </div>
         ))}
      </div>

      {/* --- ADD SHIFT OVERLAY --- */}
      {isAdding && (
         <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-3xl flex items-center justify-center p-6 sm:p-10">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-300">
               <div className="p-10 bg-slate-50 border-b border-border text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white shadow-2xl shadow-blue-500/30">
                     <Clock className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-2">
                      {newShift.id ? "Update Schedule" : "Configure New Shift"}
                  </h4>
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-relaxed">Defining automated arrival & exit conditions</p>
               </div>

               <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Schedule Name</label>
                     <input 
                        type="text" 
                        value={newShift.name}
                        onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                        placeholder="e.g. Senior Secondary Faculty"
                        className="w-full text-sm font-black italic text-slate-900 bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:italic placeholder:opacity-20"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clock In</label>
                        <input 
                            type="time" 
                            value={newShift.startTime}
                            onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clock Out</label>
                        <input 
                            type="time" 
                            value={newShift.endTime}
                            onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Grace (Mins)</label>
                        <input 
                            type="number" 
                            value={newShift.gracePeriod}
                            onChange={(e) => setNewShift({ ...newShift, gracePeriod: parseInt(e.target.value) })}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Half-Day (Mins)</label>
                        <input 
                            type="number" 
                            value={newShift.halfDayMinutes}
                            onChange={(e) => setNewShift({ ...newShift, halfDayMinutes: parseInt(e.target.value) })}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500/20" 
                        />
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Weekly Offs</label>
                     <div className="flex flex-wrap gap-2">
                        {DAYS.map((day, i) => (
                            <button
                                key={day}
                                onClick={() => {
                                    const current = [...newShift.weeklyOffs];
                                    if (current.includes(i)) {
                                        setNewShift({ ...newShift, weeklyOffs: current.filter(x => x !== i) });
                                    } else {
                                        setNewShift({ ...newShift, weeklyOffs: [...current, i] });
                                    }
                                }}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    newShift.weeklyOffs.includes(i) ? "bg-rose-500 text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                )}
                            >
                                {day}
                            </button>
                        ))}
                     </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl flex items-center gap-4 text-blue-900 border border-blue-100">
                     <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
                        <ShieldAlert className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Sovereign Logic Active</p>
                        <p className="text-[9px] font-medium opacity-60">Status calculation is based on branch server time.</p>
                     </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-50 bg-slate-50 flex gap-4">
                  <button 
                     disabled={isSubmitting}
                     onClick={() => setIsAdding(false)}
                     className="flex-1 py-5 bg-white border border-border rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                     Cancel
                  </button>
                  <button 
                     disabled={isSubmitting}
                     onClick={handleCreate}
                     className="flex-1 py-5 bg-blue-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                     {isSubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : (newShift.id ? "Update Policy" : "Deploy Schedule")}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
