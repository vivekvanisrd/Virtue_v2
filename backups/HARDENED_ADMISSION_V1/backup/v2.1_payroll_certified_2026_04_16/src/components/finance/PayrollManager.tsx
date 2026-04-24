"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ChevronRight,
  Download,
  CreditCard,
  Zap,
  ShieldCheck,
  History
} from "lucide-react";
import { 
  generatePayrollDraft, 
  finalizePayrollRun, 
  recordSalaryDisbursement 
} from "@/lib/actions/salary-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PayrollManager
 * 
 * Professional HR & Finance terminal for monthly salary management.
 */
export function PayrollManager() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentRun, setCurrentRun] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleGenerateDraft = async () => {
    setLoading(true);
    setError(null);
    const result = await generatePayrollDraft({ month: selectedMonth, year: selectedYear });
    if (result.success) {
      setCurrentRun(result.data);
    } else {
      setError(result.error || "Failed to generate payroll draft.");
    }
    setLoading(false);
  };

  const handleFinalize = async () => {
    if (!currentRun) return;
    setLoading(true);
    const result = await finalizePayrollRun(currentRun.id);
    if (result.success) {
      // Refresh current run status locally
      setCurrentRun({ ...currentRun, status: 'Approved' });
    } else {
      setError(result.error || "Failed to finalize payroll.");
    }
    setLoading(false);
  };

  const handleDisbursement = async () => {
    if (!currentRun) return;
    setLoading(true);
    const result = await recordSalaryDisbursement(currentRun.id, "Bank Transfer", "BATCH-" + currentRun.id.slice(0,8));
    if (result.success) {
      setCurrentRun({ ...currentRun, status: 'Paid' });
    } else {
      setError(result.error || "Failed to disburse salaries.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 🔮 Top Header: Period Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
            <Calendar className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900">Payroll Terminal</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60 mt-1">Institutional Disbursement Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 bg-slate-100/50 rounded-2xl border border-slate-200">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-transparent border-none font-black text-xs uppercase tracking-widest px-4 focus:outline-none"
          >
            {months.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <div className="w-px h-6 bg-slate-300" />
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-transparent border-none font-black text-xs uppercase tracking-widest px-4 focus:outline-none"
          >
             <option value={2026}>2026</option>
             <option value={2025}>2025</option>
             <option value={2024}>2024</option>
          </select>
          <button 
            onClick={handleGenerateDraft}
            disabled={loading}
            className="ml-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {currentRun ? 'REGENERATE DRAFT' : 'GENERATE DRAFT'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentRun ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* 📊 KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Total Net Payable", value: formatCurrency(currentRun.totalNet), icon: CreditCard, color: "text-indigo-600", bg: "bg-indigo-50" },
                { label: "Staff Count", value: currentRun.slips?.length || 0, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Run Status", value: currentRun.status.toUpperCase(), icon: ShieldCheck, color: currentRun.status === 'Paid' ? "text-blue-600" : "text-amber-600", bg: currentRun.status === 'Paid' ? "bg-blue-50" : "bg-amber-50" },
              ].map((kpi, i) => (
                <div key={i} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", kpi.bg)}>
                    <kpi.icon className={cn("w-6 h-6", kpi.color)} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tight text-slate-900">{kpi.value}</h4>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{kpi.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 📋 Staff Breakdown Table */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900">Monthly Compensation Ledger</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Period: {months[selectedMonth-1]} {selectedYear}</p>
                </div>
                <div className="flex items-center gap-3">
                   <button className="p-3 hover:bg-slate-50 text-slate-400 rounded-xl transition-all border border-slate-100">
                      <Download className="w-5 h-5" />
                   </button>
                   {currentRun.status === 'Draft' && (
                     <button 
                        onClick={handleFinalize}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-3"
                     >
                        Finalize Roll <ArrowRight className="w-4 h-4" />
                     </button>
                   )}
                   {currentRun.status === 'Approved' && (
                     <button 
                        onClick={handleDisbursement}
                        className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-3 shadow-xl shadow-emerald-600/20"
                     >
                        Confirm Disbursement <CreditCard className="w-4 h-4" />
                     </button>
                   )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Base Salary</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Allowances</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Deductions</th>
                      <th className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRun.slips?.map((slip: any) => (
                      <tr key={slip.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-[10px] group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              {slip.staff?.firstName[0]}{slip.staff?.lastName[0]}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 leading-none mb-1">{slip.staff?.firstName} {slip.staff?.lastName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">#{slip.staff?.staffCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-sm font-bold text-slate-800">{formatCurrency(slip.baseAmount)}</p>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-wrap gap-1.5">
                              {Object.entries(slip.allowances || {}).map(([key, val]) => (
                                Number(val) > 0 && <span key={key} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-tighter">+{key}: {formatCurrency(Number(val))}</span>
                              ))}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(slip.deductions || {}).map(([key, val]) => (
                                Number(val) > 0 && <span key={key} className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[8px] font-black uppercase tracking-tighter">-{key}: {formatCurrency(Number(val))}</span>
                              ))}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <p className="text-base font-black text-slate-900 tracking-tight">{formatCurrency(slip.netSalary)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[3rem] border border-dashed border-slate-200 p-12 text-center"
          >
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                <History className="w-10 h-10" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">No Active Run Prepared</h3>
             <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-medium">Select a period and click 'Generate Draft' to prepare the institutional payroll ledger.</p>
             <button 
                onClick={handleGenerateDraft}
                className="px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-3"
             >
                Prepare {months[selectedMonth-1]} Ledger <ArrowRight className="w-4 h-4" />
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-center gap-4 text-rose-700 animate-in slide-in-from-bottom-4">
          <AlertCircle className="w-6 h-6" />
          <p className="text-sm font-black uppercase tracking-tight">{error}</p>
        </div>
      )}
    </div>
  );
}
