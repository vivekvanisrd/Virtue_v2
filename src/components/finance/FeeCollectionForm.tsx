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
  Trash2,
  Copy,
  TrendingUp,
  MessageSquare,
  X
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { 
  getStudentFeeStatus, 
  recordFeeCollection, 
  findPotentialSiblings,
  getSchoolInfoAction
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
  
  // --- NEW WORKFLOW STATES ---
  const [step, setStep] = useState<"selection" | "denomination">("selection");
  const [denominations, setDenominations] = useState<Record<number, number>>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });
  const [showParentMsg, setShowParentMsg] = useState(false);
  const [schoolName, setSchoolName] = useState("Virtue Academy");
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

  useEffect(() => {
    async function loadSchool() {
      const res = await getSchoolInfoAction();
      if (res.success && res.name) setSchoolName(res.name);
    }
    loadSchool();
  }, []);

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
      const breakdown = s.student.feeBreakdown;
      
      if (isSelected) {
        // Sequential DESELECTION: If unselecting Term 1, must unselect 2 and 3
        if (termId === "term1") newTerms = newTerms.filter(t => t !== "term1" && t !== "term2" && t !== "term3");
        else if (termId === "term2") newTerms = newTerms.filter(t => t !== "term2" && t !== "term3");
        else newTerms = newTerms.filter(t => t !== termId);
      } else {
        // Sequential SELECTION: If selecting Term 3, must select 1 and 2 (if unpaid)
        if (termId === "term3") {
          if (!breakdown.term1.isPaid && !newTerms.includes("term1")) newTerms.push("term1");
          if (!breakdown.term2.isPaid && !newTerms.includes("term2")) newTerms.push("term2");
        } else if (termId === "term2") {
          if (!breakdown.term1.isPaid && !newTerms.includes("term1")) newTerms.push("term1");
        }
        newTerms.push(termId);
      }
      
      // Filter unique
      return { ...s, selectedTerms: Array.from(new Set(newTerms)) };
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
        // Check standard terms first, then ancillary
        const detail = s.student.feeBreakdown[t] || s.student.feeBreakdown.ancillary?.[t];
        return sum + (detail ? detail.amount : 0);
      }, 0);

      const lateFeeTotal = s.waivedLateFee ? 0 : s.selectedTerms.reduce((sum, t) => {
        const detail = s.student.feeBreakdown[t]; // Only standard terms usually have late fees
        if (detail && detail.dueDate && !detail.isPaid) {
          return sum + calculateLateFee(detail.dueDate).amount;
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

  const tallyTotal = Object.entries(denominations).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);
  const isTallyValid = tallyTotal === grandTotal;

  const generateRazorpayLink = async () => {
    if (settlements.length === 0 || settlements.every(s => s.selectedTerms.length === 0)) return;
    
    setPaymentDetails(prev => ({ ...prev, linkLoading: true }));
    setError(null);

    const primary = settlements[0];
    const total = grandTotal;
    // Terms: store as plain IDs only (term1,term2,term3) — webhook/verify use these to mark isPaid
    const allTerms = settlements.flatMap(s => s.selectedTerms);
    
    const batchPayload = settlements
      .filter(s => s.selectedTerms.length > 0)
      .map(s => {
        const termTotal = s.selectedTerms.reduce((sum, t) => sum + (s.student.feeBreakdown[t]?.amount || 0), 0);
        const lateTotal = s.selectedTerms.reduce((sum, t) => {
          const term = s.student.feeBreakdown[t];
          if (term && term.dueDate && !term.isPaid) return sum + calculateLateFee(term.dueDate).amount;
          return sum;
        }, 0);
        const stTotal = termTotal + (s.waivedLateFee ? 0 : lateTotal);
        return `${s.student.id}:${stTotal}:${s.selectedTerms.join(",")}`;
      })
      .join("|");

    const res = await createPaymentLinkAction({
      amount: total,
      studentId: primary.student.id,
      studentName: `${primary.student.firstName} ${primary.student.lastName}`,
      email: primary.student.guardianEmail || undefined,
      contact: primary.student.guardianPhone || undefined,
      notes: `Payment Settlement for ${settlements.length} items`,
      terms: allTerms,
      baseAmount: total,
      batchPayload
    });

    if (res.success && res.shortUrl) {
      setPaymentDetails(prev => ({ ...prev, paymentLink: res.shortUrl as string }));
      setShowParentMsg(true); // Automatically show the message template
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
      setStep("selection"); // Reset workflow step
      setDenominations({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }); // Reset notes
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

  if (success) {
    return (
      <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto space-y-8">
             <div className="flex items-center gap-4 p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-500/5">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                <div>
                  <h3 className="text-3xl font-black text-emerald-900 tracking-tight">Payment Successful</h3>
                  <p className="text-sm font-bold text-emerald-700 opacity-80">{success.length} Receipts Generated & Recorded</p>
                </div>
                <button 
                  onClick={() => {
                    setSuccess(null);
                    // If we were in direct mode, we might want to stay there or go back to search
                    if (!params?.studentId) setSettlements([]); 
                  }} 
                  className="ml-auto px-8 py-3 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                >
                  NEW SETTLEMENT
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {success.map((res, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.1 }}
                    key={i} 
                    className="origin-top"
                  >
                    <FeeReceipt student={res.student} receipt={res.receipt} />
                  </motion.div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="relative mb-12">
            <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse rounded-full" />
            <div className="w-24 h-24 bg-slate-900 border border-slate-800 rounded-[2.5rem] flex items-center justify-center text-primary relative z-10 shadow-2xl">
              <Wallet className="w-10 h-10" />
            </div>
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-3">Settlement Hub</h2>
        <p className="text-slate-400 text-[10px] max-w-sm font-black uppercase tracking-[0.3em] mb-12 opacity-60 text-center leading-relaxed">
          Initialize secure financial reconciliation by identifying the student profile.
        </p>

        {error && (
          <div className="mb-8 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-600 animate-in zoom-in duration-300 shadow-sm">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
            </div>
            <p className="text-xs font-black uppercase tracking-tight italic">{error}</p>
            {params?.studentId && (
              <button 
                onClick={() => selectStudent(params.studentId)}
                className="ml-auto px-6 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                RETRY
                </button>
            )}
          </div>
        )}

        {/* ─── Search & Selection Header ─── */}
        {!params?.studentId && (
          <form onSubmit={handleSearch} className="w-full max-w-xl group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-[3rem] opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text" 
                placeholder="Admission No, Student Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-[2.5rem] px-10 py-8 text-xl font-black outline-none transition-all focus:border-primary focus:ring-[12px] focus:ring-primary/5 group-hover:border-slate-200 placeholder:text-slate-300 relative z-10 shadow-xl shadow-slate-200/50"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-4 top-4 bottom-4 px-10 bg-slate-900 text-white rounded-[1.75rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 flex items-center gap-3 z-20 shadow-xl shadow-slate-200"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <><Search className="w-4 h-4" /> IDENTIFY</>}
              </button>
            </div>
          </form>
        )}

        <div className="mt-10 w-full max-w-xl space-y-4 relative z-10">
          {searchResults.map((s, idx) => (
            <motion.button 
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => selectStudent(s.id)}
              className="w-full flex items-center justify-between p-6 bg-white/70 backdrop-blur-xl border border-slate-100 rounded-[2rem] hover:bg-white hover:border-primary/30 hover:shadow-2xl hover:shadow-slate-200 transition-all active:scale-[0.98] group text-left"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 font-black shadow-inner group-hover:bg-primary/10 group-hover:text-primary transition-all duration-500">
                   <User className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{s.firstName} {s.lastName}</h4>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-100 px-2 py-0.5 rounded-lg font-mono">#{s.admissionNumber || "NO_ID"}</span>
                     <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg">{s.academic?.class?.name}</span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
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
               {/* 🛒 The Settlement List: Bulk Processing Ledger View */}
               <div className="space-y-12">
                  {settlements.map((s, idx) => (
                    <motion.div 
                      key={s.student.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-slate-50 border border-slate-100 rounded-[3rem] p-10 relative overflow-hidden group"
                    >
                       <div className="absolute top-0 right-0 p-8">
                          <button 
                            onClick={() => {
                              setSettlements(prev => prev.filter(item => item.student.id !== s.student.id));
                              if (params?.studentId === s.student.id) {
                                window.history.back(); // Exit direct mode if first student removed
                              }
                            }}
                            className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm border border-slate-100"
                          >
                             <X className="w-5 h-5" />
                          </button>
                       </div>

                       <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                          <div className="lg:col-span-4 space-y-6">
                             <div className="flex items-center gap-5">
                                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-primary shadow-xl border border-slate-100">
                                   <User className="w-10 h-10" />
                                </div>
                                <div>
                                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">{s.student.firstName} {s.student.lastName}</h3>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full">{s.student.academic?.class?.name}</span>
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">#{s.student.admissionNumber}</span>
                                   </div>
                                </div>
                             </div>

                             <div className="p-6 bg-white rounded-2xl border border-slate-100 space-y-4 shadow-sm">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                   <span>Annual Fee Template</span>
                                   <span className="text-slate-900">{formatCurrency(Number(s.student.financial?.tuitionFee || 0))}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-primary w-2/3" />
                                </div>
                             </div>
                          </div>

                          <div className="lg:col-span-8 space-y-8">
                             {/* Tuition Section */}
                             <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Tuition Installments (Sequential)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                   {Object.entries(s.student.feeBreakdown || {})
                                     .filter(([key]) => key.startsWith("term"))
                                     .map(([key, term]: [string, any]) => {
                                       const isSelected = s.selectedTerms.includes(key);
                                       const isOverdue = term.dueDate && new Date(term.dueDate) < new Date() && !term.isPaid;
                                       
                                       // Sequential Enforcement
                                       const canSelect = key === "term1" || 
                                                       (key === "term2" && (s.student.feeBreakdown.term1.isPaid || s.selectedTerms.includes("term1"))) ||
                                                       (key === "term3" && (s.student.feeBreakdown.term2.isPaid || s.selectedTerms.includes("term2")));

                                       return (
                                         <button 
                                           key={key}
                                           disabled={term.isPaid || !canSelect}
                                           onClick={() => toggleTermForStudent(s.student.id, key)}
                                           className={cn(
                                             "p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden",
                                             term.isPaid 
                                               ? "bg-emerald-50 border-emerald-100 opacity-60 cursor-not-allowed"
                                               : isSelected 
                                                 ? "bg-white border-primary shadow-xl shadow-primary/10 -translate-y-1"
                                                 : !canSelect
                                                   ? "bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed grayscale"
                                                   : "bg-white border-slate-100 hover:border-slate-200"
                                           )}
                                         >
                                            {isSelected && (
                                              <div className="absolute top-4 right-4 text-primary">
                                                 <CheckCircle2 className="w-5 h-5" />
                                              </div>
                                            )}
                                            <div className="space-y-1">
                                               <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{term.label || key.replace("term", "Term ")}</p>
                                               <p className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(term.amount)}</p>
                                               <div className="flex items-center gap-2">
                                                  {term.isPaid ? (
                                                    <span className="text-[8px] font-black uppercase text-emerald-600">Settled</span>
                                                  ) : (
                                                    <span className={cn(
                                                      "text-[8px] font-black uppercase",
                                                      isOverdue ? "text-rose-600" : "text-slate-400"
                                                    )}>
                                                      {term.dueDate ? new Date(term.dueDate).toLocaleDateString() : "No Date"}
                                                    </span>
                                                  )}
                                               </div>
                                            </div>
                                         </button>
                                       );
                                   })}
                                </div>
                             </div>

                             {/* Ancillary Fees Section */}
                             {Object.keys(s.student.feeBreakdown?.ancillary || {}).length > 0 && (
                                <div className="space-y-3">
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">Other Collections</p>
                                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                      {Object.entries(s.student.feeBreakdown.ancillary).map(([key, fee]: [string, any]) => {
                                        const isSelected = s.selectedTerms.includes(key);
                                        return (
                                          <button 
                                            key={key}
                                            disabled={fee.isPaid}
                                            onClick={() => toggleTermForStudent(s.student.id, key)}
                                            className={cn(
                                              "p-5 rounded-[1.75rem] border-2 transition-all text-left relative overflow-hidden",
                                              fee.isPaid 
                                                ? "bg-emerald-50 border-transparent opacity-60"
                                                : isSelected 
                                                  ? "bg-white border-primary shadow-lg shadow-primary/5"
                                                  : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                          >
                                             <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 truncate">{fee.label}</p>
                                                <p className="text-lg font-black text-slate-900 tracking-tight">{formatCurrency(fee.amount)}</p>
                                                {fee.isPaid && <span className="text-[8px] font-black uppercase text-emerald-600">Paid</span>}
                                             </div>
                                          </button>
                                        );
                                      })}
                                   </div>
                                </div>
                             )}

                             {/* Metadata Summary Footer */}
                             <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
                                <div className="flex gap-8">
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Discount</p>
                                      <p className="text-sm font-black text-slate-900">{formatCurrency(s.student.feeBreakdown.totalDiscount)}</p>
                                   </div>
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Annual Net</p>
                                      <p className="text-sm font-black text-indigo-600">{formatCurrency(s.student.feeBreakdown.annualNet)}</p>
                                   </div>
                                   <div className="space-y-0.5">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Type</p>
                                      <p className="text-sm font-black text-slate-900">{s.student.feeBreakdown.paymentType}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Selection Total</p>
                                   <p className="text-2xl font-black text-slate-900">
                                      {formatCurrency(s.selectedTerms.reduce((sum, t) => {
                                        const detail = s.student.feeBreakdown[t] || s.student.feeBreakdown.ancillary?.[t];
                                        return sum + (detail?.amount || 0);
                                      }, 0))}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </motion.div>
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

                  {paymentMode === "Razorpay" && (
                      <div className="grid grid-cols-1 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
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
                      </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl space-y-4">
                     <div className="flex items-center justify-between opacity-50 text-[10px] font-black uppercase tracking-widest">
                        <span>Net Account Balance</span>
                        <span>{formatCurrency(grandTotal)}</span>
                     </div>
                     <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-widest text-primary">Student Settlement Total</div>
                        <div className="text-4xl font-black tracking-tighter">{formatCurrency(grandTotal)}</div>
                     </div>
                  </div>

                  <button
                    onClick={() => {
                      if (paymentMode === "Razorpay") {
                        generateRazorpayLink();
                      } else if (paymentMode === "Cash") {
                        setStep("denomination");
                      } else {
                        processPayment();
                      }
                    }}
                    disabled={collectionLoading || paymentDetails.linkLoading || grandTotal === 0}
                    className={cn(
                      "w-full p-6 rounded-[2rem] font-black text-xl transition-all disabled:opacity-50 flex items-center justify-center gap-4",
                      paymentMode === "Razorpay" ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {collectionLoading || paymentDetails.linkLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>{paymentMode === "Razorpay" ? "GENERATE RAZORPAY LINK" : "COLLECT FEE"}</>
                    )}
                  </button>
                </div>
              </div>

                <AnimatePresence mode="wait">
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

      <AnimatePresence mode="wait">
        {step === "denomination" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white rounded-[3rem] p-10 max-w-xl w-full relative shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mt-10 -mr-10" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Cash Denomination</h3>
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none">Verify Physical Currency Tally</p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep("selection")} 
                  className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  Close & Back
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                 {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(note => (
                   <div key={note} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 text-center text-xs font-black text-slate-400">₹{note}</div>
                      <input 
                        type="number"
                        min="0"
                        value={denominations[note] || ""}
                        onChange={(e) => setDenominations(prev => ({ ...prev, [note]: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        placeholder="0"
                      />
                   </div>
                 ))}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center opacity-40 text-[10px] font-black uppercase tracking-widest mb-1">
                   <span>Fee Amount Due</span>
                   <span className="text-slate-900">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between items-end">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculated Tally</p>
                   <p className={cn("text-3xl font-black tracking-tighter", isTallyValid ? "text-emerald-600" : "text-rose-600")}>
                     {formatCurrency(tallyTotal)}
                   </p>
                </div>
                {!isTallyValid && (
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-tight italic">
                    <AlertCircle className="w-4 h-4" />
                    Needs to match {formatCurrency(grandTotal)}
                  </div>
                )}
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min((tallyTotal/grandTotal)*100, 100)}%` }}
                     className={cn("h-full", isTallyValid ? "bg-emerald-500" : "bg-primary")}
                   />
                </div>
              </div>

              <button 
                disabled={!isTallyValid || collectionLoading}
                onClick={processPayment}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {collectionLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <><CheckCircle2 className="w-4 h-4" /> CONFIRM & RECEIVE</>}
              </button>
            </motion.div>
          </div>
        )}

        {showParentMsg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full relative shadow-2xl">
               <div className="flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-6">
                   <MessageSquare className="w-10 h-10" />
                 </div>
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Parent Message</h3>
                 <p className="text-sm opacity-50 mb-8 font-medium italic">Professional payment link generated and ready for sharing.</p>
                 
                 <div className="w-full bg-slate-900 text-slate-300 p-8 rounded-[2.5rem] text-left text-xs font-bold leading-relaxed mb-8 relative group">
                    <p className="opacity-80">
                      Hi Parent,<br/><br/>
                      Greetings from <span className="text-white font-black">{schoolName}</span>.<br/>
                      The school fee for <span className="text-white font-black">{settlements[0]?.student.firstName}</span> regarding <span className="text-primary font-black">{settlements[0]?.selectedTerms.join(", ").toUpperCase()}</span> is due.<br/><br/>
                      Total Amount: <span className="text-primary text-lg font-black">{formatCurrency(grandTotal)}</span><br/><br/>
                      Please pay securely using the link below:<br/>
                      <span className="text-blue-400 break-all underline decoration-slate-700">{paymentDetails.paymentLink}</span><br/><br/>
                      Thank you.
                    </p>
                 </div>

                 <button 
                    onClick={() => {
                      const msg = `Hi Parent,\nGreetings from ${schoolName}.\nThe school fee for ${settlements[0]?.student.firstName} regarding ${settlements[0]?.selectedTerms.join(", ").toUpperCase()} is due.\nTotal Amount: ${formatCurrency(grandTotal)}\nPlease pay securely at: ${paymentDetails.paymentLink}\nThank you.`;
                      navigator.clipboard.writeText(msg);
                      alert("Message Copied to Clipboard!");
                    }}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-primary/20"
                 >
                    <Copy className="w-4 h-4" /> COPY PARENT MESSAGE
                 </button>
                 <button onClick={() => setShowParentMsg(false)} className="mt-4 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">CLOSE</button>
               </div>
            </motion.div>
          </div>
        )}

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
                    note: `Fees Settlement`
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
