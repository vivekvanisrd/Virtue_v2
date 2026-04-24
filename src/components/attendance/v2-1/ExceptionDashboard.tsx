"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  ArrowRight,
  Filter,
  CheckCircle,
  FileBarChart
} from "lucide-react";
import { getAttendanceExceptionsAction } from "@/lib/actions/attendance-v2-actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function ExceptionDashboard() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const fetchExceptions = async () => {
    setLoading(true);
    try {
        const res = await getAttendanceExceptionsAction();
        if (res.success) {
            setExceptions(res.data);
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, []);

  const filtered = exceptions.filter(ex => {
    const matchesSearch = `${ex.staff.firstName} ${ex.staff.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || ex.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h3 className="text-2xl font-black italic tracking-tighter uppercase">Exception Audit Trail</h3>
           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Identifying Policy Violations & Non-Compliance</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-border shadow-sm flex-1 md:flex-none focus-within:ring-2 focus-within:ring-rose-500/10 transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="SEARCH PERSONNEL..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-[10px] font-black outline-none w-full md:w-48 placeholder:text-slate-200"
                />
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {["ALL", "Late", "Early-Out"].map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                            filterType === t ? "bg-white text-rose-600 shadow-sm" : "text-slate-400"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-rose-900 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Total Violations</p>
               <h3 className="text-5xl font-black italic tracking-tighter">{exceptions.length}</h3>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <AlertTriangle className="w-24 h-24" />
            </div>
         </div>

         <div className="p-8 bg-white border border-border rounded-[2.5rem] flex flex-col justify-between">
            <p className="text-[10px] font-black text-rose-600 opacity-40 uppercase tracking-widest mb-1">Late Arrivals</p>
            <h3 className="text-5xl font-black text-slate-900">{exceptions.filter(e => e.type === "Late").length}</h3>
            <span className="text-[10px] font-medium opacity-40 mt-6 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Exceeded Grace Period
            </span>
         </div>

         <div className="p-8 bg-white border border-border rounded-[2.5rem] flex flex-col justify-between">
            <p className="text-[10px] font-black text-amber-600 opacity-40 uppercase tracking-widest mb-1">Early Departures</p>
            <h3 className="text-5xl font-black text-slate-900">{exceptions.filter(e => e.type === "Early-Out").length}</h3>
            <span className="text-[10px] font-medium opacity-40 mt-6 flex items-center gap-2">
                <ArrowRight className="w-3 h-3" /> Short of Half-Day Target
            </span>
         </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl relative">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                   <tr className="bg-slate-50 border-b border-border text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-10 py-5">Personnel</th>
                      <th className="px-10 py-5">Violation Type</th>
                      <th className="px-10 py-5">Logged At</th>
                      <th className="px-10 py-5">System Evidence</th>
                      <th className="px-10 py-5 text-right">Review</th>
                   </tr>
                </thead>
                <tbody>
                   {loading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                           <tr key={i} className="animate-pulse border-b border-slate-50">
                               <td colSpan={5} className="px-10 py-8"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                           </tr>
                       ))
                   ) : filtered.length === 0 ? (
                       <tr>
                           <td colSpan={5} className="px-10 py-24 text-center">
                               <FileBarChart className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Clean Audit - No Exceptions Detected</p>
                           </td>
                       </tr>
                   ) : (
                       filtered.map((ex) => (
                           <tr key={ex.id} className="group border-b border-slate-50 hover:bg-rose-50/30 transition-colors">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-[10px] font-black">
                                       {ex.staff.firstName[0]}{ex.staff.lastName[0]}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 uppercase italic">{ex.staff.firstName} {ex.staff.lastName}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ex.staff.staffCode}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <span className={cn(
                                     "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                     ex.type === "Late" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                 )}>
                                     {ex.type}
                                 </span>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-2 text-slate-500">
                                    <Calendar className="w-3.5 h-3.5 opacity-40" />
                                    <span className="text-xs font-bold">{format(new Date(ex.date), "PP")}</span>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[9px] text-slate-500 max-w-[200px] truncate">
                                     {JSON.stringify(ex.meta)}
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90">
                                    <ArrowRight className="w-4 h-4" />
                                 </button>
                              </td>
                           </tr>
                       ))
                   )}
                </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
