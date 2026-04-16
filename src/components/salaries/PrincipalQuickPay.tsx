"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Zap, 
  CheckCircle2, 
  History, 
  Save, 
  AlertCircle,
  Clock,
  User,
  Building2,
  CalendarDays,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTenant } from "@/context/tenant-context";
import { 
  generatePayrollDraftAction, 
  savePayrollDraftAction,
  exportBankCSVAction
} from "@/lib/actions/payroll-actions";
import { FileSpreadsheet, Loader2 } from "lucide-react";

export function PrincipalQuickPay() {
  const { branchId } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [run, setRun] = useState<any>(null);
  const [editedSlips, setEditedSlips] = useState<Record<string, { attendedDays: number, totalWorkingDays: number }>>({});
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    loadData();
  }, [month, year, branchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const daysInMonth = new Date(year, month, 0).getDate();
      const res = await generatePayrollDraftAction(month, year, daysInMonth, branchId || "GLOBAL");
      if (res.success) {
        setRun(res.data);
        // Reset edits
        setEditedSlips({});
      }
    } catch (e) {
      console.error("❌ [QuickPay] Load Error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (slipId: string, field: "attendedDays" | "totalWorkingDays", val: string) => {
    const num = parseFloat(val) || 0;
    const slip = run.slips.find((s: any) => s.id === slipId);
    if (!slip) return;

    setEditedSlips(prev => ({
      ...prev,
      [slipId]: {
        attendedDays: field === "attendedDays" ? num : (prev[slipId]?.attendedDays ?? slip.attendedDays),
        totalWorkingDays: field === "totalWorkingDays" ? num : (prev[slipId]?.totalWorkingDays ?? slip.totalWorkingDays)
      }
    }));
  };

  const calculatePayout = (slip: any) => {
    const edit = editedSlips[slip.id];
    const attended = edit ? edit.attendedDays : slip.attendedDays;
    const working = edit ? edit.totalWorkingDays : (slip.totalWorkingDays || 30);
    // 🏛️ SOVEREIGN FALLBACK: Payout calculation must use live data if snapshot is empty
    const actualSalary = Number(slip.snapshot?.basic || slip.staff?.professional?.basicSalary || 0);
    
    if (working === 0) return 0;
    return Math.round((actualSalary / working) * attended);
  };

  const handleSave = async () => {
    if (!run) return;
    setSaving(true);
    
    // Build update payload
    const updates = run.slips.map((slip: any) => {
      const edit = editedSlips[slip.id];
      const attended = edit ? edit.attendedDays : slip.attendedDays;
      const working = edit ? edit.totalWorkingDays : (slip.totalWorkingDays || 30);
      const payout = calculatePayout(slip);

      return {
        id: slip.id,
        attendedDays: attended,
        totalWorkingDays: working,
        // We simplified: Gross = Net for this view
        grossSalary: payout,
        netSalary: payout,
        payableDays: attended,
        deductions: slip.deductions // Keep existing if any
      };
    });

    const res = await savePayrollDraftAction(run.id, updates);
    if (res.success) {
      alert("✅ Quick-Pay Sheet Saved Successfully.");
      loadData();
    } else {
      alert("❌ Save Failed: " + res.error);
    }
    setSaving(false);
  };

  const handleExport = async (format: "AXIS_INTERNAL" | "AXIS_EXTERNAL") => {
    if (!run?.id) return;
    
    setSaving(true); // Reusing saving state for visual lock
    try {
      const res = await exportBankCSVAction(run.id, format);
      if (res.success && res.csvData) {
        const blob = new Blob([res.csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `PAYROLL_${months[month-1].toUpperCase()}_${year}_${format}.csv`;
        a.click();
        alert("✅ Export Successful.");
      } else {
        alert("❌ Export failed: " + res.error);
      }
    } catch (e: any) {
      alert("❌ Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 py-20 bg-slate-50/50">
       <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-900 opacity-40 animate-pulse">Hydrating Quick-Pay Sheet...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 p-2">
      {/* 🏛️ HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-50/50 blur-3xl rounded-full translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
             <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100">
                <Zap className="w-6 h-6 text-white" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic underline decoration-indigo-500/20 underline-offset-8">Principal Quick-Pay</h2>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-4">Automated Penalty Logic (3-6 Rule) Applied by Default</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 relative z-10">
           <select 
             value={month} 
             onChange={(e) => setMonth(parseInt(e.target.value))}
             className="bg-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 outline-none shadow-sm cursor-pointer"
           >
             {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
           </select>
           <select 
             value={year} 
             onChange={(e) => setYear(parseInt(e.target.value))}
             className="bg-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 outline-none shadow-sm cursor-pointer"
           >
             {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <button onClick={loadData} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-xl">
              <History className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* 🏛️ SIMPLE WORK-TO-PAY TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <th className="px-10 py-6">Staff Member</th>
                    <th className="px-8 py-6">Working Days</th>
                    <th className="px-8 py-6 text-indigo-600">Days Present</th>
                    <th className="px-8 py-6">Actual Salary</th>
                    <th className="px-10 py-6 text-right">Amount to Pay</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {run?.slips.map((slip: any) => {
                    const working = editedSlips[slip.id]?.totalWorkingDays ?? (slip.totalWorkingDays || 30);
                    const present = editedSlips[slip.id]?.attendedDays ?? slip.attendedDays;
                    const payout = calculatePayout(slip);
                    // 🏛️ SOVEREIGN FALLBACK: Use snapshot basic, fallback to LIVE basic if 0
                    const masterBasic = Number(slip.snapshot?.basic || slip.staff?.professional?.basicSalary || 0);

                    return (
                       <tr key={slip.id} className="group hover:bg-slate-50/30 transition-all">
                          <td className="px-10 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400 uppercase group-hover:bg-white group-hover:text-indigo-500 transition-all">
                                   {slip.staff?.firstName[0]}{slip.staff?.lastName[0]}
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-sm font-black text-slate-900 tracking-tight">{slip.staff?.firstName} {slip.staff?.lastName}</p>
                                   <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">{slip.staff?.staffCode}</p>
                                </div>
                             </div>
                          </td>

                          <td className="px-8 py-6">
                             <input 
                               type="number" 
                               value={working}
                               onChange={(e) => handleUpdate(slip.id, "totalWorkingDays", e.target.value)}
                               className="w-20 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                             />
                          </td>

                          <td className="px-8 py-6">
                             <div className="relative group/input">
                                <input 
                                  type="number" 
                                  step="0.5"
                                  value={present}
                                  onChange={(e) => handleUpdate(slip.id, "attendedDays", e.target.value)}
                                  className="w-24 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-black text-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none shadow-sm"
                                />
                                {slip.snapshot?.deductions?.penaltyDays > 0 && (
                                   <div className="absolute left-0 top-full mt-2 w-48 p-3 bg-slate-900 text-white rounded-2xl text-[9px] font-bold opacity-0 group-hover/input:opacity-100 transition-all z-50 shadow-2xl pointer-events-none">
                                      <Info className="w-3 h-3 text-indigo-400 mb-2" />
                                      Auto-Penalized: -{slip.snapshot.deductions.penaltyDays} day for late arrivals.
                                   </div>
                                )}
                             </div>
                          </td>

                          <td className="px-8 py-6">
                             <p className="text-sm font-black text-slate-400 tracking-tighter">₹{masterBasic.toLocaleString()}</p>
                             <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest mt-0.5">Fixed Registry</p>
                          </td>

                          <td className="px-10 py-6 text-right">
                             <p className="text-xl font-black text-slate-900 tracking-tighter italic">₹{payout.toLocaleString()}</p>
                             <div className="flex items-center justify-end gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.1em]">Ready for Pay</p>
                             </div>
                          </td>
                       </tr>
                    );
                 })}

                 {run?.slips.length === 0 && (
                    <tr>
                       <td colSpan={5} className="p-32 text-center grayscale opacity-30">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No matching draft found for this period.</p>
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
        
        {/* ─── ACTION STRIP ─── */}
        <div className="p-10 bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-800 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/10 blur-3xl rounded-full" />
           <div className="flex items-start gap-5 relative z-10">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                 <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Institutional Protection</h4>
                 <p className="text-[10px] font-medium text-white/40 max-w-sm leading-relaxed tracking-wide">
                    The Principal's override directly updates the monthly disbursement ledger. Values are rounded to the nearest integer for bank compliance.
                 </p>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-4 relative z-10">
              <button 
                 disabled={saving || !run}
                 onClick={() => handleExport("AXIS_INTERNAL")}
                 className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 text-white shadow-inner"
              >
                 <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 
                 <span className="text-white">In Bank</span>
              </button>
              <button 
                 disabled={saving || !run}
                 onClick={() => handleExport("AXIS_EXTERNAL")}
                 className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-[2rem] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 text-white shadow-inner"
              >
                 <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                 <span className="text-white">Out Of Bank</span>
              </button>

              <button 
                onClick={handleSave}
                disabled={saving || !run}
                className="relative z-10 flex items-center gap-3 px-10 py-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/40 transition-all hover:scale-105"
              >
                 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 Save & Update Monthly Draft
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
