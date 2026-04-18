"use client";

import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  TrendingDown,
  RefreshCcw,
  Zap,
  ShieldCheck,
  AlertTriangle,
  History,
  FileText,
  Download,
  Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  generatePayrollDraftAction, 
  finalizePayrollAction,
  savePayrollDraftAction,
  syncPayrollStaffAction
} from "@/lib/actions/payroll-actions";
import { PayslipGenerator } from "../salaries/PayslipGenerator";

export function PayrollManager() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [disbursed, setDisbursed] = useState(false);
  const [skipStatutory, setSkipStatutory] = useState(false);
  const [totalWorkingDays, setTotalWorkingDays] = useState(30);
  
  // Payslip State
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    // Note: branchId is handled by backbone identity if passed as "GLOBAL" or active branch
    const result = await generatePayrollDraftAction(month, year, totalWorkingDays, "GLOBAL", skipStatutory);
    if (result.success) {
      setPayroll(result.data);
    } else {
      console.error(result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year, skipStatutory]);

  const handleDisburse = async () => {
    if (!payroll) return;
    if (!window.confirm(`Critical Confirmation: Are you sure you want to disburse a total net of ${formatINR(payroll?.totalNet || 0)}? This will post Journal Entries and update your Ledger.`)) return;
    
    setDisbursing(true);
    const result = await finalizePayrollAction(payroll.id);
    if (result.success) {
      setDisbursed(true);
      alert("Payroll Disbursed Successfully! Financial records have been updated.");
    } else {
      alert("Error: " + result.error);
    }
    setDisbursing(false);
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const monthName = new Date(2000, month - 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* ─── Global Selection ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-200 group-hover:rotate-6 transition-transform">
              <Wallet className="w-8 h-8" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-foreground tracking-tighter underline decoration-blue-500/20 underline-offset-8">Payroll Command Center</h2>
              <div className="flex items-center gap-4 mt-3">
                 <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Automated Attendance-to-Payout Sync</p>
                 <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-border">
                    <input 
                      type="checkbox" 
                      id="skipStat"
                      checked={skipStatutory}
                      onChange={(e) => setSkipStatutory(e.target.checked)}
                      className="w-3 h-3 accent-blue-600"
                    />
                    <label htmlFor="skipStat" className="text-[9px] font-black uppercase text-blue-600 tracking-wider">Skip PF/ESI Calc</label>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-border">
           <div className="flex flex-col gap-1 px-3 border-r border-border">
              <label className="text-[8px] font-black opacity-40 uppercase">Working Days</label>
              <input 
                type="number"
                value={totalWorkingDays}
                onChange={(e) => setTotalWorkingDays(Number(e.target.value))}
                className="w-12 bg-transparent text-xs font-black outline-none"
              />
           </div>
           <select 
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest outline-none border border-border/50"
           >
              {Array.from({ length: 12 }).map((_, i) => (
                 <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
           </select>
           <select 
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest outline-none border border-border/50"
           >
              {Array.from({ length: 2 }).map((_, i) => (
                 <option key={i} value={2026 - i}>{2026 - i}</option>
              ))}
           </select>
           <button 
              onClick={fetchPayroll}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
           >
              <RefreshCcw className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* ─── Highlights Analytics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl shadow-slate-200">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4">Total Net Payable</p>
            <h3 className="text-4xl font-black italic tracking-tighter">{formatINR(payroll?.totalNet || 0)}</h3>
            <div className="mt-6 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Live Preview</span>
            </div>
         </div>
         <div className="p-8 bg-white border border-border rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4 text-blue-600">Total Gross (Earnings)</p>
            <h3 className="text-4xl font-black text-slate-900">
               {formatINR(payroll?.totalGross || 0)}
            </h3>
            <span className="text-[10px] font-medium opacity-40 mt-6 italic">Including All Allowances</span>
         </div>
         <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black text-rose-900 opacity-40 uppercase tracking-widest mb-4">Total Deductions</p>
            <h3 className="text-4xl font-black text-rose-600">
               {formatINR((payroll?.totalGross || 0) - (payroll?.totalNet || 0))}
            </h3>
            <div className="mt-6 flex items-center gap-2">
               <TrendingDown className="w-4 h-4 text-rose-600" />
               <span className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">LWP + PF + ESI + Loans</span>
            </div>
         </div>
         <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black text-blue-900 opacity-40 uppercase tracking-widest mb-4">Personnel Count</p>
            <h3 className="text-4xl font-black text-blue-600">
               {payroll?.slips?.length || 0}
            </h3>
            <div className="mt-6 flex items-center gap-2">
               <Building className="w-4 h-4 text-blue-600" />
               <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Active Payroll Units</span>
            </div>
         </div>
      </div>

      {/* ─── Processing Logic Table ─── */}
      <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="p-8 border-b border-border flex justify-between items-center bg-slate-50/50">
            <div>
               <h3 className="text-xl font-black tracking-tighter">Payroll Run Detail: {monthName} {year}</h3>
               <p className="text-xs font-medium opacity-40 uppercase tracking-widest italic decoration-blue-600 decoration-wavy underline underline-offset-4">Synced with attendance summary</p>
            </div>
            {!disbursed && (
               <button 
                  onClick={handleDisburse}
                  disabled={disbursing || !payroll}
                  className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-200 disabled:opacity-50"
               >
                  {disbursing ? "Disbursement in progress..." : <><ShieldCheck className="w-5 h-5" /> Post & Disburse Salaries</>}
               </button>
            )}
            {disbursed && (
               <div className="flex items-center gap-3 text-emerald-600 font-black uppercase text-xs tracking-widest bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" /> Finalized & Ledger Updated
               </div>
            )}
         </div>

         <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
               <tr className="bg-slate-50 border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Employee</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Days (Worked/LWP)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Gross Earnings</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Total Deductions</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30 text-right">Net Payable</th>
               </tr>
            </thead>
            <tbody>
               {payroll?.slips?.map((s: any) => (
                  <tr key={s.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 font-bold">
                     <td className="px-8 py-6">
                        <div>
                           <p className="text-slate-900 tracking-tight text-sm uppercase italic">{s.staff?.firstName} {s.staff?.lastName}</p>
                           <code className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.staff?.staffCode}</code>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit bg-emerald-100 text-emerald-600"
                           )}>
                              {s.attendedDays} Worked
                           </span>
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit",
                              s.lwpDays > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
                           )}>
                              {s.lwpDays} LWP
                           </span>
                        </div>
                     </td>
                     <td className="px-8 py-6 text-slate-900 text-xs">
                        {formatINR(s.grossSalary)}
                     </td>
                     <td className="px-8 py-6 text-rose-600 text-xs">
                        -{formatINR(Number(s.grossSalary) - Number(s.netSalary))}
                     </td>
                     <td className="px-8 py-6 text-right">
                        <p className="text-slate-900 text-base font-black tracking-tighter italic">{formatINR(s.netSalary)}</p>
                        <button 
                           onClick={() => setSelectedPayslip(s)}
                           className="text-[9px] text-blue-600 uppercase font-black hover:underline"
                        >
                           View Payslip
                        </button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      <PayslipGenerator 
         isOpen={!!selectedPayslip}
         onClose={() => setSelectedPayslip(null)}
         data={selectedPayslip}
         month={monthName}
         year={year}
      />
    </div>
  );
}

