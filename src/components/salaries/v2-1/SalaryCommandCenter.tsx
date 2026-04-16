"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Briefcase, 
  Wallet, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  History,
  Zap,
  ChevronRight,
  Search,
  Download,
  ShieldCheck,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  ChevronDown,
  X,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTenant } from "@/context/tenant-context";
import { useTabs } from "@/context/tab-context";
import { 
  generatePayrollDraftAction, 
  finalizePayrollAction, 
  exportBankCSVAction,
  savePayrollDraftAction,
  getHistoricalPayrollRunsAction
} from "@/lib/actions/payroll-actions";

type ViewMode = "ACTIVE" | "HISTORY";

type ToastState = {
  type: "loading" | "success" | "error";
  message: string;
} | null;

export function SalaryCommandCenter() {
  const { branchId } = useTenant();
  const { openTab } = useTabs();
  const [view, setView] = useState<ViewMode>("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [run, setRun] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [historyRuns, setHistoryRuns] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Month/Year Selection (Default to current)
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // 1. 🏛️ LOAD ACTIVE RUN
  const loadActiveRun = async () => {
    setLoading(true);
    try {
      // For now, we use a standard 30-day divider as per Option 1
      const totalDays = new Date(year, month, 0).getDate();
      const res = await generatePayrollDraftAction(month, year, totalDays, branchId || "GLOBAL");
      if (res.success) {
        setRun(res.data);
      }
    } catch (e) {
      console.error("❌ [SalaryCommand] Load Error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "ACTIVE") {
      loadActiveRun();
    } else {
      loadHistory();
    }
  }, [view, month, year, branchId]);

  // 2. 🧬 DEDUCTION LOGIC PREVIEW (The 3-6 Rule)
  // Logic is handled in the action, but we show the impact here.

  // 3. 🏦 BANK EXPORT HANDLER
  const handleExport = async (format: "AXIS_INTERNAL" | "AXIS_EXTERNAL", runId?: string, mOverride?: number, yOverride?: number) => {
    const targetRunId = runId || run?.id;
    if (!targetRunId) return;
    
    setToast({ type: "loading", message: `Generating ${format.replace('_', ' ')} Template...` });
    try {
      const res = await exportBankCSVAction(targetRunId, format);
      if (res.success && res.csvData) {
        const blob = new Blob([res.csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const exportMonth = mOverride || month;
        const exportYear = yOverride || year;
        a.download = `PAYROLL_${months[exportMonth-1].toUpperCase()}_${exportYear}_${format}.csv`;
        a.click();
        setToast({ type: "success", message: "Export Successful. Check downloads." });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({ type: "error", message: res.error || "Execution failed. Check data." });
      }
    } catch (e: any) {
      setToast({ type: "error", message: e.message || "An unexpected error occurred." });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredSlips = useMemo(() => {
    if (!run?.slips) return [];
    return run.slips.filter((s: any) => 
      `${s.staff?.firstName} ${s.staff?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [run, searchQuery]);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-700">
      {/* 🏛️ HEADER & VIEW SWITCHER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Salary <span className="text-indigo-600 italic">Command Center.</span>
            </h2>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Institutional Remuneration & Disbursement Terminal</p>
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
          <button 
            onClick={() => setView("ACTIVE")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              view === "ACTIVE" ? "bg-white text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Clock className="w-4 h-4" /> Current Pulse
          </button>
          <button 
            onClick={() => setView("HISTORY")}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
              view === "HISTORY" ? "bg-white text-indigo-600 shadow-md" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <History className="w-4 h-4" /> Ledger History
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "ACTIVE" ? (
          <motion.div 
            key="active"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col gap-6"
          >
            {/* 🧬 STATS STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               {[
                 { label: "Active Personnel", value: run?.slips?.length || "0", sub: "Month Target", icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50/50" },
                 { label: "Total Gross", value: `₹${Math.round(run?.totalGross || 0).toLocaleString()}`, sub: "Aggregated Earnings", icon: Wallet, color: "text-indigo-500", bg: "bg-indigo-50/50" },
                 { label: "Total Net", value: `₹${Math.round(run?.totalNet || 0).toLocaleString()}`, sub: "Disbursement Target", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50/50" },
                 { label: "Status", value: run?.status || "NO DRAFT", sub: months[month-1], icon: Zap, color: "text-amber-500", bg: "bg-amber-50/50" }
               ].map((stat, i) => (
                 <div key={i} className={cn("p-5 rounded-3xl border border-slate-200/50 shadow-sm flex items-start gap-4", stat.bg)}>
                    <div className={cn("p-3 rounded-2xl bg-white shadow-sm flex-shrink-0", stat.color)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 mb-0.5">{stat.label}</p>
                      <p className="text-xl font-black text-slate-900 leading-none mb-1">{stat.value}</p>
                      <p className="text-[10px] font-bold text-slate-400">{stat.sub}</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* 🏛️ MAIN PIPELINE */}
            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-indigo-500/5 flex flex-col overflow-hidden">
               {/* Toolbar */}
               <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search personnel records..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent text-xs font-bold focus:outline-none w-full placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="p-1.5 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
                       <select 
                         value={month} 
                         onChange={(e) => setMonth(parseInt(e.target.value))}
                         className="bg-transparent text-[10px] font-black uppercase tracking-widest px-3 py-1.5 outline-none cursor-pointer hover:bg-white rounded-xl transition-all"
                       >
                         {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                       </select>
                       <select 
                         value={year} 
                         onChange={(e) => setYear(parseInt(e.target.value))}
                         className="bg-transparent text-[10px] font-black uppercase tracking-widest px-3 py-1.5 outline-none cursor-pointer hover:bg-white rounded-xl transition-all"
                       >
                         {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                       </select>
                    </div>

                    <button 
                      onClick={loadActiveRun}
                      className="p-3 bg-white border border-slate-200 rounded-2xl text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm group"
                    >
                      <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
               </div>

               {/* Grid */}
               <div className="flex-1 overflow-auto custom-scrollbar p-6">
                  {loading ? (
                    <div className="h-full flex items-center justify-center py-20">
                       <div className="flex flex-col items-center gap-4">
                          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 opacity-60">Synchronizing Ledger...</p>
                       </div>
                    </div>
                  ) : filteredSlips.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 py-20 grayscale opacity-40">
                       <AlertCircle className="w-12 h-12" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No matching records found for {months[month-1]}</p>
                    </div>
                  ) : (
                    <table className="w-full border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <th className="text-left px-6">Personnel</th>
                          <th className="text-left px-4">Role/Branch</th>
                          <th className="text-left px-4">MTD Attendance</th>
                          <th className="text-left px-4">Base Policy</th>
                          <th className="text-right px-6">Disbursement (Net)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSlips.map((slip: any) => (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={slip.id} 
                            className="group hover:bg-indigo-50/30 transition-all rounded-3xl"
                          >
                            <td className="px-6 py-4 bg-slate-50/30 group-hover:bg-transparent rounded-l-3xl border-y border-l border-slate-100/50">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-black text-xs text-slate-400 group-hover:from-indigo-100 group-hover:to-indigo-200 group-hover:text-indigo-500 transition-all">
                                     {slip.staff?.firstName[0]}{slip.staff?.lastName[0]}
                                  </div>
                                  <div>
                                     <p 
                                       onClick={() => openTab({ 
                                          id: `staff-profile-${slip.staff?.id}`, 
                                          title: `${slip.staff?.firstName} Profile`, 
                                          component: "Staff", 
                                          params: { staffId: slip.staff?.id, forceEdit: true } 
                                       })}
                                       className="text-xs font-black text-slate-900 cursor-pointer hover:underline hover:text-indigo-600 transition-all"
                                     >
                                       {slip.staff?.firstName} {slip.staff?.lastName}
                                     </p>
                                     <p 
                                       onClick={() => openTab({ 
                                          id: `staff-financials-${slip.staff?.id}`, 
                                          title: `${slip.staff?.firstName} Ledger`, 
                                          component: "Staff", 
                                          params: { staffId: slip.staff?.id, view: "financials" } 
                                       })}
                                       className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter cursor-pointer hover:text-indigo-600 hover:underline"
                                     >
                                       Code: {slip.staff?.staffCode || "G-001"}
                                     </p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 py-4 bg-slate-50/30 group-hover:bg-transparent border-y border-slate-100/50">
                               <div className="space-y-1">
                                  <p className="text-[10px] font-black text-slate-700">{slip.snapshot?.designation || "Faculty"}</p>
                                  <div className="flex items-center gap-1.5">
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{slip.branchId || "Main"}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 py-4 bg-slate-50/30 group-hover:bg-transparent border-y border-slate-100/50">
                               <div className="flex items-center gap-4">
                                  <div className="text-center">
                                     <p className="text-[10px] font-black text-slate-900">{slip.attendedDays}</p>
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">P</p>
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[10px] font-black text-rose-500">{slip.lwpDays}</p>
                                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">LWP</p>
                                  </div>
                                  <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                      <p className="text-[8px] font-black text-slate-400 block mb-0.5 uppercase tracking-tighter">Penalty Impact</p>
                                      <p className="text-[9px] font-black text-indigo-600 italic leading-none">{slip.snapshot?.deductions?.penaltyDays || 0}d Late</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-4 py-4 bg-slate-50/30 group-hover:bg-transparent border-y border-slate-100/50">
                               <p className="text-[10px] font-black text-slate-900 leading-none">₹{Math.round(slip.snapshot?.basic || 0).toLocaleString()}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Basic Base</p>
                            </td>
                            <td className="px-6 py-4 bg-slate-50/30 group-hover:bg-transparent border-y border-r border-slate-100/50 rounded-r-3xl text-right">
                               <div className="flex items-center justify-end gap-3">
                                  <div>
                                     <p className="text-sm font-black text-slate-900">₹{Math.round(slip.netSalary || 0).toLocaleString()}</p>
                                     <div className="flex items-center justify-end gap-1">
                                        <div className={cn("w-1 h-1 rounded-full", slip.status === "Approved" ? "bg-emerald-500" : "bg-amber-500")} />
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{slip.status}</p>
                                     </div>
                                  </div>
                                  <button 
                                     onClick={() => openTab({ 
                                        id: `staff-financials-${slip.staff?.id}`, 
                                        title: `${slip.staff?.firstName} Ledger`, 
                                        component: "Staff", 
                                        params: { staffId: slip.staff?.id, view: "financials" } 
                                     })}
                                     className="p-2 hover:bg-white rounded-xl text-slate-300 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200 shadow-sm"
                                  >
                                     <ChevronRight className="w-4 h-4" />
                                  </button>
                               </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  )}
               </div>

               {/* Action Footer */}
               <div className="p-8 border-t border-slate-100 bg-slate-900 text-white rounded-b-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/10 blur-3xl rounded-full" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                     <div className="p-4 bg-indigo-500/20 rounded-3xl border border-indigo-500/30">
                        <Lock className="w-6 h-6 text-indigo-400" />
                     </div>
                     <div>
                        <h4 className="text-lg font-black italic tracking-tight">Finalize & Seal Registry</h4>
                        <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest">Generates Journal Entry & Cryptographic Signatures</p>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 relative z-10">
                     <button 
                        disabled={isExporting}
                        onClick={() => handleExport("AXIS_INTERNAL")}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 transition-all border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                     >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> With In Bank
                     </button>
                     <button 
                        disabled={isExporting}
                        onClick={() => handleExport("AXIS_EXTERNAL")}
                        className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 transition-all border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                     >
                        <FileSpreadsheet className="w-4 h-4 text-blue-400" /> Out Of Bank
                     </button>

                    <button 
                      onClick={async () => {
                         if (!run) return;
                         setLoading(true);
                         const res = await finalizePayrollAction(run.id);
                         if (res.success) loadActiveRun();
                         setLoading(false);
                      }}
                      className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 transition-all text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/40"
                    >
                       <ShieldCheck className="w-4 h-4" /> Disburse Salaries
                    </button>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col gap-6"
          >
             {/* 🏛️ HISTORY VIEW */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingHistory ? (
                   <div className="col-span-full py-20 flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Historical Pulse...</p>
                   </div>
                ) : historyRuns.length === 0 ? (
                   <div className="col-span-full py-20 flex flex-col items-center gap-4 text-slate-300">
                      <History className="w-12 h-12 grayscale opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No historical ledger events found.</p>
                   </div>
                ) : historyRuns.map((h, i) => (
                  <div key={h.id} className="group bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
                     <div className="flex items-center justify-between mb-6">
                        <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                           <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" /> {h.status}
                           </div>
                           
                           {/* Separate History Export Buttons */}
                           <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => handleExport("AXIS_INTERNAL", h.id, h.month, h.year)}
                                className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl transition-all group/ex"
                                title="Export Internal (Within Axis)"
                              >
                                 <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover/ex:text-emerald-500" />
                              </button>
                              <button 
                                onClick={() => handleExport("AXIS_EXTERNAL", h.id, h.month, h.year)}
                                className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group/ex"
                                title="Export External (NEFT/IMPS)"
                              >
                                 <FileSpreadsheet className="w-4 h-4 text-slate-400 group-hover/ex:text-blue-500" />
                              </button>
                           </div>
                        </div>
                     </div>
                     <h5 className="text-xl font-black text-slate-900 tracking-tight">{months[h.month-1]} {h.year}</h5>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-4">Disbursement Target: ₹{Math.round(h.totalNet).toLocaleString()}</p>
                     
                     <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Audited for {h.staffCount} Staff</p>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-all cursor-pointer" />
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 TOAST NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-10 right-10 z-[100] min-w-[320px]"
          >
            <div className={cn(
              "p-5 rounded-[2rem] border shadow-2xl backdrop-blur-md flex items-start gap-4",
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-50" :
              toast.type === "error" ? "bg-rose-950/90 border-rose-500/30 text-rose-50" :
              "bg-slate-900/95 border-slate-700/50 text-white"
            )}>
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "loading" ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" /> :
                 toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                 <AlertCircle className="w-5 h-5 text-rose-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">System Notification</p>
                <p className="text-sm font-bold leading-tight">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-all">
                <X className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
