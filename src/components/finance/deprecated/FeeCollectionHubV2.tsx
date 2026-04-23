"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Wallet, 
  ArrowRight, 
  CreditCard, 
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Users,
  Zap,
  X,
  ShieldCheck,
  Bus,
  BookOpen,
  Monitor,
  FileText
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { 
  getStudentFeeStatusV2, 
  recordConsolidatedCollectionV2
} from "@/lib/actions/finance-actions-v2";
import { getSchoolInfoAction } from "@/lib/actions/finance-actions";
import { 
  formatCurrency, 
} from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FeeCollectionHubV2
 * 
 * SOVEREIGN V2: POINT-OF-SALE EDITION (Hardened)
 * High-performance POS interface with atomic duplication guards and high-density, scroll-free layout.
 */
export function FeeCollectionHubV2({ params }: { params?: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [schoolName, setSchoolName] = useState("Virtue Academy");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    getSchoolInfoAction().then(res => {
      if (res.success) setSchoolName(res.name);
    });
  }, []);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    if (val.length > 2) {
      const res = await getStudentListAction({ search: val });
      if (res.success) setSearchResults(res.data);
    } else {
      setSearchResults([]);
    }
  };

  const selectStudent = async (student: any) => {
    if (settlements.find(s => s.student.id === student.id)) {
      setSearchResults([]);
      setSearchTerm("");
      return;
    }

    setIsSelecting(true);
    setSearchResults([]);
    setSearchTerm("");
    
    try {
      const statusRes = await getStudentFeeStatusV2(student.id);
      if (statusRes.success) {
        setSettlements(prev => {
          if (prev.find(s => s.student.id === student.id)) return prev;
          return [...prev, {
            student: statusRes.data,
            selectedTerms: [],
            step: 'selection'
          }];
        });
      }
    } finally {
      setIsSelecting(false);
    }
  };

  const removeSettlement = (id: string) => {
    setSettlements(prev => prev.filter(s => s.student.id !== id));
  };

  const toggleTermForStudent = (studentId: string, termKey: string) => {
    setSettlements(prev => prev.map(s => {
      if (s.student.id !== studentId) return s;
      const isSelected = s.selectedTerms.includes(termKey);
      return {
        ...s,
        selectedTerms: isSelected 
          ? s.selectedTerms.filter((t: string) => t !== termKey)
          : [...s.selectedTerms, termKey]
      };
    }));
  };

  const grandTotal = settlements.reduce((sum, s) => {
    return sum + s.selectedTerms.reduce((tSum: number, tKey: string) => {
      const fee = s.student.feeBreakdown[tKey] || s.student.feeBreakdown.ancillary?.[tKey];
      return tSum + (fee?.amount || 0);
    }, 0);
  }, 0);

  const handleConfirmPay = async () => {
    if (grandTotal <= 0) return;
    setCollectionLoading(true);
    
    try {
      const settlementsPayload = settlements.map(s => {
        const amounts: Record<string, number> = {};
        s.selectedTerms.forEach((t: string) => {
          const detail = s.student.feeBreakdown[t] || s.student.feeBreakdown.ancillary?.[t];
          amounts[t] = detail?.amount || 0;
        });

        return {
          studentId: s.student.id,
          selectedItems: s.selectedTerms,
          amounts
        };
      });

      const res = await recordConsolidatedCollectionV2({
        settlements: settlementsPayload,
        paymentMode,
        paymentReference
      });

      if (res.success) {
        setSuccessData(res.data);
        setIsSuccess(true);
      } else {
        alert("Settlement Failed: " + res.error);
      }
    } catch (err: any) {
      alert("System Error: " + err.message);
    } finally {
      setCollectionLoading(false);
    }
  };

  const resetHub = () => {
    setSettlements([]);
    setIsSuccess(false);
    setSuccessData(null);
    setPaymentReference("");
  };

  const setAdHocAmount = (studentId: string, feeKey: string) => {
    const amount = prompt("Enter amount for this additional item:");
    if (amount && !isNaN(Number(amount))) {
      setSettlements(prev => prev.map(s => {
        if (s.student.id !== studentId) return s;
        const newStudent = { ...s.student };
        if (newStudent.feeBreakdown.ancillary?.[feeKey]) {
            newStudent.feeBreakdown.ancillary[feeKey].amount = Number(amount);
        }
        return { ...s, student: newStudent };
      }));
    }
  };

  // Internal FeeTile sub-component to fix nested buttons and keep layout clean
  const FeeTile = ({ s, feeKey, fee, section }: { s: any, feeKey: string, fee: any, section: any }) => {
    const isSelected = s.selectedTerms.includes(feeKey);
    const Icon = feeKey === "transportFee" ? Bus 
               : feeKey === "libraryFee" ? BookOpen 
               : feeKey === "computerFee" ? Monitor 
               : feeKey === "examFee" ? FileText 
               : feeKey === "cautionDeposit" ? Wallet
               : feeKey === "admissionFee" ? ShieldCheck
               : section.icon;

    return (
      <div 
        key={feeKey}
        role="button"
        tabIndex={0}
        onClick={() => !fee.isPaid && toggleTermForStudent(s.student.id, feeKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!fee.isPaid) toggleTermForStudent(s.student.id, feeKey);
          }
        }}
        className={cn(
          "p-3 md:p-4 rounded-xl border-2 transition-all text-left relative group/card flex flex-col justify-between min-h-[120px] cursor-pointer",
          fee.isPaid 
            ? "bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed"
            : isSelected 
              ? "bg-white border-primary shadow-lg shadow-primary/5 -translate-y-1 ring-2 ring-primary/5"
              : "bg-white border-slate-50 hover:border-slate-200"
        )}
      >
        <div className="flex items-center justify-between">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm",
            isSelected ? "bg-primary text-white" : "bg-slate-50 text-slate-300"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
        </div>
        
        <div className="space-y-0.5 mt-2">
          <div className="flex items-center gap-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{fee.label}</p>
            <div className={cn("h-1 w-1 rounded-full", `bg-${section.color}-400`)} />
          </div>
          <div className="flex flex-col">
            {fee.amount > 0 ? (
              <span className="text-sm md:text-md font-black text-slate-900 tracking-tighter leading-none mt-1">
                {formatCurrency(fee.amount)}
              </span>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-900 text-white text-[7px] font-black uppercase tracking-widest rounded-md skew-x-[-10deg]">AD-HOC</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setAdHocAmount(s.student.id, feeKey); }}
                  className="text-[7px] font-black text-primary underline decoration-2 underline-offset-2 hover:text-slate-900 transition-colors"
                >
                  SET
                </button>
              </div>
            )}
            {fee.isPaid && <span className="text-[7px] font-black uppercase text-emerald-600 tracking-widest mt-0.5">Settled</span>}
          </div>
        </div>
      </div>
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-white rounded-[4rem] overflow-hidden shadow-2xl relative"
        >
          <div className="bg-emerald-500 p-16 text-center text-white space-y-6">
             <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center mx-auto backdrop-blur-xl border border-white/30 animate-pulse">
                <CheckCircle2 className="w-12 h-12" />
             </div>
             <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-tighter">Settlement Secured</h2>
                <p className="text-emerald-100 font-medium">The consolidated batch has been recorded in the ledger.</p>
             </div>
          </div>

          <div className="p-12 space-y-8">
             <div className="grid grid-cols-2 gap-8 pt-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Collected</p>
                   <p className="text-3xl font-black text-slate-900">{formatCurrency(grandTotal)}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profiles Settled</p>
                   <p className="text-3xl font-black text-slate-900">{settlements.length}</p>
                </div>
             </div>

             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generated Receipts</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                   {settlements.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                         <div>
                            <p className="text-sm font-black text-slate-900">{s.student.firstName} {s.student.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">REF: {successData?.[idx]?.receiptNumber || "Generating..."}</p>
                         </div>
                         <button className="p-3 bg-white text-slate-400 rounded-xl hover:text-primary transition-colors shadow-sm">
                            <FileText className="w-4 h-4" />
                         </button>
                      </div>
                   ))}
                </div>
             </div>

             <div className="pt-8 flex flex-col gap-4">
                <button onClick={resetHub} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-900/10">
                   New Settlement Hub
                </button>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-6 space-y-6 min-h-screen bg-slate-50/50">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
         <div className="space-y-1">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl">
                  <CreditCard className="w-5 h-5" />
               </div>
               <h1 className="text-3xl font-black tracking-tighter text-slate-900">Settlement Hub <span className="text-primary italic">V2</span></h1>
            </div>
            <p className="text-xs font-medium text-slate-500 opacity-60 italic">Precision POS Reconciliation.</p>
         </div>

         <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Identify student..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold focus:outline-none focus:border-primary transition-all shadow-sm"
            />
            
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {searchResults.map((student) => (
                    <button 
                      key={student.id}
                      disabled={isSelecting}
                      onClick={() => selectStudent(student)}
                      className="w-full p-4 hover:bg-slate-50 flex items-center gap-3 text-left border-b border-slate-50 last:border-0"
                    >
                      <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-900">{student.firstName} {student.lastName}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{student.registrationId}</p>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>

      <div className="grid grid-cols-1">
        {settlements.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] p-16 text-center space-y-2">
             <Users className="w-10 h-10 text-slate-200 mx-auto" />
             <h2 className="text-lg font-black text-slate-300">Identification Required</h2>
          </div>
        ) : (
          <div className="space-y-6">
             {settlements.map((s) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                   key={s.student.id}
                   className="bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden relative"
                 >
                    <div className="p-4 md:p-6 lg:p-8">
                       <div className="flex flex-col md:flex-row items-center gap-6 mb-6 border-b border-slate-50 pb-6">
                          <div className="relative">
                             <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-md font-black">
                                 {s.student.firstName[0]}{s.student.lastName[0]}
                             </div>
                             <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white">
                                <ShieldCheck className="w-3 h-3" />
                             </div>
                          </div>
                          <div className="flex-1 text-center md:text-left">
                             <h2 className="text-xl font-black text-slate-900 leading-none">{s.student.firstName} {s.student.lastName}</h2>
                             <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[7px] font-black uppercase tracking-widest">{s.student.academic?.class?.name || "No Grade"}</span>
                                <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[7px] font-black uppercase tracking-widest">{s.student.registrationId}</span>
                             </div>
                          </div>
                          <button onClick={() => removeSettlement(s.student.id)} className="p-2 bg-slate-50 text-slate-300 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all">
                             <X className="w-3 h-3" />
                          </button>
                       </div>

                       <div className="flex flex-col xl:flex-row gap-8">
                          {/* LEFT: TUITION - High Density */}
                          <div className="xl:w-[280px] space-y-4">
                             <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Installments</p>
                             <div className="grid grid-cols-1 gap-3">
                                {['term1', 'term2', 'term3'].map((key) => {
                                   const term = s.student.feeBreakdown[key];
                                   if (!term) return null;
                                   const isSelected = s.selectedTerms.includes(key);
                                   return (
                                     <div 
                                       key={key}
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => !term.isPaid && toggleTermForStudent(s.student.id, key)}
                                       className={cn(
                                         "p-3 rounded-xl border-2 transition-all cursor-pointer",
                                         term.isPaid 
                                           ? "bg-slate-50/50 border-slate-100 opacity-60 cursor-not-allowed"
                                           : isSelected 
                                             ? "bg-white border-primary shadow-sm ring-1 ring-primary/10"
                                             : "bg-white border-slate-50 hover:border-slate-100"
                                       )}
                                     >
                                        <div className="flex items-center justify-between mb-1">
                                          <p className="text-[7px] font-black text-slate-400 uppercase">{term.label}</p>
                                          {isSelected && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                        </div>
                                        <p className="text-lg font-black text-slate-900">{formatCurrency(term.amount)}</p>
                                     </div>
                                   );
                                })}
                             </div>
                          </div>

                          {/* RIGHT: ANCILLARY - 2 Column Grid */}
                          <div className="flex-1 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                   { title: "Onboarding", group: ["admissionFee", "cautionDeposit"], color: "emerald", icon: ShieldCheck },
                                   { title: "Academic Services", group: ["transportFee", "libraryFee", "examFee", "computerFee"], color: "blue", icon: Bus },
                                ].map(section => {
                                   const items = Object.entries(s.student.feeBreakdown.ancillary || {})
                                     .filter(([key]) => section.group.includes(key));
                                   if (items.length === 0) return null;
                                   return (
                                     <div key={section.title} className="space-y-3">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{section.title}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                           {items.map(([key, fee]: [string, any]) => (
                                              <FeeTile key={key} s={s} feeKey={key} fee={fee} section={section} />
                                           ))}
                                        </div>
                                     </div>
                                   );
                                })}
                             </div>

                             <div className="space-y-3">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Supplementary Items</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                   {Object.entries(s.student.feeBreakdown.ancillary || {})
                                     .filter(([key]) => !["admissionFee", "cautionDeposit", "transportFee", "libraryFee", "examFee", "computerFee"].includes(key))
                                     .map(([key, fee]: [string, any]) => (
                                        <FeeTile key={key} s={s} feeKey={key} fee={fee} section={{ color: "indigo", icon: Zap }} />
                                     ))}
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="mt-8 pt-4 border-t border-slate-50 flex justify-end gap-6 text-right">
                          <div>
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Profile Net</p>
                             <p className="text-md font-black text-indigo-600">{formatCurrency(s.student.feeBreakdown.annualNet)}</p>
                          </div>
                          <div>
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Selected</p>
                             <p className="text-md font-black text-slate-900">
                                {formatCurrency(s.selectedTerms.reduce((sum: number, t: string) => {
                                   const detail = s.student.feeBreakdown[t] || s.student.feeBreakdown.ancillary?.[t];
                                   return sum + (detail?.amount || 0);
                                }, 0))}
                             </p>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              ))}
           </div>
        )}
      </div>

      <AnimatePresence>
        {grandTotal > 0 && (
          <motion.div 
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[900px] z-50"
          >
             <div className="bg-slate-900 text-white p-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border-4 border-white">
                <div>
                   <p className="text-[8px] font-black uppercase tracking-[0.3em] text-primary italic">Sovereign Point-of-Sale</p>
                   <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-black">{formatCurrency(grandTotal)}</span>
                      <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest">{settlements.length} Profiles</span>
                   </div>
                </div>
                
                <div className="flex gap-3">
                   <div className="flex bg-white/5 p-1 rounded-2xl gap-1 border border-white/10">
                      {["Cash", "Razorpay"].map(mode => (
                         <button 
                           key={mode}
                           onClick={() => setPaymentMode(mode)}
                           className={cn(
                             "px-5 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                             paymentMode === mode ? "bg-primary text-white" : "text-white/40 hover:text-white"
                           )}
                         >
                            {mode}
                         </button>
                      ))}
                   </div>
                   <button 
                     onClick={handleConfirmPay}
                     disabled={collectionLoading}
                     className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                   >
                     {collectionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Pay"}
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {collectionLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-900">Finalizing Ledger...</p>
        </div>
      )}
    </div>
  );
}
