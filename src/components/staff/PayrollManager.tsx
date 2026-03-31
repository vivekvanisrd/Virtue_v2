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
import { getPayrollPreviewAction, disburseSalariesAction } from "@/lib/actions/payroll-actions";
import { PayslipGenerator } from "../salaries/PayslipGenerator";

export function PayrollManager() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [disbursed, setDisbursed] = useState(false);
  
  // Payslip State
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    const result = await getPayrollPreviewAction(month, year);
    if (result.success) {
      setPayroll(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year]);

  const handleDisburse = async () => {
    if (!window.confirm(`Critical Confirmation: Are you sure you want to disburse a total net of ${formatINR(payroll?.summary.totalNet)}? This will post Journal Entries and update your Ledger.`)) return;
    
    setDisbursing(true);
    const result = await disburseSalariesAction(month, year, payroll.records);
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
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-3">Elite HR: Paid Leaves & Branded Payslips</p>
           </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-border">
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
            <h3 className="text-4xl font-black italic tracking-tighter">{formatINR(payroll?.summary.totalNet || 0)}</h3>
            <div className="mt-6 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Live Preview</span>
            </div>
         </div>
         <div className="p-8 bg-white border border-border rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4 text-blue-600">Total CTC (Cost to School)</p>
            <h3 className="text-4xl font-black text-slate-900">
               {formatINR(payroll?.records?.reduce((s: number, r: any) => s + (r.totalCTC || 0), 0) || 0)}
            </h3>
            <span className="text-[10px] font-medium opacity-40 mt-6 italic">Including Employer Side PF/ESI</span>
         </div>
         <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black text-rose-900 opacity-40 uppercase tracking-widest mb-4">LOP & Penalties</p>
            <h3 className="text-4xl font-black text-rose-600">
               {formatINR(payroll?.records?.reduce((s: number, r: any) => s + (r.lopDeduction || 0), 0) || 0)}
            </h3>
            <div className="mt-6 flex items-center gap-2">
               <TrendingDown className="w-4 h-4 text-rose-600" />
               <span className="text-[10px] font-bold text-rose-900 uppercase tracking-widest">Unpaid Absences Only</span>
            </div>
         </div>
         <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-black text-blue-900 opacity-40 uppercase tracking-widest mb-4">Leave Consumption</p>
            <h3 className="text-4xl font-black text-blue-600">
               {payroll?.records?.reduce((s: number, r: any) => s + (r.paidLeaves || 0), 0) || 0}
            </h3>
            <div className="mt-6 flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4 text-blue-600" />
               <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">Paid Leave Days Applied</span>
            </div>
         </div>
      </div>

      {/* ─── Processing Logic Table ─── */}
      <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="p-8 border-b border-border flex justify-between items-center bg-slate-50/50">
            <div>
               <h3 className="text-xl font-black tracking-tighter">Payroll Run Detail: {monthName} {year}</h3>
               <p className="text-xs font-medium opacity-40 uppercase tracking-widest italic decoration-blue-600 decoration-wavy underline underline-offset-4">Validated against attendance & leave registry</p>
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
                  <CheckCircle2 className="w-5 h-5" /> Payment Successful & Ledger Updated
               </div>
            )}
         </div>

         <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
               <tr className="bg-slate-50 border-b border-border">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Employee</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Leaves/LOP</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Earnings (Gross)</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Deductions</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30">Net Payable</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-foreground opacity-30 text-right">Actions</th>
               </tr>
            </thead>
            <tbody>
               {payroll?.records.map((r: any, i: number) => (
                  <tr key={r.staffId} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 font-bold">
                     <td className="px-8 py-6">
                        <div>
                           <p className="text-slate-900 tracking-tight text-sm uppercase italic">{r.name}</p>
                           <code className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.code}</code>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit",
                              r.paidLeaves > 0 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                           )}>
                              {r.paidLeaves} Paid Leaves
                           </span>
                           <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit",
                              r.lopDays > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
                           )}>
                              {r.lopDays} LOP Days
                           </span>
                        </div>
                     </td>
                     <td className="px-8 py-6 text-slate-900 text-xs">
                        {formatINR(r.gross)}
                     </td>
                     <td className="px-8 py-6 text-rose-600 text-xs">
                        -{formatINR(r.lopDeduction + r.pfDeduction + (r.esiDeduction || 0) + (r.ptDeduction || 0) + (r.loanDeduction || 0))}
                     </td>
                     <td className="px-8 py-6">
                        <p className="text-slate-900 text-base font-black tracking-tighter italic">{formatINR(r.netPay)}</p>
                        <p className="text-[9px] opacity-20 uppercase font-black truncate max-w-[120px]">Transfer: {r.bankAccount}</p>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <button 
                           onClick={() => setSelectedPayslip(r)}
                           className="p-3 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-100 hover:scale-110 active:scale-95 transition-all group"
                        >
                           <FileText className="w-4 h-4 group-hover:text-blue-400 transition-colors" />
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
