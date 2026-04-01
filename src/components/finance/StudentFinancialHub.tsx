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
import { formatCurrency } from "@/lib/utils/fee-utils";
import { 
  getStudentFeeStatus, 
  findPotentialSiblings, 
  createRazorpayOrderAction, 
  verifyRazorpayPaymentAction, 
  generatePaymentLinkAction 
} from "@/lib/actions/finance-actions";
import { QRCodeSVG } from "qrcode.react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface StudentFinancialHubProps {
  studentId: string;
}

export function StudentFinancialHub({ studentId }: StudentFinancialHubProps) {
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [siblings, setSiblings] = useState<any[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<string[]>([]);
  const [activeTerm, setActiveTerm] = useState<string>("term1");
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [payTarget, setPayTarget] = useState<{termId: string, amount: number} | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [res, sibs] = await Promise.all([
        getStudentFeeStatus(studentId),
        findPotentialSiblings(studentId)
      ]);
      
      if (res.success) setStudentData(res.data);
      if (sibs.success) setSiblings(sibs.data);
      setLoading(false);
    }
    loadData();
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
      const orderRes = await createRazorpayOrderAction({
        amountPaid: payTarget.amount * 1.02,
        studentId: studentData.id
      });

      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.error || "Order generation failed.");

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Virtue Education",
        description: `Fee Payment - ${payTarget.termId.toUpperCase()}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          const verifyRes = await verifyRazorpayPaymentAction({
            ...response,
            studentId: studentData.id,
            selectedTerms: [payTarget.termId],
            amountPaid: payTarget.amount * 1.02,
            lateFeePaid: 0
          });

          if (verifyRes.success) {
            alert("Payment Successful! Receipt generated.");
            window.location.reload();
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      
      {/* ─── BALANCE HUD ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#0047ab] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-20 -mt-20" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-white/10 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-white/80" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Secure Virtue Wallet</span>
            </div>
            
            <p className="text-sm font-bold text-white/60 uppercase tracking-widest mb-1">Total Outstanding Balance</p>
            <h2 className="text-6xl font-black italic tracking-tighter mb-8 tabular-nums">
              {formatCurrency(outstanding)}
            </h2>

            <div className="flex flex-wrap gap-4">
               <button 
                 onClick={() => handlePayInitiate("term1", studentData.financial?.term1Amount)}
                 className="px-8 py-4 bg-white text-[#0047ab] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 transition-transform active:scale-95"
               >
                  <CreditCard className="w-4 h-4" />
                  Quick Pay (Term 1)
               </button>
               <button className="px-8 py-4 bg-white/10 text-white border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white/20 transition-all">
                  <Download className="w-4 h-4" />
                  Get Full Statement
               </button>
            </div>
          </div>
        </div>

        {/* ─── QUICK STATS ─── */}
        <div className="bg-[var(--card)] p-8 rounded-[3rem] border border-[var(--border)] premium-shadow flex flex-col justify-between">
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase tracking-widest">Annual Fee</p>
                    <p className="text-xl font-bold">{formatCurrency(studentData.financial?.netTuition)}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500/20" />
               </div>
               
               <div className="h-px bg-[var(--border)]" />

               <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase tracking-widest">Total Discounts</p>
                    <p className="text-xl font-bold text-green-500">-{formatCurrency(studentData.financial?.totalDiscount)}</p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-500/20" />
               </div>
            </div>

            <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-4">
               <div className="w-10 h-10 bg-[#0047ab]/10 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#0047ab]" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase tracking-widest">Linked Siblings</p>
                  <p className="text-xs font-bold text-[#0047ab]">{siblings.length} Profiles Found</p>
               </div>
            </div>
        </div>
      </div>

      {/* ─── MATURITY LEDGER ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {["term1", "term2", "term3"].map((term: any) => {
           const amount = Number(studentData.financial?.[`${term}Amount`]) || 0;
           const isPaid = studentData.collections?.some((c: any) => c.status === "Success" && c.allocatedTo?.[term] > 0); 
           
           return (
             <div key={term} className={cn(
               "p-8 rounded-[2.5rem] border transition-all duration-500 relative group",
               isPaid ? "bg-green-500/5 border-green-500/20" : "bg-[var(--card)] border-[var(--border)] premium-shadow"
             )}>
                <div className="flex items-center justify-between mb-6">
                   <div className={cn(
                     "w-12 h-12 rounded-2xl flex items-center justify-center",
                     isPaid ? "bg-green-500/20 text-green-600" : "bg-blue-600 text-white"
                   )}>
                      {isPaid ? <CheckCircle2 className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
                   </div>
                   <span className={cn(
                     "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                     isPaid ? "bg-green-500/20 text-green-600" : "bg-[var(--muted)] text-[var(--foreground)]/40"
                   )}>
                     {isPaid ? "Cleared" : "Pending"}
                   </span>
                </div>

                <h4 className="text-lg font-black italic uppercase tracking-tighter mb-1">
                  {term.replace("term", "Term ")}
                </h4>
                <p className="text-2xl font-black mb-4">{formatCurrency(amount)}</p>
                
                {!isPaid && (
                  <div className="space-y-2 mt-4">
                    <button 
                      onClick={() => handlePayInitiate(term, amount)}
                      className="w-full py-3 bg-[#0047ab]/5 border border-[#0047ab]/20 text-[#0047ab] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#0047ab] hover:text-white transition-all transform active:scale-95"
                    >
                      Settle Term {term.slice(-1)}
                    </button>
                    <button 
                      onClick={() => handleShareLink(term)}
                      className="w-full py-3 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                       <ExternalLink size={12} />
                       {copiedLink === term ? "Link Copied!" : "Share Payment Link"}
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
