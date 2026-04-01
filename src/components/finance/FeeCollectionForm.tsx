"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Wallet, 
  ArrowRight, 
  CreditCard, 
  Banknote, 
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CalendarDays,
  User,
  Users,
  Zap,
  Trash2
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { 
  getStudentFeeStatus, 
  recordFeeCollection, 
  findPotentialSiblings 
} from "@/lib/actions/finance-actions";
import { createPaymentLinkAction } from "@/lib/actions/payment-actions";
import { 
  calculateTermBreakdown, 
  formatCurrency, 
  calculateLateFee,
  generateUPIString 
} from "@/lib/utils/fee-utils";
import { useTabs } from "@/context/tab-context";
import { DiscountRoadmap } from "./DiscountRoadmap";
import { FeeReceipt } from "./FeeReceipt";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FeeCollectionForm
 * 
 * A high-end, interactive form for recording fee collections.
 */
export function FeeCollectionForm({ params }: { params?: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  // --- BATCH SETTLEMENT STATE ---
  interface Settlement {
    student: any;
    selectedTerms: string[];
    waivedLateFee: boolean;
    waiverReason: string;
  }
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  
  const [loading, setLoading] = useState(!!params?.studentId);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [success, setSuccess] = useState<any[] | null>(null); // Array of results for batch
  const [error, setError] = useState<string | null>(null);
  
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDetails, setPaymentDetails] = useState({
    bankName: "",
    accountNo: "",
    chequeNo: "",
    upiId: "",
    transactionId: "",
    paymentLink: "",
    linkLoading: false
  });
  const [showQR, setShowQR] = useState(false);
  const [siblings, setSiblings] = useState<any[]>([]);
  const { setTabDirty } = useTabs();

  // --- WORKSPACE GUARD (isDirty) ---
  useEffect(() => {
    const isDirty = settlements.some(s => s.selectedTerms.length > 0) || 
                  paymentDetails.transactionId !== "" || 
                  paymentDetails.chequeNo !== "" ||
                  paymentDetails.bankName !== "";
    
    setTabDirty("fee-collection", isDirty);
    return () => setTabDirty("fee-collection", false);
  }, [settlements, paymentDetails, setTabDirty]);

  // Wrap useTabs to be fault-tolerant on static pages without a TabProvider
  let openTab: any;
  try {
    const tabsData = useTabs();
    openTab = tabsData?.openTab;
  } catch (e) {
    // If we're not inside a TabProvider (like the static /admin/fees page), fallback
    openTab = () => console.warn("Cannot navigate to sibling profile: Not running within TabProvider.");
  }

  useEffect(() => {
    if (params?.studentId) {
      selectStudent(params.studentId);
    }
  }, [params?.studentId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await getStudentListAction({ search: searchTerm });
    if (result.success && result.data) {
      setSearchResults(result.data);
    } else {
      setError(result.error || "Search failed");
    }
    setLoading(false);
  };

  const selectStudent = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSearchTerm("");
    setSearchResults([]);
    setSettlements([]); // Clear previous payment context
    
    try {
      const result = await getStudentFeeStatus(id);
      if (result.success && result.data) {
        setSettlements([{
          student: result.data,
          selectedTerms: [],
          waivedLateFee: false,
          waiverReason: ""
        }]);
        
        // SIBLING ISOLATION: Only look for siblings for manual search mode.
        // For direct wallet links (params.studentId), we keep the ledger 100% individual.
        if (!params?.studentId) {
          const sibResult = await findPotentialSiblings(id);
          if (sibResult.success) setSiblings(sibResult.data);
        } else {
          setSiblings([]); // Ensure no batching possible in direct mode
        }
      } else {
        setError(result.error || "Failed to retrieve student profile.");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    }
    setLoading(false);
  };

  const addSiblingToBatch = async (id: string) => {
    // Avoid duplicates
    if (settlements.some(s => s.student.id === id)) return;

    setLoading(true);
    try {
      const result = await getStudentFeeStatus(id);
      if (result.success && result.data) {
        setSettlements(prev => [...prev, {
          student: result.data,
          selectedTerms: [],
          waivedLateFee: false,
          waiverReason: ""
        }]);
      }
    } catch (err) {}
    setLoading(false);
  };

  const removeStudentFromBatch = (id: string) => {
    setSettlements(prev => prev.filter(s => s.student.id !== id));
  };

  const toggleTermForStudent = (studentId: string, termId: string) => {
    setSettlements(prev => prev.map(s => {
      if (s.student.id !== studentId) return s;
      
      const isSelected = s.selectedTerms.includes(termId);
      let newTerms = [...s.selectedTerms];
      
      if (isSelected) {
        if (termId === "term1") newTerms = newTerms.filter(t => t !== "term1" && t !== "term2" && t !== "term3");
        else if (termId === "term2") newTerms = newTerms.filter(t => t !== "term2" && t !== "term3");
        else newTerms = newTerms.filter(t => t !== termId);
      } else {
        newTerms.push(termId);
      }
      
      return { ...s, selectedTerms: newTerms };
    }));
  };

  const updateWaiverForStudent = (studentId: string, waived: boolean, reason?: string) => {
    setSettlements(prev => prev.map(s => 
      s.student.id === studentId ? { ...s, waivedLateFee: waived, waiverReason: reason || s.waiverReason } : s
    ));
  };

  // --- BATCH CALCULATIONS ---
  const getBatchTotals = () => {
    return settlements.reduce((acc, s) => {
      const termTotal = s.selectedTerms.reduce((sum, t) => {
        const breakdown = s.student.feeBreakdown[t];
        return sum + (breakdown ? breakdown.amount : 0);
      }, 0);

      const lateFeeTotal = s.waivedLateFee ? 0 : s.selectedTerms.reduce((sum, t) => {
        const breakdown = s.student.feeBreakdown[t];
        if (breakdown && breakdown.dueDate && !breakdown.isPaid) {
          return sum + calculateLateFee(breakdown.dueDate).amount;
        }
        return sum;
      }, 0);

      return {
        terms: acc.terms + termTotal,
        lateFees: acc.lateFees + lateFeeTotal
      };
    }, { terms: 0, lateFees: 0 });
  };

  const totals = getBatchTotals();
  const grandTotal = totals.terms + totals.lateFees;

  const generateRazorpayLink = async () => {
    if (settlements.length === 0 || settlements.every(s => s.selectedTerms.length === 0)) return;
    
    setPaymentDetails(prev => ({ ...prev, linkLoading: true }));
    setError(null);

    // For Razorpay links, we use the first student as the primary customer for the batch
    const primary = settlements[0];
    const total = grandTotal;
    const allTerms = settlements.flatMap(s => s.selectedTerms.map(t => `${s.student.firstName}:${t}`));

    const res = await createPaymentLinkAction({
      amount: total,
      studentId: primary.student.id,
      studentName: `${primary.student.firstName} ${primary.student.lastName}`,
      email: primary.student.guardianEmail || undefined,
      contact: primary.student.guardianPhone || undefined,
      notes: `Consolidated Payment for ${settlements.length} items`,
      terms: allTerms
    });

    if (res.success && res.shortUrl) {
      setPaymentDetails(prev => ({ ...prev, paymentLink: res.shortUrl as string }));
    } else {
      setError(res.error || "Failed to generate Razorpay link");
    }
    setPaymentDetails(prev => ({ ...prev, linkLoading: false }));
  };

  const processPayment = async () => {
    if (settlements.length === 0 || settlements.every(s => s.selectedTerms.length === 0)) return;
    
    setCollectionLoading(true);
    setError(null);
    setSuccess(null);

    // 1. Prepare Bulk Payload
    const settlementsPayload = settlements
      .filter(s => s.selectedTerms.length > 0)
      .map(s => {
        const termTotal = s.selectedTerms.reduce((sum, t) => sum + (s.student.feeBreakdown[t]?.amount || 0), 0);
        const lateTotal = s.selectedTerms.reduce((sum, t) => {
          const term = s.student.feeBreakdown[t];
          if (term && term.dueDate && !term.isPaid) return sum + calculateLateFee(term.dueDate).amount;
          return sum;
        }, 0);

        return {
          studentId: s.student.id,
          selectedTerms: s.selectedTerms,
          amountPaid: termTotal,
          lateFeePaid: s.waivedLateFee ? 0 : lateTotal,
          lateFeeWaived: s.waivedLateFee,
          waiverReason: s.waivedLateFee ? s.waiverReason : undefined
        };
      });

    if (settlementsPayload.length === 0) {
      setCollectionLoading(false);
      return;
    }

    // 2. Atomic Bulk Execution
    const result = await (await import("@/lib/actions/finance-actions")).recordBulkFeeCollection({
      settlements: settlementsPayload,
      paymentMode,
      paymentReference: paymentMode === "Cash" ? "" : (paymentDetails.transactionId || paymentDetails.chequeNo)
    });

    if (result.success && Array.isArray(result.data)) {
      const batchResults = result.data.map((collection: any) => {
        const student = settlements.find(s => s.student.id === collection.studentId)?.student;
        return {
          student,
          receipt: collection
        };
      });

      setSuccess(batchResults);
      // Clean up batch state
      setSettlements([]);
      setSiblings([]);
      setPaymentDetails({ 
        bankName: "", 
        accountNo: "", 
        chequeNo: "", 
        upiId: "", 
        transactionId: "",
        paymentLink: "",
        linkLoading: false
      });
    } else {
      setError(result.error || "Batch settlement failed.");
    }
    
    setCollectionLoading(false);
  };

  if (settlements.length === 0) {
    if ((loading || !!params?.studentId) && !error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[600px] p-8 text-center animate-in fade-in duration-500">
           <div className="relative mb-12">
              <div className="w-32 h-32 bg-primary/5 rounded-[3rem] animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <div className="absolute -top-4 -right-4 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl">
                 Authenticating Settlement...
              </div>
           </div>
           <h2 className="text-3xl font-black tracking-tighter text-foreground mb-3">Professional Fee Settlement</h2>
           <p className="text-muted-foreground text-[10px] max-w-sm font-black opacity-60 uppercase tracking-[0.2em] leading-relaxed">
              Bootstrapping secure financial ledger context for direct student access.
           </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] p-8 animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mb-8 shadow-2xl shadow-primary/10">
          <Wallet className="w-10 h-10" />
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-foreground mb-3">Fee Collection</h2>
        <p className="text-muted-foreground text-sm max-w-sm font-medium mb-8 opacity-60 text-center">
          Enter admission number or student name to begin professional settlement.
        </p>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in zoom-in duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-xs font-black uppercase tracking-tight">{error}</p>
            {params?.studentId && (
              <button 
                onClick={() => selectStudent(params.studentId)}
                className="ml-auto px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black hover:bg-rose-700 transition-all"
              >
                RETRY
              </button>
            )}
          </div>
        )}

        {/* ─── Search & Selection Header (Hidden in Direct Mode) ─── */}
        {!params?.studentId && (
          <form onSubmit={handleSearch} className="w-full max-w-lg group">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Admission #, Name, or Phone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-muted border border-border rounded-3xl px-8 py-6 text-lg font-bold outline-none ring-primary/20 transition-all focus:ring-4 focus:bg-background group-hover:border-primary/50"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-3 top-3 bottom-3 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <><Search className="w-4 h-4" /> FIND</>}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 w-full max-w-lg space-y-3">
          {searchResults.map((s) => (
            <button 
              key={s.id}
              onClick={() => selectStudent(s.id)}
              className="w-full flex items-center justify-between p-5 bg-muted/30 border border-border rounded-2xl hover:bg-muted/50 transition-all active:scale-[0.99] group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                  {s.firstName[0]}
                </div>
                <div>
                  <h4 className="font-black text-foreground">{s.firstName} {s.lastName}</h4>
                  <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mt-0.5">#{s.admissionNumber} • {s.academic?.class?.name}-{s.academic?.section?.name}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Main Card */}
          <div className="p-12 bg-white rounded-[3rem] border-4 border-slate-50 shadow-2xl shadow-slate-200/50 print-form-container relative overflow-hidden">
            {/* Visual Decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              {/* Sibling Discovery Bar (Disabled in Individual Audit Mode) */}
              {!params?.studentId && siblings.length > 0 && settlements.length < 5 && (
                <motion.div 
                   initial={{ opacity: 0, y: -20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mb-8 p-6 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border-l-4 border-primary"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Discovery Engine</p>
                        <h4 className="text-sm font-black tracking-tight">Add Siblings to Batch</h4>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    {siblings.filter(sib => !settlements.some(s => s.student.id === sib.id)).map(sib => (
                      <button
                        key={sib.id}
                        onClick={() => addSiblingToBatch(sib.id)}
                        className="flex items-center gap-4 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group active:scale-95"
                      >
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-xs font-black shadow-lg shadow-black/20">
                          {sib.firstName[0]}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold leading-none mb-1 group-hover:text-primary transition-colors">{sib.firstName}</p>
                          <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{sib.academic?.class?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Settlement Batch List */}
              <div className="space-y-12">
                {settlements.map((s, index) => (
                  <div key={s.student.id} className="relative p-8 bg-slate-50/50 rounded-[2.5rem] border-2 border-slate-100">
                    {settlements.length > 1 && (
                      <button 
                        onClick={() => removeStudentFromBatch(s.student.id)}
                        className="absolute top-6 right-6 w-8 h-8 bg-white border border-slate-200 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all z-20"
                      >
                        <AlertCircle className="w-4 h-4 rotate-45" />
                      </button>
                    )}

                    {/* Student Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary border-4 border-slate-50 shadow-sm">
                          <User className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black tracking-tight text-slate-900">{s.student.firstName} {s.student.lastName}</h2>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest opacity-60">#{s.student.admissionNumber}</span>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase tracking-widest">{s.student.academic?.class?.name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-48 space-y-2">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest opacity-50">
                            <span>Settle Progress</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-0.5">
                            <div className={cn("h-full rounded-full transition-all duration-500", 
                              s.student.feeBreakdown?.term3?.isPaid ? "w-full bg-emerald-500" : 
                              s.student.feeBreakdown?.term2?.isPaid ? "w-3/4 bg-amber-500" : 
                              s.student.feeBreakdown?.term1?.isPaid ? "w-1/2 bg-blue-500" : "w-[5%]"
                            )} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Term Selection */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CalendarDays className="w-4 h-4 text-primary" />
                          <h3 className="font-black text-slate-900 uppercase tracking-wider text-[10px]">Select Installments</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {["term1", "term2", "term3"].map(t => {
                            const term = s.student.feeBreakdown[t];
                            if (!term || (term.amount === 0 && s.student.feeBreakdown.paymentType === "Annual")) return null;
                            
                            const isSelected = s.selectedTerms.includes(t);
                            const { amount: lateAmt, daysLate } = term.dueDate ? calculateLateFee(term.dueDate) : { amount: 0, daysLate: 0 };
                            
                            // Sequential Logic
                            let isLocked = false;
                            let lockReason = "";
                            if (t === "term2" && !s.student.feeBreakdown.term1.isPaid && !s.selectedTerms.includes("term1")) {
                              isLocked = true; lockReason = "Pay T1 first";
                            } else if (t === "term3" && ((!s.student.feeBreakdown.term1.isPaid && !s.selectedTerms.includes("term1")) || (!s.student.feeBreakdown.term2.isPaid && !s.selectedTerms.includes("term2")))) {
                              isLocked = true; lockReason = "Pay previous terms";
                            }

                            return (
                              <div 
                                key={t}
                                onClick={() => !term.isPaid && !isLocked && toggleTermForStudent(s.student.id, t)}
                                className={cn(
                                  "relative p-4 rounded-2xl border-2 transition-all cursor-pointer",
                                  term.isPaid ? "bg-emerald-50/50 border-emerald-100 opacity-60 cursor-not-allowed" : 
                                  isLocked ? "bg-slate-100/50 border-slate-100 opacity-40 cursor-not-allowed" :
                                  isSelected ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" : 
                                  "bg-white border-slate-200 hover:border-slate-300"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black",
                                      term.isPaid ? "bg-emerald-500 text-white" : 
                                      isLocked ? "bg-slate-200 text-slate-400" :
                                      isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                      {term.isPaid ? <CheckCircle2 className="w-4 h-4" /> : t.slice(-1)}
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{isLocked ? lockReason : term.label}</p>
                                      <p className="text-sm font-black text-slate-900">{formatCurrency(term.amount)}</p>
                                    </div>
                                  </div>
                                  {!term.isPaid && !isLocked && daysLate > 0 && (
                                    <div className="text-right">
                                      <p className="text-[8px] font-black text-amber-600 uppercase">Late {daysLate}d</p>
                                      <p className="text-[10px] font-black text-rose-600">+{formatCurrency(lateAmt)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary & Waiver per student */}
                      <div className="space-y-4">
                        <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Subtotal</span>
                            <span className="text-slate-900">{formatCurrency(s.selectedTerms.reduce((sum, t) => sum + (s.student.feeBreakdown[t]?.amount || 0), 0))}</span>
                          </div>
                          
                          {/* Student Specific Late Fee Waiver */}
                          {s.selectedTerms.some(t => {
                            const term = s.student.feeBreakdown[t];
                            return term && term.dueDate && !term.isPaid && calculateLateFee(term.dueDate).amount > 0;
                          }) && (
                            <div className="pt-2">
                              <button 
                                onClick={() => updateWaiverForStudent(s.student.id, !s.waivedLateFee)}
                                className={cn(
                                  "w-full px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all mb-2",
                                  s.waivedLateFee ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800"
                                )}
                              >
                                {s.waivedLateFee ? "LATE FEE WAIVED" : "APPLY WAIVER"}
                              </button>
                              {s.waivedLateFee && (
                                <input 
                                  value={s.waiverReason}
                                  onChange={(e) => updateWaiverForStudent(s.student.id, true, e.target.value)}
                                  placeholder="Reason..."
                                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px] font-bold"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Global Footer Aggregation */}
              <div className="mt-12 pt-12 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Payment Method</label>
                    <div className="flex gap-3">
                      {[
                        { id: "Cash", icon: Banknote },
                        { id: "Razorpay", icon: Zap },
                      ].map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setPaymentMode(mode.id)}
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                            paymentMode === mode.id 
                              ? (mode.id === "Razorpay" ? "bg-amber-500 border-amber-600 text-white shadow-xl" : "bg-primary border-primary text-white shadow-xl")
                              : "bg-slate-50 border-slate-100 text-slate-400"
                          )}
                        >
                          <mode.icon className="w-5 h-5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{mode.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMode !== "Cash" && (
                      <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        {paymentMode === "Cheque" ? (
                          <div className="grid grid-cols-2 gap-3">
                            <input placeholder="Cheque No" value={paymentDetails.chequeNo} onChange={(e) => setPaymentDetails({...paymentDetails, chequeNo: e.target.value})} className="bg-white border-slate-200 border rounded-lg p-2 text-[10px] font-bold" />
                            <input placeholder="Bank" value={paymentDetails.bankName} onChange={(e) => setPaymentDetails({...paymentDetails, bankName: e.target.value})} className="bg-white border-slate-200 border rounded-lg p-2 text-[10px] font-bold" />
                          </div>
                        ) : paymentMode === "UPI" ? (
                          <div className="flex gap-3">
                            <input placeholder="TXN Reference" value={paymentDetails.transactionId} onChange={(e) => setPaymentDetails({...paymentDetails, transactionId: e.target.value})} className="bg-white border-slate-200 border rounded-lg p-3 text-[10px] font-bold flex-1" />
                            <button onClick={() => setShowQR(true)} className="px-4 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase">Show QR</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                             {paymentDetails.paymentLink ? (
                               <div className="flex flex-col gap-2">
                                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Active Payment Link Generated</p>
                                  <div className="flex gap-2">
                                     <input readOnly value={paymentDetails.paymentLink} className="flex-1 bg-white border-amber-200 border rounded-xl p-3 text-xs font-mono text-amber-700" />
                                     <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(paymentDetails.paymentLink);
                                          alert("Link Copied to Clipboard!");
                                        }}
                                        className="px-4 bg-amber-500 text-white rounded-xl text-[10px] font-black"
                                     >
                                        COPY
                                     </button>
                                  </div>
                               </div>
                             ) : (
                               <p className="text-[10px] font-medium text-slate-400 italic">Click 'Generate Link' to create a unique Razorpay invoice for this batch.</p>
                             )}
                          </div>
                        )}
                      </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl space-y-4">
                     <div className="flex items-center justify-between opacity-50 text-[10px] font-black uppercase tracking-widest">
                        <span>Net Consolidated Amount</span>
                        <span>{formatCurrency(grandTotal)}</span>
                     </div>
                     <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-widest text-primary">Student Settlement Total</div>
                        <div className="text-4xl font-black tracking-tighter">{formatCurrency(grandTotal)}</div>
                     </div>
                  </div>

                  <button
                    onClick={paymentMode === "Razorpay" ? generateRazorpayLink : processPayment}
                    disabled={collectionLoading || paymentDetails.linkLoading || grandTotal === 0}
                    className={cn(
                      "w-full p-6 rounded-[2rem] font-black text-xl transition-all disabled:opacity-50 flex items-center justify-center gap-4",
                      paymentMode === "Razorpay" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {collectionLoading || paymentDetails.linkLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>{paymentMode === "Razorpay" ? "GENERATE RAZORPAY LINK" : "COMPLETE INDIVIDUAL SETTLEMENT"}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Success Stacks */}
              <AnimatePresence mode="wait">
                {success && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-8">
                     <div className="flex items-center gap-4 p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <div>
                          <h3 className="text-2xl font-black text-emerald-900 tracking-tight">Payment Successful</h3>
                          <p className="text-sm font-bold text-emerald-700 opacity-80">{success.length} Receipts Generated</p>
                        </div>
                        <button onClick={() => setSuccess(null)} className="ml-auto px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black">NEW PAYMENT</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {success.map((res, i) => (
                          <div key={i} className="scale-90 origin-top">
                            <FeeReceipt student={res.student} receipt={res.receipt} />
                          </div>
                        ))}
                     </div>
                  </motion.div>
                )}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-6 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center gap-4">
                    <AlertCircle className="w-6 h-6 text-rose-500" />
                    <p className="font-black text-rose-900 text-sm uppercase tracking-tight">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="mt-8">
            {settlements[0] && (
              <DiscountRoadmap 
                annualTuition={Number(settlements[0].student.financial?.tuitionFee || 0)}
                totalDiscount={Number(settlements[0].student.financial?.totalDiscount || 0)}
                term3Base={Math.round(Number(settlements[0].student.financial?.tuitionFee || 0) * 0.25)}
                term3Net={Number(settlements[0].student.feeBreakdown?.term3?.amount || 0)}
              />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center relative shadow-2xl">
               <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all">
                  <AlertCircle className="w-5 h-5 rotate-45" />
               </button>
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <QrCode className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-black mb-1">Scan to Pay</h3>
               <p className="text-sm opacity-50 mb-8 font-medium">Auto-prefilled for {formatCurrency(grandTotal)}</p>
               
               <div className="aspect-square bg-slate-900 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden mb-8 border-8 border-slate-50">
                  <QrCode className="w-40 h-40 text-white opacity-20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-xl">
                      <span className="text-xl font-black text-emerald-600">V</span>
                    </div>
                  </div>
               </div>

               <p className="text-[10px] font-black uppercase opacity-40 mb-2">UPI String (Verification Only)</p>
               <div className="p-3 bg-muted rounded-xl text-[9px] font-mono break-all opacity-60 mb-8">
                  {generateUPIString({
                    vpa: "virtue-academy@upi",
                    name: "Virtue Academy",
                    amount: grandTotal,
                    reference: settlements[0]?.student.id || "student-payment",
                    note: `Consolidated Fees Settlement`
                  })}
               </div>

               <button onClick={() => setShowQR(false)} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm">CLOSE QR</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-form-container, .print-form-container * { visibility: visible; }
          .print-form-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 2rem;
            border: none;
            box-shadow: none;
          }
          .text-print-hide { display: none !important; }
        }
      `}</style>
    </div>
  );
}
