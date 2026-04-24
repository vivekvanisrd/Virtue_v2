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
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ShiftManager() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newShift, setNewShift] = useState({
    name: "",
    startTime: "08:30",
    endTime: "16:30",
    gracePeriod: 15,
    weeklyOffs: [0] // Sunday
  });

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
     // Implementation would call getAttendancePolicyAction/updatePolicyAction
     console.log("Creating shift:", newShift);
     setIsAdding(false);
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
         {/* --- DEFAULT SHIFT CARD --- */}
         <div className="p-8 bg-white border border-border rounded-[2.5rem] shadow-sm relative overflow-hidden group">
            <div className="flex justify-between items-start mb-10">
               <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Clock className="w-5 h-5" />
               </div>
               <span className="px-4 py-1.5 bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">Default Group</span>
            </div>
            
            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-1">Standard Teaching</h4>
            <div className="flex items-center gap-2 mb-8">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">Active Logic</p>
            </div>

            <div className="space-y-4 border-t border-slate-50 pt-6">
               <div className="flex justify-between">
                  <span className="text-[10px] font-black opacity-30 uppercase">Hours</span>
                  <span className="text-[10px] font-black text-slate-900">08:30 AM — 04:30 PM</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-[10px] font-black opacity-30 uppercase">Grace</span>
                  <span className="text-[10px] font-black text-emerald-600">15 Minutes</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-[10px] font-black opacity-30 uppercase">Offs</span>
                  <div className="flex gap-1">
                     {DAYS.map((d, i) => (
                        <span key={d} className={cn(
                           "text-[9px] font-black p-1 uppercase",
                           i === 0 ? "text-rose-500 underline" : "text-slate-200"
                        )}>{d}</span>
                     ))}
                  </div>
               </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-4 bg-slate-50 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
               <button className="w-full py-3 bg-white border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Edit Config</button>
            </div>
         </div>

         {/* --- EXAMPLE DRIVER SHIFT --- */}
         <div className="p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] relative group border-dashed">
            <div className="flex justify-between items-start mb-10">
               <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                  <Zap className="w-5 h-5" />
               </div>
               <span className="px-4 py-1.5 bg-blue-100 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-400 italic">Example</span>
            </div>
            
            <h4 className="text-xl font-black uppercase italic tracking-tighter mb-1">Morning Transport</h4>
            <div className="flex items-center gap-2 mb-8">
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest italic text-blue-600">Special Deployment</p>
            </div>

            <div className="space-y-4 opacity-40 grayscale">
               <div className="flex justify-between">
                  <span className="text-[10px] font-black opacity-30 uppercase">Hours</span>
                  <span className="text-[10px] font-black text-slate-900">07:00 AM — 03:00 PM</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-[10px] font-black opacity-30 uppercase">Offs</span>
                  <span className="text-[10px] font-black text-slate-900">Mon, Tue</span>
               </div>
            </div>

            <div className="mt-8">
               <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed text-center">Define custom hours for separate departments to prevent false late-in flagging.</p>
            </div>
         </div>
      </div>

      {/* --- ADD SHIFT OVERLAY --- */}
      {isAdding && (
         <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-3xl flex items-center justify-center p-6 sm:p-10">
            <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white animate-in zoom-in duration-300">
               <div className="p-10 bg-slate-50 border-b border-border text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-white shadow-2xl shadow-blue-500/30">
                     <Clock className="w-10 h-10" />
                  </div>
                  <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Configure New Shift</h4>
                  <p className="text-[10px] font-black opacity-30 uppercase tracking-widest leading-relaxed">Defining automated arrival & exit conditions</p>
               </div>

               <div className="p-10 space-y-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Schedule Name</label>
                     <input 
                        type="text" 
                        placeholder="e.g. Senior Secondary Faculty"
                        className="w-full text-sm font-black italic text-slate-900 bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:italic placeholder:opacity-20"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clock In</label>
                        <input type="time" defaultValue="08:30" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">Clock Out</label>
                        <input type="time" defaultValue="16:30" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" />
                     </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-3xl flex items-center gap-4 text-blue-900 border border-blue-100">
                     <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shadow-blue-500/10">
                        <ShieldAlert className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Auto-Grace enabled</p>
                        <p className="text-[9px] font-medium opacity-60">Staff will be marked 'Late' after 15 minutes of delay.</p>
                     </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-50 bg-slate-50 flex gap-4">
                  <button 
                     onClick={() => setIsAdding(false)}
                     className="flex-1 py-5 bg-white border border-border rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
                  >
                     Cancel
                  </button>
                  <button 
                     onClick={handleCreate}
                     className="flex-1 py-5 bg-blue-600 text-white rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                     Deploy Schedule
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
