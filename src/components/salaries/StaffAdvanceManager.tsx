"use client";

import React, { useState, useEffect } from "react";
import { 
  PiggyBank, 
  Plus, 
  Search, 
  Calendar, 
  ArrowRightCircle, 
  CheckCircle2, 
  X, 
  AlertCircle,
  Clock,
  History,
  TrendingDown,
  ChevronRight,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStaffDirectoryAction, disburseStaffAdvanceAction } from "@/lib/actions/staff-actions";

export function StaffAdvanceManager() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Advance Form State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [amount, setAmount] = useState("");
  const [installment, setInstallment] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const result = await getStaffDirectoryAction();
    if (result.success) {
      setStaff(result.data);
    }
    setLoading(false);
  };

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !amount || !installment) return;
    
    setSubmitting(true);
    const res = await disburseStaffAdvanceAction(
      selectedStaffId, 
      parseFloat(amount), 
      parseFloat(installment), 
      reason
    );
    
    if (res.success) {
      await fetchData();
      setIsAdding(false);
      resetForm();
    } else {
      alert("Failed to disburse: " + res.error);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedStaffId("");
    setAmount("");
    setInstallment("");
    setReason("");
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const activeLoans = staff.flatMap(s => s.advances || []).filter(a => a.status === "Active");
  const totalOutstanding = activeLoans.reduce((acc, curr) => acc + Number(curr.balance), 0);

  if (loading) return <div className="p-20 text-center opacity-40 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Syncing Loan Registry...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* ─── Metric Overview ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200 flex items-center justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-3">Total Active Advances</p>
               <h3 className="text-4xl font-black tracking-tighter italic">{activeLoans.length}</h3>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/10 backdrop-blur-md">
               <PiggyBank className="w-8 h-8 text-blue-400" />
            </div>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] border border-border shadow-sm flex items-center justify-between group">
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 text-red-500">Gross Outstanding</p>
               <h3 className="text-4xl font-black tracking-tighter text-slate-900">{formatINR(totalOutstanding)}</h3>
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform">
               <TrendingDown className="w-8 h-8 text-blue-600" />
            </div>
         </div>

         <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-700 transition-all border-b-4 border-blue-900/50" onClick={() => setIsAdding(true)}>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-3 text-blue-100">Action Center</p>
               <h3 className="text-2xl font-black tracking-tighter">Disburse Advance</h3>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
               <Plus className="w-8 h-8 text-white" />
            </div>
         </div>
      </div>

      {/* ─── Loan Registry ─── */}
      <div className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="p-8 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div>
               <h3 className="font-black text-xl tracking-tight leading-none mb-2">Staff Loan Registry</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking repayments through automated payroll EMIs</p>
            </div>
            <History className="w-6 h-6 text-slate-300" />
         </div>

         <div className="p-0">
            {activeLoans.length === 0 ? (
               <div className="p-20 text-center flex flex-col items-center gap-4 opacity-30">
                  <AlertCircle className="w-12 h-12" />
                  <p className="font-black uppercase text-xs tracking-widest leading-none">No active staff advances found</p>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-slate-50 border-b border-border font-black text-[10px] uppercase tracking-widest text-slate-400">
                           <th className="px-8 py-5">Employee</th>
                           <th className="px-8 py-5">Sanctioned Date</th>
                           <th className="px-8 py-5">Total Amount</th>
                           <th className="px-8 py-5">Monthly EMI</th>
                           <th className="px-8 py-5 text-blue-600">Current Balance</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {staff.map(s => (s.advances || []).filter((a: any) => a.status === "Active").map((adv: any) => (
                           <tr key={adv.id} className="hover:bg-slate-50 group transition-colors">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                                       {s.staffCode.split("-").pop()}
                                    </div>
                                    <div>
                                       <p className="font-black text-slate-900 text-sm">{s.firstName} {s.lastName}</p>
                                       <p className="text-[10px] font-bold text-slate-400 italic">EMI-Mode: Regular</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-8 py-6 text-xs font-bold text-slate-500">
                                 {new Date(adv.disbursedDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-8 py-6 text-sm font-black text-slate-900">{formatINR(Number(adv.amount))}</td>
                              <td className="px-8 py-6">
                                 <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">
                                    {formatINR(Number(adv.installment))} / mo
                                 </span>
                              </td>
                              <td className="px-8 py-6">
                                 <p className="text-lg font-black text-blue-600 tracking-tighter underline decoration-blue-100 underline-offset-4">{formatINR(Number(adv.balance))}</p>
                              </td>
                           </tr>
                        )))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>

      {/* ─── Disburse Slide-over ─── */}
      <AnimatePresence>
         {isAdding && (
            <>
               <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                  onClick={() => setIsAdding(false)}
               />
               <motion.div 
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white z-[101] shadow-2xl p-10 flex flex-col"
               >
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-3xl font-black tracking-tighter">Disburse Advance</h3>
                     <button onClick={() => setIsAdding(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all">
                        <X className="w-6 h-6" />
                     </button>
                  </div>

                  <form onSubmit={handleDisburse} className="space-y-8 flex-1">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Employee</label>
                        <select 
                           value={selectedStaffId}
                           onChange={(e) => setSelectedStaffId(e.target.value)}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold focus:ring-4 focus:ring-blue-100 outline-none appearance-none"
                           required
                        >
                           <option value="">Choose Staff Member...</option>
                           {staff.map(s => (
                              <option key={s.id} value={s.id} disabled={s.advances?.some((a: any) => a.status === "Active")}>
                                 {s.firstName} {s.lastName} ({s.staffCode}) {s.advances?.some((a: any) => a.status === "Active") ? "[Has Active Loan]" : ""}
                              </option>
                           ))}
                        </select>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Advance Amount</label>
                           <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                              <input 
                                 type="number"
                                 value={amount}
                                 onChange={(e) => setAmount(e.target.value)}
                                 placeholder="0.00"
                                 className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-black focus:ring-4 focus:ring-blue-100 outline-none"
                                 required
                              />
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly EMI</label>
                           <div className="relative">
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                              <input 
                                 type="number"
                                 value={installment}
                                 onChange={(e) => setInstallment(e.target.value)}
                                 placeholder="0.00"
                                 className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:ring-4 focus:ring-blue-100 outline-none"
                                 required
                              />
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 italic">Self-repaying via payroll</p>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remarks / Purpose</label>
                        <textarea 
                           value={reason}
                           onChange={(e) => setReason(e.target.value)}
                           className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold min-h-[120px] outline-none"
                           placeholder="Medical emergency, marriage etc..."
                        />
                     </div>

                     <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-700 leading-relaxed">
                           <AlertCircle className="w-4 h-4 inline-block mr-2 -mt-1" />
                           This amount will be disbursed via **Bank Transfer / Cash** after approval. The EMI will be **automatically deducted** during each monthly payroll run.
                        </p>
                     </div>

                     <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                     >
                        {submitting ? "Processing Transaction..." : "Disburse Loan Now"}
                        <ArrowRightCircle className="w-5 h-5" />
                     </button>
                  </form>
               </motion.div>
            </>
         )}
      </AnimatePresence>
    </div>
  );
}
