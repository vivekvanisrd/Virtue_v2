"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Clock, 
  CheckCircle2, 
  RefreshCcw,
  ShieldCheck,
  ChevronDown,
  UserCheck
} from "lucide-react";
import { 
    getStaffForAssignmentAction, 
    getAttendancePoliciesAction,
    assignStaffShiftAction 
} from "@/lib/actions/attendance-v2-actions";
import { cn } from "@/lib/utils";

export function PersonnelAssignment() {
  const [staff, setStaff] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [staffRes, policyRes] = await Promise.all([
            getStaffForAssignmentAction(),
            getAttendancePoliciesAction()
        ]);
        if (staffRes.success) setStaff(staffRes.data);
        if (policyRes.success) setPolicies(policyRes.data);
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (staffId: string, policyId: string) => {
    setUpdatingId(staffId);
    try {
        const res = await assignStaffShiftAction(staffId, policyId === "DEFAULT" ? null : policyId);
        if (res.success) {
            // Optimistic update
            setStaff(prev => prev.map(s => s.id === staffId ? { ...s, attendancePolicyId: policyId === "DEFAULT" ? null : policyId, attendancePolicy: policyId === "DEFAULT" ? null : policies.find(p => p.id === policyId) } : s));
        } else {
            alert(res.error || "Assignment failed.");
        }
    } catch (err) {
        alert("Action rejected by server.");
    } finally {
        setUpdatingId(null);
    }
  };

  const filteredStaff = staff.filter(s => 
    `${s.firstName} ${s.lastName} ${s.staffCode}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <h3 className="text-2xl font-black italic tracking-tighter uppercase">Personnel Logic Hub</h3>
           <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Assigning specific timing policies to branch personnel</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-border shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
           <Search className="w-4 h-4 text-slate-400" />
           <input 
              type="text" 
              placeholder="SEARCH STAFF..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[10px] font-black outline-none w-full md:w-64 placeholder:text-slate-200"
           />
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                   <tr className="bg-slate-50 border-b border-border text-[9px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-10 py-5">Staff Member</th>
                      <th className="px-10 py-5">Personnel ID</th>
                      <th className="px-10 py-5">Active Policy (Shift)</th>
                      <th className="px-10 py-5 text-right">Actions</th>
                   </tr>
                </thead>
                <tbody>
                   {loading ? (
                       Array.from({ length: 5 }).map((_, i) => (
                           <tr key={i} className="animate-pulse border-b border-slate-50">
                               <td className="px-10 py-6"><div className="h-4 bg-slate-100 rounded w-48" /></td>
                               <td className="px-10 py-6"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                               <td className="px-10 py-6"><div className="h-4 bg-slate-100 rounded w-40" /></td>
                               <td className="px-10 py-6"><div className="h-8 bg-slate-100 rounded ml-auto w-32" /></td>
                           </tr>
                       ))
                   ) : filteredStaff.length === 0 ? (
                       <tr>
                           <td colSpan={4} className="px-10 py-20 text-center text-slate-300">
                               <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                               <p className="text-[10px] font-black uppercase tracking-widest">No Matching Personnel Found</p>
                           </td>
                       </tr>
                   ) : (
                       filteredStaff.map((s) => (
                           <tr key={s.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-black">
                                       {s.firstName[0]}{s.lastName[0]}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-slate-900 uppercase italic">{s.firstName} {s.lastName}</p>
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Department Verified</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-6">
                                 <span className="text-[10px] font-mono font-black text-slate-400">{s.staffCode}</span>
                              </td>
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full animate-pulse",
                                        s.attendancePolicyId ? "bg-blue-500" : "bg-emerald-500"
                                    )} />
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        s.attendancePolicyId ? "text-blue-600" : "text-emerald-600"
                                    )}>
                                       {s.attendancePolicy?.name || "System Default"}
                                    </span>
                                 </div>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <div className="flex justify-end items-center gap-2">
                                    <div className="relative group/select">
                                       <select 
                                          disabled={updatingId === s.id}
                                          value={s.attendancePolicyId || "DEFAULT"}
                                          onChange={(e) => handleAssign(s.id, e.target.value)}
                                          className="appearance-none bg-white border border-slate-200 px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest pr-10 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all cursor-pointer disabled:opacity-50"
                                       >
                                          <option value="DEFAULT">Branch Default</option>
                                          {policies.filter(p => p.name !== "Default").map(p => (
                                              <option key={p.id} value={p.id}>{p.name}</option>
                                          ))}
                                       </select>
                                       <ChevronDown className="w-3 h-3 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {updatingId === s.id && (
                                        <RefreshCcw className="w-4 h-4 animate-spin text-blue-600" />
                                    )}
                                 </div>
                              </td>
                           </tr>
                       ))
                   )}
                </tbody>
            </table>
         </div>
      </div>

      <div className="p-10 bg-slate-900 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
         <div className="relative z-10">
            <h4 className="text-xl font-black italic tracking-tighter uppercase mb-2">Automated Policy Enforcement</h4>
            <p className="text-[10px] font-medium opacity-50 uppercase tracking-widest max-w-md">Staff assigned to custom shifts will be evaluated against their specific grace periods and half-day thresholds during the Daily Pulse.</p>
         </div>
         <div className="flex gap-4 relative z-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
               <ShieldCheck className="w-6 h-6 text-emerald-500" />
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Sovereign Secured</p>
                  <p className="text-[9px] opacity-40">Persistence Layer Verified</p>
               </div>
            </div>
         </div>
         <div className="absolute top-0 right-0 p-10 opacity-5">
            <UserCheck className="w-40 h-40 rotate-12" />
         </div>
      </div>
    </div>
  );
}
