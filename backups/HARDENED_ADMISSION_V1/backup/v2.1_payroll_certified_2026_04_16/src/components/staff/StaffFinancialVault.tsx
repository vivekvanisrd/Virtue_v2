"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  History, 
  PiggyBank, 
  TrendingUp, 
  Calendar, 
  ArrowLeft,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStaffFinancialSummaryAction } from "@/lib/actions/staff-actions";

interface StaffFinancialVaultProps {
  staffId: string;
  onBack?: () => void;
}

export function StaffFinancialVault({ staffId, onBack }: StaffFinancialVaultProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"salary" | "loans" | "attendance">("salary");

  useEffect(() => {
    fetchVaultData();
  }, [staffId]);

  const fetchVaultData = async () => {
    if (!staffId) {
      setError("NO_STAFF_ID_PROVIDED");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getStaffFinancialSummaryAction(staffId);
    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error || "UNKNOWN_ERROR");
    }
    setLoading(false);
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 animate-pulse">Decrypting Financial Vault...</p>
    </div>
  );

  if (error || !data) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-rose-500 py-20">
      <AlertCircle className="w-10 h-10" />
      <p className="text-xs font-black uppercase tracking-widest">Synchronization Failed</p>
      <div className="px-6 py-2 bg-rose-50 border border-rose-100 rounded-xl">
         <p className="text-[10px] font-black uppercase tracking-tighter text-rose-600">{error || "No Data Received"}</p>
      </div>
      <button 
        onClick={fetchVaultData}
        className="mt-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg"
      >
        Retry Synchronization
      </button>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 max-w-6xl mx-auto">
      {/* ─── Header & Metadata ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
             onClick={onBack}
             className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-all group shadow-sm"
          >
             <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <h2 className="text-3xl font-black tracking-tighter text-slate-900">{data.staff.firstName} {data.staff.lastName}</h2>
               <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">{data.staff.role}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{data.staff.staffCode} // Personnel Ledger Hub</p>
          </div>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
           {(["salary", "loans", "attendance"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab 
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5" 
                  : "text-slate-400 hover:text-slate-600"
                )}
              >
                {tab}
              </button>
           ))}
        </div>
      </div>

      {/* ─── Core Metrics Pulse ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Cumulative Earnings</p>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
               </div>
               <h3 className="text-4xl font-black tracking-tighter italic">{formatINR(data.metrics.totalEarnings)}</h3>
               <p className="text-[9px] font-medium opacity-40 mt-2">Total Net Salary disbursed via Virtue Ledger</p>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group">
            <div className="flex items-center justify-between mb-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Outstanding Advance</p>
               <PiggyBank className={cn("w-5 h-5", data.metrics.activeAdvance > 0 ? "text-rose-500" : "text-slate-300")} />
            </div>
            <h3 className={cn("text-4xl font-black tracking-tighter", data.metrics.activeAdvance > 0 ? "text-rose-600" : "text-slate-900")}>
               {formatINR(data.metrics.activeAdvance)}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{data.advances.filter((a:any) => a.status === "Active").length} Active Loan(s)</p>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group">
            <div className="flex items-center justify-between mb-6">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance Pulse</p>
               <Timer className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-4xl font-black tracking-tighter text-slate-900">{data.metrics.attendanceRate}%</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Last 30-Day performance index</p>
         </div>
      </div>

      {/* ─── Ledger Content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
           transition={{ duration: 0.3 }}
           className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-100/50"
        >
           {activeTab === "salary" && (
              <div className="p-0">
                 <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-lg font-black tracking-tight italic uppercase">Salary Disbursement Ledger</h4>
                    <History className="w-5 h-5 text-slate-300" />
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                             <th className="px-10 py-5">Month/Year</th>
                             <th className="px-10 py-5">Status</th>
                             <th className="px-10 py-5">Calculation Basis</th>
                             <th className="px-10 py-5 text-right">Net Disbursement</th>
                             <th className="px-10 py-5 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {data.slips.map((slip: any) => (
                             <tr key={slip.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-10 py-6">
                                   <div className="flex items-center gap-3">
                                      <Calendar className="w-4 h-4 text-slate-300" />
                                      <p className="font-black text-slate-900">{new Date(0, slip.month-1).toLocaleString('default', { month: 'long' })} {slip.year}</p>
                                   </div>
                                </td>
                                <td className="px-10 py-6">
                                   <span className={cn(
                                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                     slip.status === "Paid" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-amber-50 border-amber-100 text-amber-600"
                                   )}>
                                      {slip.status}
                                   </span>
                                </td>
                                <td className="px-10 py-6">
                                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{slip.attendedDays}P / {slip.lwpDays} LWP</p>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <p className="text-base font-black text-slate-900 tracking-tighter italic">{formatINR(Number(slip.netSalary))}</p>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <button className="p-2 border border-slate-200 rounded-xl hover:bg-white hover:text-indigo-600 transition-all shadow-sm">
                                      <Download className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {data.slips.length === 0 && (
                            <tr>
                               <td colSpan={5} className="p-20 text-center opacity-30 text-xs font-black uppercase tracking-widest">No payroll records detected</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeTab === "loans" && (
              <div className="p-0">
                 <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-lg font-black tracking-tight italic uppercase">Advance & EMI Ledger</h4>
                    <PiggyBank className="w-5 h-5 text-slate-300" />
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                             <th className="px-10 py-5">Disbursement Date</th>
                             <th className="px-10 py-5">Sanctioned Amt</th>
                             <th className="px-10 py-5">EMI Rate</th>
                             <th className="px-10 py-5">Progress</th>
                             <th className="px-10 py-5 text-right">Remaining Balance</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {data.advances.map((adv: any) => (
                             <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-10 py-6 font-bold text-slate-600">
                                   {new Date(adv.disbursedDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-10 py-6 font-black text-slate-900">{formatINR(Number(adv.amount))}</td>
                                <td className="px-10 py-6">
                                   <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 font-black uppercase text-[9px] rounded-lg tracking-widest leading-none">
                                      {formatINR(Number(adv.installment))} / mo
                                   </span>
                                </td>
                                <td className="px-10 py-6">
                                   <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden relative">
                                      <motion.div 
                                         initial={{ width: 0 }}
                                         animate={{ width: `${Math.round(((Number(adv.amount) - Number(adv.balance)) / Number(adv.amount)) * 100)}%` }}
                                         className="absolute inset-y-0 left-0 bg-indigo-500" 
                                      />
                                   </div>
                                </td>
                                <td className="px-10 py-6 text-right">
                                   <p className={cn("text-lg font-black tracking-tighter italic", adv.status === "Active" ? "text-indigo-600" : "text-slate-300")}>
                                      {formatINR(Number(adv.balance))}
                                   </p>
                                </td>
                             </tr>
                          ))}
                          {data.advances.length === 0 && (
                            <tr>
                               <td colSpan={5} className="p-20 text-center opacity-30 text-xs font-black uppercase tracking-widest">No advance ledger records</td>
                            </tr>
                          )}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeTab === "attendance" && (
              <div className="p-10">
                 <div className="flex items-center justify-between mb-10">
                    <h4 className="text-lg font-black tracking-tight italic uppercase">Last 180 Days Performance Pulse</h4>
                    <Timer className="w-5 h-5 text-slate-300" />
                 </div>
                 
                 <div className="grid grid-cols-7 gap-1">
                    {/* Visualizing 6 months of attendance as a heatmap grid */}
                    {Array.from({ length: 180 }).map((_, i) => {
                       const d = new Date();
                       d.setDate(d.getDate() - (179 - i));
                       const record = data.attendanceHistory.find((a: any) => new Date(a.date).toDateString() === d.toDateString());
                       
                       return (
                          <div 
                             key={i} 
                             className={cn(
                               "aspect-square rounded shadow-sm transition-all relative group",
                               record?.status === "Present" ? "bg-emerald-500 shadow-emerald-500/20" :
                               record?.status === "Absent" ? "bg-rose-500 shadow-rose-500/20" :
                               record?.status === "Late" ? "bg-amber-500 shadow-amber-500/20" :
                               "bg-slate-100"
                             )}
                          >
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                {d.toLocaleDateString()} {record?.status || "Unmarked"}
                             </div>
                          </div>
                       );
                    })}
                 </div>

                 <div className="mt-10 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-emerald-500" />
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-rose-500" />
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-amber-500" />
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Late</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded bg-slate-100" />
                       <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Offline</span>
                    </div>
                 </div>
              </div>
           )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
