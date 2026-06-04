"use client";

import React, { useState, useEffect, useRef } from "react";
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
  X,
  ShieldCheck,
  Bus,
  BookOpen,
  Monitor,
  FileText,
  Dribbble,
  Activity,
  Shirt,
  Package
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

export function FeeCollectionForm({ params }: { params?: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  interface Settlement {
    student: any;
    selectedTerms: string[];
    waivedLateFee: boolean;
    waiverReason: string;
    adHocAmounts: Record<string, number>;
  }
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  
  const [loading, setLoading] = useState(!!params?.studentId);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [success, setSuccess] = useState<any[] | null>(null); 
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState<"selection" | "denomination">("selection");
  const [denominations, setDenominations] = useState<Record<number, number>>({
    500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });
  const [showParentMsg, setShowParentMsg] = useState(false);
  const [schoolName, setSchoolName] = useState("PaVa-EDUX Institution");
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
  const { setTabDirty, openTab } = useTabs();
  const loadedStudentIdRef = useRef<string | null>(null);
 
   useEffect(() => {
     const isDirty = settlements.some(s => s.selectedTerms.length > 0) || 
                   paymentDetails.transactionId !== "" || 
                   paymentDetails.chequeNo !== "";
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
 
   useEffect(() => {
     if (params?.studentId) {
       if (params.studentId !== loadedStudentIdRef.current) {
         selectStudent(params.studentId);
       }
     }
   }, [params?.studentId]);
 
   const selectStudent = async (id: string) => {
     loadedStudentIdRef.current = id;
     setLoading(true);
     setError(null);
     setSuccess(null);
     setSearchTerm("");
     setSearchResults([]);
     setSettlements([]); 
     try {
       const result = await getStudentFeeStatus(id);
       if (result.success && result.data) {
         setSettlements([{
           student: result.data,
           selectedTerms: [],
           waivedLateFee: false,
           waiverReason: "",
           adHocAmounts: {}
         }]);
         openTab({
           id: "fee-collection",
           title: "Fee Collection",
           icon: Wallet,
           component: "Finance",
           params: { studentId: id }
         });
       } else {
         setError(result.error || "Failed to retrieve student profile.");
         loadedStudentIdRef.current = null;
         openTab({
           id: "fee-collection",
           title: "Fee Collection",
           icon: Wallet,
           component: "Finance",
           params: {}
         });
       }
     } catch (err: any) {
       setError("An unexpected error occurred.");
       loadedStudentIdRef.current = null;
       openTab({
         id: "fee-collection",
         title: "Fee Collection",
         icon: Wallet,
         component: "Finance",
         params: {}
       });
     }
     setLoading(false);
   };

  const toggleTermForStudent = (studentId: string, termId: string) => {
    setSettlements(prev => prev.map(s => {
      if (s.student.id !== studentId) return s;
      const isSelected = s.selectedTerms.includes(termId);
      let newTerms = [...s.selectedTerms];
      const fb = s.student.feeBreakdown;
      if (isSelected) {
        if (termId === "term1") newTerms = newTerms.filter(t => t !== "term1" && t !== "term2" && t !== "term3");
        else if (termId === "term2") newTerms = newTerms.filter(t => t !== "term2" && t !== "term3");
        else newTerms = newTerms.filter(t => t !== termId);
      } else {
        if (termId === "term3") {
          if (!fb.term1.isPaid && !newTerms.includes("term1")) newTerms.push("term1");
          if (!fb.term2.isPaid && !newTerms.includes("term2")) newTerms.push("term2");
        } else if (termId === "term2") {
          if (!fb.term1.isPaid && !newTerms.includes("term1")) newTerms.push("term1");
        }
        newTerms.push(termId);
      }
      return { ...s, selectedTerms: Array.from(new Set(newTerms)) };
    }));
  };

  const totals = (() => {
    return settlements.reduce((acc, s) => {
      const termTotal = s.selectedTerms.reduce((sum, t) => {
        const detail = s.student.feeBreakdown[t] || s.student.feeBreakdown.ancillary?.[t];
        const val = (detail?.amount === 0 && s.adHocAmounts[t]) ? s.adHocAmounts[t] : (detail?.amount || 0);
        return sum + val;
      }, 0);
      const lateTotal = s.waivedLateFee ? 0 : s.selectedTerms.reduce((sum, t) => {
        const detail = s.student.feeBreakdown[t];
        if (detail && detail.dueDate && !detail.isPaid) return sum + calculateLateFee(detail.dueDate).amount;
        return sum;
      }, 0);
      return { terms: acc.terms + termTotal, lateFees: acc.lateFees + lateTotal };
    }, { terms: 0, lateFees: 0 });
  })();

  const grandTotal = totals.terms + totals.lateFees;
  const tallyTotal = Object.entries(denominations).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);
  const isTallyValid = tallyTotal === grandTotal;

  const getParentMessage = () => {
    if (!settlements[0]) return "";
    const s = settlements[0].student;
    const selectedLabels = settlements[0].selectedTerms.map(t => {
      const fee = fb[t] || fb.ancillary?.[t];
      return `${fee?.label || t}`;
    }).join(", ");
    
    let message = `Hi Parent,\n\nGreetings from ${schoolName}.\nThe school fee for ${s.firstName} regarding ${selectedLabels} is due.\n\n`;
    
    // 📊 SHOW TOTAL VS FINAL (Sovereign Rule 5.1)
    if (fb.totalDiscount > 0) {
       message += `Original Fee: ${formatCurrency(Number(fb.annualNet) + Number(fb.totalDiscount))}\n`;
       message += `Discount Applied: ${formatCurrency(fb.totalDiscount)}\n`;
       message += `Final Payable: ${formatCurrency(fb.annualNet)}\n\n`;
       message += `Note: Discount is applied on total fee but adjusted in the final installment.\n\n`;
    }
    
    message += `Total Amount Due Now: ${formatCurrency(grandTotal)}\n\n`;
    message += `Please pay securely using the link below:\n${paymentDetails.paymentLink}\n\nThank you.`;
    
    return message;
  };

  const processPayment = async () => {
    if (settlements.length === 0 || settlements.every(s => s.selectedTerms.length === 0)) return;
    setCollectionLoading(true);
    if (paymentMode === "Razorpay" && !paymentDetails.transactionId) {
      setError("Please enter the Razorpay Payment ID to proceed.");
      setCollectionLoading(false);
      return;
    }
    const result = await recordFeeCollection({
      studentId: settlements[0].student.id,
      selectedTerms: settlements[0].selectedTerms,
      amountPaid: totals.terms,
      lateFeePaid: totals.lateFees,
      lateFeeWaived: settlements[0].waivedLateFee,
      paymentMode,
      paymentReference: paymentMode === "Cash" ? "" : paymentDetails.transactionId
    });
    if (result.success) {
      setSuccess([{ student: settlements[0].student, receipt: result.data }]);
      setSettlements([]); setStep("selection");
    } else {
      setError(result.error || "Settlement failed.");
    }
    setCollectionLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
           <div className="p-6 bg-emerald-500 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                 <CheckCircle2 className="w-10 h-10" />
                 <div><h2 className="text-2xl font-black">Settlement Complete</h2><p className="opacity-80 font-bold uppercase tracking-widest text-[8px] mt-0.5">Success</p></div>
              </div>
               <button 
                 onClick={() => {
                   setSuccess(null);
                   loadedStudentIdRef.current = null;
                   openTab({
                     id: "fee-collection",
                     title: "Fee Collection",
                     icon: Wallet,
                     component: "Finance",
                     params: {}
                   });
                 }} 
                 className="px-6 py-2 bg-white text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest"
               >
                 New Payment
               </button>
           </div>
           <FeeReceipt student={success[0].student} receipt={success[0].receipt} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center space-y-4">
         <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
         </div>
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Loading Student Ledger...</p>
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-slate-50 p-4 rounded-[3rem]">
        <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-primary mb-8 shadow-xl shadow-primary/10"><Wallet className="w-8 h-8" /></div>
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 mb-1">POS Hub V2.5</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Identify student to start collection</p>
        
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold w-full max-w-lg text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); selectStudent(searchTerm); }} className="w-full max-w-lg">
           <div className="relative">
              <input type="text" placeholder="Admission No..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-2 border-white rounded-[2rem] px-8 py-6 text-xl font-black outline-none focus:border-primary shadow-xl shadow-slate-200" />
              <button type="submit" className="absolute right-3 top-3 bottom-3 px-8 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest">Search</button>
           </div>
        </form>
      </div>
    );
  }


  const student = settlements[0].student;
  const fb = student.feeBreakdown;
  const totalPaid = (student.collections || []).reduce((sum: number, c: any) => sum + Number(c.amountPaid || 0), 0);
  const paidPercent = fb.annualNet > 0 ? (totalPaid / fb.annualNet) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] p-4 animate-in fade-in duration-500">
      <div className="max-w-[1440px] mx-auto w-full space-y-4">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {/* 🏆 COMPACT TOP SECTION */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-white">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-4 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg border border-slate-50 flex items-center justify-center text-slate-900"><User className="w-8 h-8" /></div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 leading-none mb-1">{student.firstName} {student.lastName}</h2>
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-full">{student.academic?.class?.name || "8th Grade"}</span>
                </div>
                <button 
                  onClick={() => {
                    setSettlements([]);
                    loadedStudentIdRef.current = null;
                    openTab({
                      id: "fee-collection",
                      title: "Fee Collection",
                      icon: Wallet,
                      component: "Finance",
                      params: {}
                    });
                  }} 
                  className="ml-auto w-8 h-8 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm space-y-2">
                <div className="flex items-center justify-between"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Annual Fee Template</p><p className="text-[10px] font-black text-slate-900">₹{(fb.annualNet || 0).toLocaleString()}</p></div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-primary/40 rounded-full" style={{ width: `${Math.min(100, Math.max(0, paidPercent))}%` }} /></div>
              </div>
            </div>
            <div className="col-span-8">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-3">Tuition Installments (Sequential)</p>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => {
                  const key = `term${i}`;
                  const term = fb[key];
                  const isSelected = settlements[0].selectedTerms.includes(key);
                  const canSelect = i === 1 || (fb[`term${i-1}`]?.isPaid || settlements[0].selectedTerms.includes(`term${i-1}`));
                  return (
                      <button key={key} disabled={term.isPaid || !canSelect} onClick={() => toggleTermForStudent(student.id, key)} className={cn("p-4 rounded-3xl border-2 text-left relative h-28 flex flex-col justify-center transition-all", term.isPaid ? "bg-white border-slate-50 opacity-40" : isSelected ? "bg-white border-primary shadow-lg ring-4 ring-primary/5 scale-[1.02]" : !canSelect ? "bg-slate-50 border-slate-50 opacity-40" : "bg-white border-slate-50 hover:border-slate-100")}>
                        {isSelected && <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-primary animate-in zoom-in" />}
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{term.label || `Term ${i}`}</p>
                        
                        {key === "term3" && fb.totalDiscount > 0 ? (
                           <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-slate-300 line-through tracking-tighter italic leading-none">₹{( (term.amount || 0) + (fb.totalDiscount || 0) ).toLocaleString()}</p>
                              <p className="text-xl font-black text-emerald-600 tracking-tighter leading-none">₹{(term.amount || 0).toLocaleString()}</p>
                           </div>
                        ) : (
                           <p className="text-xl font-black text-slate-900 tracking-tighter">₹{(term.amount || 0).toLocaleString()}</p>
                        )}
                        <p className="text-[7px] font-black uppercase text-slate-300 mt-1">10/06/2026</p>
                      </button>
                    );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-50">
            <div><p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Total Discount</p><p className="text-sm font-black text-slate-900 italic">₹{(fb.totalDiscount || 0).toLocaleString()}</p></div>
            <div><p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Annual Net</p><p className="text-lg font-black text-primary tracking-tight italic">₹{(fb.annualNet || 0).toLocaleString()}</p></div>
            <div><p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Payment Type</p><p className="text-sm font-black text-slate-900 italic">{fb.paymentType}</p></div>
            <div className="text-right"><p className="text-[8px] font-black uppercase text-primary mb-0.5">Selection Total</p><p className="text-2xl font-black text-slate-900 tracking-tighter italic">₹{(grandTotal || 0).toLocaleString()}</p></div>
          </div>
        </div>

        {/* 🚀 COMPACT POS EXTENSIONS */}
        <div className="space-y-4 pt-2">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2 italic">Point-of-Sale (POS) Extensions</p>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(fb.ancillary).map(([key, fee]: [string, any]) => {
               const isSelected = settlements[0].selectedTerms.includes(key);
               const Icon = key === "transportFee" ? Bus : key === "libraryFee" ? BookOpen : key === "sportsFee" ? Dribbble : key === "booksFee" ? Package : key === "uniformFee" ? Shirt : Activity;
               return (
                  <div key={key} onClick={() => !fee.isPaid && toggleTermForStudent(student.id, key)} className={cn("p-4 rounded-3xl border-2 transition-all cursor-pointer relative flex items-center gap-4", fee.isPaid ? "bg-white border-slate-50 opacity-40 grayscale" : isSelected ? "bg-white border-primary shadow-xl ring-4 ring-primary/5 -translate-y-1" : "bg-white border-slate-50 hover:border-slate-100 hover:shadow-md")}>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all", isSelected ? "bg-primary text-white" : "bg-slate-50 text-slate-300")}><Icon className="w-6 h-6" /></div>
                    <div className="flex-1"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">{fee.label}</p><p className="text-lg font-black text-slate-900 tracking-tighter">₹{(fee.amount || 0).toLocaleString()}</p></div>
                  </div>
               );
            })}
          </div>
        </div>

        {/* 💳 COMPACT PAYMENT GATEWAY */}
        <div className="grid grid-cols-12 gap-8 items-start pt-2 pb-8">
          <div className="col-span-6 space-y-4">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Method</p>
            <div className="flex gap-4">
              {["Cash", "Razorpay"].map(m => (
                <button key={m} onClick={() => setPaymentMode(m)} className={cn("flex-1 px-4 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all flex flex-col items-center gap-2 border-2", paymentMode === m ? (m === "Cash" ? "bg-white border-slate-100 text-slate-900 shadow-lg" : "bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/20") : "bg-slate-50 border-slate-50 text-slate-300 hover:bg-white")}>{m === "Cash" ? <Banknote className="w-6 h-6 opacity-40" /> : <Zap className="w-6 h-6" />}{m}</button>
              ))}
            </div>
            
            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic text-[9px] text-slate-400 leading-relaxed animate-in fade-in">
              Click 'Generate Link' to create a unique Razorpay invoice for this batch.
            </div>

            {paymentMode === "Razorpay" && paymentDetails.paymentLink && (
              <div className="animate-in fade-in slide-in-from-top-4 space-y-2">
                <div className="bg-white rounded-3xl p-6 border border-orange-100 space-y-3 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-widest text-orange-600">Active Payment Link Generated</p>
                  <div className="flex gap-2">
                    <input readOnly value={paymentDetails.paymentLink} className="flex-1 bg-white border border-orange-100 rounded-xl px-4 py-3 text-[10px] font-black text-orange-700 outline-none" />
                    <button onClick={() => { navigator.clipboard.writeText(paymentDetails.paymentLink); alert("Link Copied!"); }} className="bg-orange-500 text-white px-6 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-orange-500/10">Copy</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-span-6 space-y-4">
            <div className="bg-[#101420] rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 blur-3xl rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000" />
              <div className="flex items-center justify-between mb-8 opacity-40"><p className="text-[8px] font-black uppercase tracking-widest">Net Account Balance</p><p className="text-[9px] font-black">₹{(grandTotal || 0).toLocaleString()}</p></div>
              <div className="flex items-end justify-between relative z-10"><p className="text-[8px] font-black uppercase tracking-widest text-primary italic">Student Settlement Total</p><p className="text-5xl font-black tracking-tighter">₹{(grandTotal || 0).toLocaleString()}</p></div>
            </div>
            <button 
              onClick={async () => {
                if (paymentMode === "Razorpay") {
                  console.log("🚀 INITIALIZING RAZORPAY LINK GENERATION:", { studentId: student.id, amount: grandTotal });
                  setPaymentDetails(p => ({ ...p, linkLoading: true }));
                  try {
                    const result = await createPaymentLinkAction({ 
                      studentId: student.id, 
                      studentName: `${student.firstName} ${student.lastName}`,
                      amount: grandTotal, 
                      terms: settlements[0].selectedTerms,
                      notes: `Fee Settlement for ${student.firstName}`,
                      email: student.parentEmail || undefined,
                      contact: student.parentPhone || undefined
                    });
                    console.log("✅ RAZORPAY ACTION RESPONSE:", result);
                    if (result.success) {
                      setPaymentDetails(p => ({ ...p, paymentLink: result.shortUrl, linkLoading: false }));
                      setShowParentMsg(true);
                    } else {
                      console.error("❌ RAZORPAY GENERATION FAILED:", result.error);
                      setError(result.error || "Failed to generate link.");
                      setPaymentDetails(p => ({ ...p, linkLoading: false }));
                    }
                  } catch (err: any) {
                    console.error("💥 CRITICAL RAZORPAY ERROR:", err);
                    setError("Critical failure in payment gateway.");
                    setPaymentDetails(p => ({ ...p, linkLoading: false }));
                  }
                } else setStep("denomination");
              }} 
              disabled={grandTotal === 0 || collectionLoading} 
              className="w-full py-6 bg-orange-500 text-white rounded-[2.5rem] font-black text-lg uppercase tracking-widest shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {collectionLoading || paymentDetails.linkLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (paymentMode === "Cash" ? "Process Cash Settlement" : "GENERATE RAZORPAY LINK")}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showParentMsg && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#101420]/95 backdrop-blur-2xl p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl border-[12px] border-white text-center">
              <div className="flex flex-col items-center gap-6 mb-10">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-4xl font-black tracking-tight text-slate-900">Parent Message</h3>
                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2">Professional payment link generated and ready for sharing.</p>
                </div>
              </div>
              
              <div className="bg-[#101420] p-10 rounded-[2.5rem] border border-slate-800 mb-10 text-left relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
                <div className="whitespace-pre-line text-sm font-black text-slate-400 italic leading-relaxed relative z-10">
                  {getParentMessage().split('\n').map((line, i) => (
                    <span key={i}>
                      {line.includes("₹") ? <span className="text-blue-400">{line}</span> : line.includes("https://") ? <span className="text-blue-500 underline">{line}</span> : line}
                      <br/>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <button onClick={() => { navigator.clipboard.writeText(getParentMessage()); alert("Parent Message Copied!"); }} className="w-full py-8 bg-[#3BAFDA] text-white rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4">
                  <Copy className="w-6 h-6" />
                  COPY PARENT MESSAGE
                </button>
                <button onClick={() => setShowParentMsg(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">CLOSE</button>
              </div>
            </motion.div>
          </div>
        )}

        {step === "denomination" && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101420]/95 backdrop-blur-2xl p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-8 max-w-3xl w-full shadow-2xl border-8 border-white">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner"><Banknote className="w-6 h-6" /></div>
                       <div><h3 className="text-2xl font-black tracking-tight text-slate-900">Cash Denomination</h3><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Verify Physical Currency Tally</p></div>
                    </div>
                    <button onClick={() => setStep("selection")} className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 transition-all"><X className="w-4 h-4" /></button>
                 </div>
                 <div className="grid grid-cols-3 gap-4 mb-8">
                    {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(n => (
                       <div key={n} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-2">
                          <span className="font-black text-slate-300 text-[10px]">₹{n}</span>
                          <input type="number" placeholder="0" value={denominations[n] || ""} onChange={(e) => setDenominations(p => ({ ...p, [n]: parseInt(e.target.value) || 0 }))} className="w-full bg-white border-2 border-slate-100 rounded-xl p-3 font-black text-xl outline-none focus:border-primary transition-all" />
                       </div>
                    ))}
                 </div>
                 <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100"><p className="text-[8px] font-black uppercase text-slate-400 mb-1">Fee Due</p><p className="text-3xl font-black text-slate-900 tracking-tighter">₹{(grandTotal || 0).toLocaleString()}</p></div>
                    <div className={cn("p-6 rounded-[2rem] border-2 transition-all flex flex-col justify-center", isTallyValid ? "bg-emerald-50 border-emerald-500/20" : "bg-rose-50 border-rose-500/20")}><p className="text-[8px] font-black uppercase opacity-40 mb-1">Tally</p><p className={cn("text-3xl font-black tracking-tighter", isTallyValid ? "text-emerald-500" : "text-rose-500")}>₹{(tallyTotal || 0).toLocaleString()}</p></div>
                 </div>
                 <button disabled={!isTallyValid || collectionLoading} onClick={processPayment} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl uppercase tracking-widest shadow-2xl disabled:opacity-50 transition-all active:scale-95">{collectionLoading ? <Loader2 className="w-8 h-8 animate-spin mx-auto" /> : "Confirm & Receive"}</button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
