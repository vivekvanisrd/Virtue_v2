"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Plus,
  Users,
  Search,
  ArrowRight,
  ShieldCheck,
  Loader2,
  TrendingUp,
  Download,
  CalendarDays,
  Zap,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FeeReceipt } from "./FeeReceipt";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { supabase } from "@/lib/supabase/client";
import { 
  getStudentFeeStatus, 
  findPotentialSiblings, 
  createRazorpayOrderAction, 
  verifyRazorpayPaymentAction, 
  generatePaymentLinkAction,
  getRazorpayReport
} from "@/lib/actions/finance-actions";
import { QRCodeSVG } from "qrcode.react";
import RazorpayPaymentReport from "./RazorpayPaymentReport";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface StudentFinancialHubProps {
  studentId: string;
}

export function StudentFinancialHub({ studentId }: StudentFinancialHubProps) {
  const [view, setView] = useState<'hub' | 'audit'>('hub');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<string[]>([]);
  const [activeTerm, setActiveTerm] = useState<string>("term1");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [payTarget, setPayTarget] = useState<{termId: string, amount: number} | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const loadData = async () => {
    if (view === 'audit') return; // Skip student data in audit view
    setLoading(true);
    const [res, sibs] = await Promise.all([
      getStudentFeeStatus(studentId),
      findPotentialSiblings(studentId)
    ]);
    
    if (res.success) setStudentData(res.data);
    if (sibs.success) setSiblings(sibs.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [studentId, view]);

  // ─── REAL-TIME SYNC (Lightning Speed) ───
  useEffect(() => {
    if (!studentId) return;
    
    // Subscribe to NEW collections for this student
    const channel = supabase
      .channel(`student_fin_${studentId}`)
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'Collection',
          filter: `studentId=eq.${studentId}` 
        }, 
        () => {
          // Trigger a silent re-fetch when a remote payment is detected
          loadData(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [studentId]);

  // Dynamically load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handlePayInitiate = (termId: string, amount: number) => {
    setPayTarget({ termId, amount });
    setIsPayModalOpen(true);
  };

  const handleShareLink = async (termId: string) => {
    const res = await generatePaymentLinkAction(studentId, termId);
    if (res.success && res.url) {
      await navigator.clipboard.writeText(res.url);
      setCopiedLink(termId);
      setTimeout(() => setCopiedLink(null), 3000);
    }
  };

  const handleRazorpayCheckout = async () => {
    if (!payTarget || !studentData) return;
    setProcessing(true);

    try {
      const baseAmount = payTarget.amount;
      const gatewayFee = baseAmount * 0.015;
      const gst = gatewayFee * 0.18;
      const totalFee = gatewayFee + gst;

      const orderRes = await createRazorpayOrderAction({
        amountPaid: baseAmount,
        studentId: studentData.id,
        selectedTerms: [payTarget.termId]
      });

      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.error || "Order generation failed.");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "PaVa-EDUX Education",
        description: `Fee Payment - ${payTarget.termId.toUpperCase()}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          const verifyRes = await verifyRazorpayPaymentAction({
            ...response,
            studentId: studentData.id,
            selectedTerms: [payTarget.termId],
            amountPaid: baseAmount,
            lateFeePaid: 0,
            convenienceFee: totalFee
          });

          if (verifyRes.success) {
            setSuccess(verifyRes.data);
          } else {
            alert("Verification Failed: " + verifyRes.error);
          }
        },
        prefill: {
          name: `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email || "",
          contact: studentData.phone || ""
        },
        theme: { color: "#0047ab" }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (view === 'audit') {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-12">
        <RazorpayPaymentReport onBack={() => setView('hub')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 animate-pulse">
        <div className="text-center space-y-4">
          <Wallet className="w-12 h-12 text-blue-600/20 mx-auto" />
          <p className="text-xs font-black uppercase tracking-widest text-[var(--foreground)]/20">Initializing Wallet...</p>
        </div>
      </div>
    );
  }

  if (!studentData) return <div>Failed to load financial profile.</div>;

  const outstanding = (Number(studentData.financial?.netTuition) || 0) - (studentData.paidTotal || 0);

  if (success) {
    return (
      <div className="flex flex-col h-full bg-slate-50 animate-in fade-in zoom-in duration-500 overflow-y-auto min-h-[600px] border border-slate-200 rounded-[3.5rem] mt-6">
        <div className="flex-1 p-12">
          <div className="max-w-4xl mx-auto space-y-12 pb-20">
             <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-xl shadow-emerald-500/5">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
                   <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-emerald-900 tracking-tight">Payment Successful</h2>
                  <p className="text-emerald-700/70 font-bold uppercase text-[10px] tracking-widest mt-1">Order Settled & Recorded</p>
                </div>
                <button 
                  onClick={() => {
                    setSuccess(null);
                    setPayTarget(null);
                    window.location.reload();
                  }}
                  className="ml-auto px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl"
                >
                  FINISH RECONCILIATION
                </button>
             </div>
             
             <FeeReceipt student={success.student} receipt={success.receipt} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* ─── BALANCE HUD ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 [background:var(--sidebar-bg)] text-white p-12 rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] relative overflow-hidden group border border-white/5 transition-colors duration-500">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full -mr-32 -mt-32 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[100px] rounded-full -ml-20 -mb-20" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Secure Sovereign Wallet</span>
                  </div>
                  
                  <button 
                    onClick={() => setView('audit')}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-3 backdrop-blur-md active:scale-95 group"
                  >
                    <Zap className="w-4 h-4 text-amber-400 group-hover:animate-bounce" />
                    Digital Audit Registry
                  </button>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-black text-white/40 uppercase tracking-[0.4em] ml-1">Total Outstanding</p>
                <h2 className="text-6xl lg:text-7xl font-black italic tracking-tighter mb-10 tabular-nums flex items-baseline gap-2">
                  <span className="text-3xl font-normal not-italic text-white/30 mr-1">₹</span>
                  {formatCurrency(outstanding).replace('₹', '')}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-6 mt-auto">
               <button 
                 onClick={() => handlePayInitiate("term1", studentData.financial?.term1Amount)}
                 className="px-10 py-5 bg-accent text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_20px_40px_rgba(255,153,51,0.2)] hover:scale-[1.05] transition-all duration-300 active:scale-95 group italic"
               >
                  <CreditCard className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  Settle Installment
               </button>
               <button className="px-10 py-5 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 backdrop-blur-md">
                  <Download className="w-4 h-4" />
                  Export Ledger
               </button>
            </div>
          </div>
        </div>

        {/* ─── QUICK STATS ─── */}
        <div className="bg-white/70 backdrop-blur-3xl p-10 rounded-[4rem] border border-slate-100 shadow-[0_30px_60px_rgba(0,0,0,0.02)] ring-1 ring-slate-100 flex flex-col justify-between group">
            <div className="space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Annual Fee</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight italic">{formatCurrency(studentData.financial?.netTuition)}</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                    <TrendingUp className="w-6 h-6" />
                  </div>
               </div>
               
               <div className="h-px bg-slate-50" />

               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Policy Discounts</p>
                    <p className="text-2xl font-black text-emerald-600 tracking-tight italic">-{formatCurrency(studentData.financial?.totalDiscount)}</p>
                  </div>
                  <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                    <Zap className="w-6 h-6 fill-amber-500/20" />
                  </div>
               </div>
            </div>

            <div className="mt-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] flex items-center gap-5 group-hover:bg-indigo-50 transition-colors">
               <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center text-primary shadow-xl shadow-primary/10 border border-primary/10">
                  <Users className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institutional Network</p>
                  <p className="text-sm font-black text-primary tracking-tight">{siblings.length} Sibling Profiles</p>
               </div>
            </div>
        </div>
      </div>

      {/* ─── MATURITY LEDGER ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {["term1", "term2", "term3"].map((term: any) => {
           const amount = Number(studentData.financial?.[`${term}Amount`]) || 0;
           const isPaid = studentData.collections?.some((c: any) => {
             const allocated = c.allocatedTo as any;
             return c.status === "Success" && (allocated?.terms?.includes(term) || (allocated && allocated[term] > 0));
           });
           
           return (
             <div key={term} className={cn(
               "p-10 rounded-[4rem] border transition-all duration-700 relative group overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)]",
               isPaid ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100"
             )}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-[100px] opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between mb-8">
                   <div className={cn(
                     "w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                     isPaid ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-[#0f172a] text-white shadow-slate-200"
                   )}>
                      {isPaid ? <CheckCircle2 className="w-8 h-8" /> : <CalendarDays className="w-8 h-8" />}
                   </div>
                   <span className={cn(
                     "text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full border shadow-sm",
                     isPaid ? "bg-emerald-100/50 text-emerald-600 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-100"
                   )}>
                     {isPaid ? "Cleared" : "Awaiting"}
                   </span>
                </div>

                <div className="space-y-1">
                   <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                     {term.replace("term", "Sovereign Term ")}
                   </h4>
                   <p className="text-3xl font-black tabular-nums tracking-tighter italic text-slate-400">
                     <span className="text-lg font-normal mr-1">₹</span>{amount.toLocaleString()}
                   </p>
                </div>
                
                {!isPaid && (
                  <div className="space-y-3 mt-8">
                    <button 
                      onClick={() => handlePayInitiate(term, amount)}
                      className="w-full py-4 bg-accent text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:bg-accent/90 transition-all transform active:scale-95 group/btn overflow-hidden relative italic"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                      <span className="relative z-10">Process Payment</span>
                    </button>
                    <button 
                      onClick={() => handleShareLink(term)}
                      className="w-full py-4 bg-white text-slate-400 border border-slate-200 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center justify-center gap-3"
                    >
                       <ExternalLink size={14} className="opacity-40" />
                       {copiedLink === term ? "Secure Link Copied" : "Share Ledger Access"}
                    </button>
                  </div>
                )}
             </div>
           );
         })}
      </div>

      {/* ─── PAYMENT OVERLAY MODAL ─── */}
      <AnimatePresence mode="wait">
        {isPayModalOpen && payTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPayModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-10 space-y-8">
                 <div>
                    <h3 className="text-3xl font-black italic tracking-tighter text-[#0047ab] uppercase mb-1">Fee Settlement</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       Secure Gateway • {payTarget.termId.toUpperCase()}
                    </p>
                 </div>

                 <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-slate-400">
                       <span className="text-[10px] font-black uppercase tracking-widest">Base Fee</span>
                       <span className="text-sm font-bold">{formatCurrency(payTarget.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#0047ab]">
                       <span className="text-[10px] font-black uppercase tracking-widest">Convenience Fee (2%)</span>
                       <span className="text-sm font-bold">+{formatCurrency(payTarget.amount * 0.02)}</span>
                    </div>
                    <div className="h-px bg-slate-200 my-2" />
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Total Payable</span>
                       <span className="text-3xl font-black italic text-slate-900">{formatCurrency(payTarget.amount * 1.02)}</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <p className="text-[9px] font-medium text-slate-400 text-center italic px-4 leading-relaxed">
                       Vivek Vani Education uses Razorpay for automated reconciliation. All payments are instantly mirrored in institutional ledgers upon success.
                    </p>
                    <div className="flex gap-3">
                       <button 
                         onClick={() => setIsPayModalOpen(false)}
                         className="flex-1 py-5 bg-slate-100 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
                       >
                         Cancel
                       </button>
                       <button 
                         onClick={handleRazorpayCheckout}
                         disabled={processing}
                         className="flex-[2] py-5 bg-[#0047ab] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                       >
                         {processing ? "Connecting Gateway..." : "Pay with Razorpay"}
                       </button>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TRANSACTION TIMELINE ─── */}
      <div className="bg-[var(--card)] rounded-[3rem] border border-[var(--border)] premium-shadow p-8 mt-10">
         <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-3 text-[var(--foreground)]/60">
            <Clock className="w-4 h-4 text-[#0047ab]" />
            Recent Collections
         </h4>

         <div className="space-y-4">
            {studentData.collections?.length > 0 ? (
               studentData.collections.map((col: any) => (
                  <div key={col.id} className="group p-6 bg-slate-50/50 border border-slate-100/50 rounded-[2rem] flex items-center justify-between hover:border-[#0047ab]/30 transition-all">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#0047ab] shadow-sm">
                           <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{col.receiptNumber}</p>
                           <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase italic">{col.paymentMode} • {new Date(col.paymentDate).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-lg font-black text-emerald-500">+{formatCurrency(Number(col.totalPaid))}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Settled: {col.allocatedTo?.terms?.join(', ') || 'MISC'}</p>
                     </div>
                  </div>
               ))
            ) : (
               <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                  <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">No Historical Records Found</p>
               </div>
            )}
         </div>
      </div>
      
    </div>
  );
}
