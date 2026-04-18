"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  Edit3, 
  CheckCircle2, 
  X, 
  Loader2, 
  Wallet,
  Settings2,
  Percent,
  TrendingDown,
  Info,
  ShieldCheck,
  Building
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStaffDirectoryAction, updateStaffProfessionalAction } from "@/lib/actions/staff-actions";
import { PayrollEngine } from "@/lib/services/payroll-engine";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useTabs } from "@/context/tab-context";

export function SalaryRegistry() {
  const { openTab } = useTabs();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Edit State
  const [editValues, setEditValues] = useState<any>({});

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const result = await getStaffDirectoryAction();
    if (result.success) {
      setStaff(result.data);
    }
    setLoading(false);
  };

  const startEdit = (s: any) => {
    setEditingId(s.id);
    const p = s.professional;
    setEditValues({
      casualLeaveBalance: p?.casualLeaveBalance || 0,
      sickLeaveBalance: p?.sickLeaveBalance || 0,
      basicSalary: p?.basicSalary || 0,
      isPFEnabled: p?.isPFEnabled || false,
      isESIEnabled: p?.isESIEnabled || false,
      isDAEnabled: p?.isDAEnabled || false,
      daAmount: p?.daAmount || 0,
      hraAmount: p?.hraAmount || 0,
      specialAllowance: p?.specialAllowance || 0,
      transportAllowance: p?.transportAllowance || 0,
      isPTEnabled: p?.isPTEnabled || false,
      designation: p?.designation || "",
      department: p?.department || "",
      hraFormula: p?.hraFormula || "",
      daFormula: p?.daFormula || ""
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setUpdating(true);
    const result = await updateStaffProfessionalAction(editingId, editValues);
    if (result.success) {
      await fetchStaff();
      setEditingId(null);
    } else {
      alert("Update failed: " + result.error);
    }
    setUpdating(false);
  };

  const toggleField = (field: string) => {
    setEditValues((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const filteredStaff = staff.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staffCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return <div className="p-20 text-center opacity-40 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Syncing Full Salary Registry...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-1">
      {/* ─── Header ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-slate-200">
              <Settings2 className="w-8 h-8" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-foreground tracking-tighter underline decoration-primary/20 underline-offset-8">Precision Payroll Hub</h2>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-3">Full Structure: HRA, Allowances & PT Registry</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground opacity-30" />
              <input 
                 type="text"
                 placeholder="Search staff..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full lg:w-80 pl-11 pr-4 py-3 bg-slate-50 border border-border rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
           </div>
           <button onClick={fetchStaff} className="p-3 bg-white border border-border rounded-2xl hover:bg-slate-50">
              <Loader2 className={cn("w-5 h-5", loading && "animate-spin")} />
           </button>
        </div>
      </div>

      {/* ─── Registry Table ─── */}
      <div className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead>
                  <tr className="bg-slate-50 border-b border-border font-black text-[10px] uppercase tracking-widest text-foreground/40">
                     <th className="px-8 py-5">Employee Info</th>
                     <th className="px-8 py-5">KYC Status</th>
                     <th className="px-8 py-5">Basic & DA</th>
                     <th className="px-8 py-5 text-emerald-600">Leaves (CL/SL)</th>
                     <th className="px-8 py-5 text-blue-600">Allowances (HRA/SPL)</th>
                     <th className="px-8 py-5 text-indigo-600">Statutory (PF/ESI/PT)</th>
                     <th className="px-8 py-5">Bank</th>
                     <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  <AnimatePresence mode="popLayout">
                     {filteredStaff.map((s, i) => (
                        <motion.tr 
                           layout
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: i * 0.05 }}
                           key={s.id} 
                           className={cn(
                              "group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0",
                              editingId === s.id && "bg-blue-50/30"
                           )}
                        >
                           {(() => {
                              const prof = editingId === s.id ? editValues : s.professional;
                              const breakdown = PayrollEngine.calculateStaffRemuneration(prof || {});
                              
                              return (
                                <>
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                                    {s.firstName[0]}{s.lastName[0]}
                                 </div>
                                 <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <p 
                                        onClick={() => openTab({ 
                                           id: `staff-profile-${s.id}`, 
                                           title: `${s.firstName} Profile`, 
                                           component: "Staff", 
                                           params: { staffId: s.id, forceEdit: true } 
                                        })}
                                        className="font-black text-slate-900 tracking-tight leading-none text-sm cursor-pointer hover:underline hover:text-primary transition-all"
                                      >
                                        {s.firstName} {s.lastName}
                                      </p>
                                      <span className={cn(
                                         "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter",
                                         s.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                      )}>
                                         {s.status}
                                      </span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <p 
                                        onClick={() => openTab({ 
                                           id: `staff-financials-${s.id}`, 
                                           title: `${s.firstName} Ledger`, 
                                           component: "Staff", 
                                           params: { staffId: s.id, view: "financials" } 
                                        })}
                                        className="text-[9px] font-black text-slate-300 uppercase tracking-widest cursor-pointer hover:text-indigo-500 hover:underline transition-all"
                                      >
                                        {s.staffCode}
                                      </p>
                                      {s.onboardingStatus !== "JOINED" && (
                                         <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-sm border border-blue-100">
                                            {s.onboardingStatus}
                                         </span>
                                      )}
                                   </div>
                                 </div>
                              </div>
                           </td>

                           {/* KYC Column */}
                           <td className="px-8 py-6">
                              <div className="flex flex-col gap-1.5">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold opacity-30 w-8 uppercase tracking-widest">PAN</span>
                                    <span className={cn(
                                       "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                       s.kyc?.panStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-600" : 
                                       s.kyc?.panStatus === "REJECTED" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                       {s.kyc?.panStatus || "PENDING"}
                                    </span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold opacity-30 w-8 uppercase tracking-widest">AAD</span>
                                    <span className={cn(
                                       "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest",
                                       s.kyc?.aadhaarStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-600" : 
                                       s.kyc?.aadhaarStatus === "REJECTED" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                       {s.kyc?.aadhaarStatus || "PENDING"}
                                    </span>
                                 </div>
                              </div>
                           </td>

                           <td className="px-8 py-6">
                              {editingId === s.id ? (
                                 <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">BAS:</span>
                                       <input 
                                          type="number"
                                          value={editValues.basicSalary}
                                          onChange={(e) => setEditValues({ ...editValues, basicSalary: parseFloat(e.target.value) })}
                                          className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black outline-none"
                                       />
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">DA:</span>
                                       <div className="flex items-center gap-1">
                                          <input 
                                             type="checkbox"
                                             checked={editValues.isDAEnabled}
                                             onChange={() => toggleField("isDAEnabled")}
                                             className="accent-primary"
                                          />
                                          {editValues.isDAEnabled && (
                                             <input 
                                                type="text"
                                                placeholder="Formula (e.g. 0.5 * basic)"
                                                value={editValues.daFormula}
                                                onChange={(e) => setEditValues({ ...editValues, daFormula: e.target.value })}
                                                className="w-40 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black outline-none"
                                             />
                                          )}
                                       </div>
                                    </div>
                                    {!breakdown.isCompliant && (
                                       <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 p-1 rounded">
                                          <AlertCircle className="w-2 h-2" />
                                          50% Rule Violation
                                       </div>
                                    )}
                                 </div>
                              ) : (
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <p className="text-sm font-black text-slate-900">{formatINR(breakdown.basic)}</p>
                                       {!breakdown.isCompliant && (
                                          <div className="group relative">
                                             <AlertCircle className="w-3 h-3 text-rose-500 cursor-help" />
                                             <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 bg-slate-900 text-white text-[9px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                                                {breakdown.violations[0]}
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    {breakdown.da > 0 && (
                                       <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">+ DA: {formatINR(breakdown.da)}</p>
                                    )}
                                 </div>
                              )}
                           </td>

                           {/* Leaves Column */}
                           <td className="px-8 py-6">
                              {editingId === s.id ? (
                                 <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">CL:</span>
                                       <input 
                                          type="number"
                                          value={editValues.casualLeaveBalance}
                                          onChange={(e) => setEditValues({ ...editValues, casualLeaveBalance: parseInt(e.target.value) })}
                                          className="w-16 px-2 py-1 bg-white border border-emerald-100 rounded-lg text-xs font-black outline-none"
                                       />
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">SL:</span>
                                       <input 
                                          type="number"
                                          value={editValues.sickLeaveBalance}
                                          onChange={(e) => setEditValues({ ...editValues, sickLeaveBalance: parseInt(e.target.value) })}
                                          className="w-16 px-2 py-1 bg-white border border-emerald-100 rounded-lg text-xs font-black outline-none"
                                       />
                                    </div>
                                 </div>
                              ) : (
                                 <div className="space-y-1">
                                    <p className="text-xs font-black text-emerald-700">CL: {s.professional?.casualLeaveBalance || 0}</p>
                                    <p className="text-xs font-bold text-slate-400">SL: {s.professional?.sickLeaveBalance || 0}</p>
                                 </div>
                              )}
                           </td>

                           {/* HRA & Special Allowances */}
                           <td className="px-8 py-6">
                              {editingId === s.id ? (
                                 <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">HRA:</span>
                                       <input 
                                          type="text"
                                          placeholder="Formula or Value"
                                          value={editValues.hraFormula || editValues.hraAmount}
                                          onChange={(e) => setEditValues({ ...editValues, hraFormula: e.target.value })}
                                          className="w-40 px-2 py-1 bg-white border border-blue-100 rounded-lg text-[10px] font-black outline-none"
                                       />
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold opacity-30 w-8">SPL:</span>
                                       <input 
                                          type="number"
                                          value={editValues.specialAllowance}
                                          onChange={(e) => setEditValues({ ...editValues, specialAllowance: parseFloat(e.target.value) })}
                                          className="w-24 px-2 py-1 bg-white border border-blue-100 rounded-lg text-xs font-black outline-none"
                                       />
                                    </div>
                                 </div>
                              ) : (
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <p className="text-xs font-bold text-slate-500">HRA:</p>
                                       <p className="text-xs font-black text-slate-900">{formatINR(breakdown.hra)}</p>
                                       {s.professional?.hraFormula && (
                                          <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                                       )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <p className="text-xs font-bold text-slate-500">SPL:</p>
                                       <p className="text-xs font-black text-slate-900">{formatINR(breakdown.specialAllowance)}</p>
                                    </div>
                                    <div className="pt-1 mt-1 border-t border-slate-50 flex items-center justify-between">
                                       <span className="text-[8px] font-bold text-slate-300 uppercase underline decoration-emerald-500/30 underline-offset-4">GROSS</span>
                                       <span className="text-[10px] font-black text-slate-900">{formatINR(breakdown.grossRemuneration)}</span>
                                    </div>
                                 </div>
                              )}
                           </td>

                           {/* Statutory Toggles */}
                           <td className="px-8 py-6">
                              <div className="flex flex-wrap gap-2 max-w-[200px]">
                                 {[
                                    { id: "isPFEnabled", label: "PF", active: editingId === s.id ? editValues.isPFEnabled : s.professional?.isPFEnabled, color: "bg-blue-600" },
                                    { id: "isESIEnabled", label: "ESI", active: editingId === s.id ? editValues.isESIEnabled : s.professional?.isESIEnabled, color: "bg-indigo-600" },
                                    { id: "isPTEnabled", label: "PT", active: editingId === s.id ? editValues.isPTEnabled : s.professional?.isPTEnabled, color: "bg-rose-600" }
                                 ].map((stat) => (
                                    <div 
                                       key={stat.id}
                                       onClick={() => editingId === s.id && toggleField(stat.id)}
                                       className={cn(
                                          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all",
                                          stat.active ? `${stat.color} text-white border-transparent shadow-sm` : "bg-slate-50 text-slate-400 border-slate-200",
                                          editingId === s.id && "cursor-pointer"
                                       )}
                                    >
                                       {stat.label}
                                    </div>
                                 ))}
                              </div>
                           </td>

                           {/* Bank Status Column */}
                           <td className="px-8 py-6">
                              {s.bank?.accountNumber ? (
                                 <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                       <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                       <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Validated</span>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-300 font-mono tracking-tighter text-ellipsis overflow-hidden whitespace-nowrap max-w-[150px]">
                                       {s.bank.bankName} • {s.bank.accountNumber.toString().slice(-4).padStart(s.bank.accountNumber.length, '*')}
                                    </span>
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-2 text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 w-fit">
                                    <Info className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Bank Details Missing</span>
                                 </div>
                              )}
                           </td>

                           <td className="px-8 py-6 text-right">
                              {editingId === s.id ? (
                                 <div className="flex items-center justify-end gap-2">
                                    <button onClick={handleUpdate} disabled={updating} className="p-2 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-200 disabled:opacity-50">
                                       <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-400 rounded-xl">
                                       <X className="w-4 h-4" />
                                    </button>
                                 </div>
                              ) : (
                                 <button onClick={() => startEdit(s)} className="p-2 text-slate-200 hover:text-slate-900 transition-all">
                                    <Edit3 className="w-4 h-4" />
                                 </button>
                              )}
                           </td>
                                </>
                               );
                            })()}
                         </motion.tr>
                     ))}
                  </AnimatePresence>
               </tbody>
            </table>
         </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
         <div className="flex items-start gap-5 relative z-10">
            <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
               <Info className="w-6 h-6 text-blue-400" />
            </div>
            <div>
               <h4 className="text-sm font-black uppercase tracking-widest mb-2">Salary Registry Standards</h4>
               <p className="text-xs font-medium opacity-50 leading-relaxed max-w-2xl">
                  Precision payroll ensures that HRA and Special Allowances are combined with Basic and DA to form the **Gross Salary**. 
                  Professional Tax (PT) is automatically applied as a ₹200 deduction if Gross exceeds ₹15,000 and PT is enabled.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
