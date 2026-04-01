"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Download, 
  CalendarDays, 
  Zap, 
  ExternalLink, 
  Loader2,
  Lock,
  Smartphone,
  ReceiptText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { getPublicPaymentDetails, validatePaymentGate, createRazorpayOrderAction, verifyRazorpayPaymentAction } from "@/lib/actions/finance-actions";
import { QRCodeSVG } from "qrcode.react";
import { FeeReceipt } from "./FeeReceipt";

export function PublicPaymentPortal({ token }: { token: string }) {
  const [step, setStep] = useState<"verify" | "choice" | "pay" | "success">("verify");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [publicData, setPublicData] = useState<any>(null);
  const [verifiedData, setVerifiedData] = useState<any>(null);
  const [admissionId, setAdmissionId] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);

  useEffect(() => {
    async function loadPublic() {
      const res = await getPublicPaymentDetails(token);
      if (res.success) {
        setPublicData(res.data);
      } else {
        setError(res.error || "Invalid link");
      }
      setLoading(false);
    }
    loadPublic();
  }, [token]);

  // Razorpay Script Loader
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { 
      if (document.body.contains(script)) {
        document.body.removeChild(script); 
      }
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");

    const res = await validatePaymentGate({ token, admissionNumber: admissionId });
    if (res.success) {
      setVerifiedData(res.data);
      setStep("choice");
    } else {
      setError(res.error || "Admission ID mismatch.");
    }
    setVerifying(false);
  };

  const handleRazorpayFlow = async () => {
    if (!verifiedData) return;
    setProcessing(true);
    setError("");

    try {
      // Calculate Professional Fees (1.5% + 18% GST)
      const baseAmount = verifiedData.baseAmount;
      const gatewayFee = baseAmount * 0.015;
      const gst = gatewayFee * 0.18;
      const totalConvenience = gatewayFee + gst;

      // Create the Order on the Backend
      const orderRes = await createRazorpayOrderAction({
        amountPaid: baseAmount,
        studentId: verifiedData.studentId,
        selectedTerms: [verifiedData.termId],
        lateFeePaid: 0
      });

      if (!orderRes.success || !orderRes.data) throw new Error(orderRes.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: publicData.schoolName,
        description: `Fee Settlement - ${verifiedData.termId.toUpperCase()}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          setProcessing(true);
          const verifyRes = await verifyRazorpayPaymentAction({
            ...response,
            studentId: verifiedData.studentId,
            selectedTerms: [verifiedData.termId],
            amountPaid: verifiedData.baseAmount,
            lateFeePaid: 0,
            convenienceFee: totalConvenience
          });

          if (verifyRes.success) {
            setSuccessReceipt(verifyRes.data);
            setStep("success");
          } else {
            setError("Verification Failed: " + verifyRes.error);
          }
          setProcessing(false);
        },
        prefill: {
          name: verifiedData.studentName,
        },
        modal: {
          ondismiss: () => setProcessing(false)
        },
        theme: { color: "#0047ab" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error("[RAZORPAY_ERROR]", err);
      setError(err.message || "Could not initiate payment session.");
    } finally {
      // Delay processing state reset to allow modal to handle itself
      setTimeout(() => setProcessing(false), 2000);
    }
  };

  if (step === "success" && successReceipt) {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 animate-in fade-in zoom-in duration-500">
        <div className="max-w-4xl mx-auto w-full space-y-8">
          <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-xl shadow-emerald-500/5">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-emerald-900 tracking-tight">Payment Successful</h2>
              <p className="text-emerald-700/70 font-bold">Your fee settlement has been recorded in the school ledger.</p>
            </div>
          </div>
          
          <FeeReceipt 
            student={successReceipt.student} 
            receipt={successReceipt.receipt} 
          />
          
          <div className="text-center pb-12">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Official Digital Receipt • Virtue Education</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
            >
              Finish & Back to Verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-[#0047ab] animate-spin mx-auto" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Securing Connection...</p>
        </div>
      </div>
    );
  }

  if (error && step === "verify" && !publicData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-xl border border-rose-100">
           <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
           <h2 className="text-xl font-black text-rose-600 uppercase tracking-tighter mb-2">Invalid Access</h2>
           <p className="text-sm font-medium text-slate-400 mb-6">{error}</p>
           <button onClick={() => window.location.reload()} className="text-[#0047ab] font-black text-xs uppercase tracking-widest underline">Reload Portal</button>
        </div>
      </div>
    );
  }

  const baseAmount = verifiedData?.baseAmount || 0;
  const gatewayFee = baseAmount * 0.015;
  const gstOnFee = gatewayFee * 0.18;
  const totalPayable = baseAmount + gatewayFee + gstOnFee;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-10 font-sans selection:bg-blue-100">
      
      {/* 🏙️ BRANDING HEADER */}
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-sm font-black text-[#0047ab] uppercase tracking-[0.4em] mb-1">{publicData?.schoolName || "Virtue Education"}</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Institutional Settlement Portal</p>
      </div>

      {/* 🚀 PROGRESS STEPPER */}
      <div className="w-full max-w-lg mb-10 px-8 flex items-center justify-between relative">
         <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />
         {[
           { id: "verify", icon: ShieldCheck, label: "Identity" },
           { id: "choice", icon: CreditCard, label: "Review" },
           { id: "pay", icon: CheckCircle2, label: "Confirm" }
         ].map((s, i) => {
           const isActive = step === s.id;
           const isDone = (step === "choice" && s.id === "verify") || (step === "pay");
           return (
             <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 border-slate-50",
                  isDone ? "bg-[#0047ab] text-white shadow-lg" : 
                  isActive ? "bg-white text-[#0047ab] border-[#0047ab] shadow-xl" : "bg-white text-slate-300"
                )}>
                  <s.icon className="w-4 h-4" />
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-[#0047ab]" : "text-slate-400")}>{s.label}</span>
             </div>
           );
         })}
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 relative group transition-all duration-500 hover:shadow-blue-900/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#0047ab]/5 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        
        <div className="p-10 md:p-14 relative z-10">
          <AnimatePresence mode="wait">
            
            {/* 🛡️ STEP 1: IDENTITY GATE */}
            {step === "verify" && (
              <motion.div 
                key="verify"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                 <div className="space-y-3">
                    <div className="flex items-center gap-3">
                       <div className="px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">Secure Link Active</div>
                       <div className="h-px flex-1 bg-slate-100" />
                    </div>
                    <h2 className="text-4xl font-black italic tracking-tighter text-slate-900">IDENTIFY STUDENT</h2>
                    <p className="text-sm font-medium text-slate-400 max-w-md">Hello! To unlock settlement details for <span className="text-[#0047ab] font-black">{publicData?.studentName}</span>, please provide the unique admission ID.</p>
                 </div>

                 <form onSubmit={handleVerify} className="space-y-6">
                    <div className="space-y-3">
                       <div className="relative">
                          <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input 
                            required
                            type="text"
                            placeholder="Admission # (e.g. VIS/2026/001)"
                            value={admissionId}
                            onChange={(e) => setAdmissionId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] py-6 px-16 text-lg font-black tracking-widest focus:outline-none focus:border-[#0047ab] focus:ring-8 focus:ring-[#0047ab]/5 transition-all placeholder:text-slate-300"
                          />
                       </div>
                    </div>

                    {error && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-black text-rose-600 bg-rose-50 p-5 rounded-2xl border border-rose-100 flex items-center gap-3 uppercase tracking-tight">
                        <AlertCircle size={16} /> {error}
                      </motion.div>
                    )}

                    <button 
                      type="submit"
                      disabled={verifying}
                      className="w-full py-6 bg-[#0047ab] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
                    >
                      {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Unlock Secure Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                    </button>
                 </form>

                 <div className="pt-10 flex items-center justify-between opacity-40">
                    <div className="flex items-center gap-2">
                       <Smartphone className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Mobile Optimized</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" />
                       <span className="text-[10px] font-black uppercase tracking-widest">AES-256 Encrypted</span>
                    </div>
                 </div>
              </motion.div>
            )}

            {/* 🎯 STEP 2: SETTLEMENT REVIEW */}
            {step === "choice" && verifiedData && (
              <motion.div 
                key="choice"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10"
              >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-emerald-600">
                           <ShieldCheck size={14} />
                           <span className="text-[10px] font-black uppercase tracking-widest italic">Identity Authenticated</span>
                        </div>
                        <h2 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">{verifiedData.studentName}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admission Registry: <span className="text-[#0047ab]">#{admissionId}</span></p>
                     </div>
                     <div className="w-20 h-20 rounded-[2.5rem] bg-[#0047ab] flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-900/20">
                        {verifiedData.studentName[0]}
                     </div>
                  </div>

                  <div className="bg-slate-50/80 p-10 rounded-[3rem] border border-slate-100 shadow-inner space-y-6">
                     <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0047ab] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{verifiedData.termId} INSTALLMENT</span>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between items-center text-slate-500">
                           <span className="text-xs font-bold uppercase tracking-widest">Base Fee Amount</span>
                           <span className="text-lg font-black text-slate-900">{formatCurrency(baseAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[#0047ab]">
                           <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase tracking-widest">Convenience Fee</span>
                              <span className="text-[9px] font-black uppercase opacity-40">1.5% Gateway + 18% GST</span>
                           </div>
                           <span className="text-lg font-black">{formatCurrency(gatewayFee + gstOnFee)}</span>
                        </div>
                        <div className="h-px bg-slate-200 my-4" />
                        <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200">
                           <span className="text-sm font-black uppercase tracking-[0.2em] text-[#0047ab]">Total Payable</span>
                           <span className="text-4xl font-black italic tracking-tighter text-slate-900">{formatCurrency(totalPayable)}</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <button 
                       onClick={handleRazorpayFlow}
                       disabled={processing}
                       className="w-full py-7 bg-[#0047ab] text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/30 hover:bg-slate-900 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
                     >
                       {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "PAY & SETTLE LEDGER"}
                     </button>
                     <div className="flex items-center justify-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all">
                        <Lock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">100% Secured by Razorpay Payment Gateway</span>
                     </div>
                  </div>
              </motion.div>
            )}

            {/* ✅ STEP 3: SUCCESS RECEIPT */}
            {step === "pay" && successReceipt && (
              <motion.div 
                key="success"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-6"
              >
                 <div className="flex flex-col items-center mb-10 text-center gap-4">
                    <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Settlement Complete</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ledger Entry Recorded Successfully</p>
                    </div>
                 </div>

                 <div className="scale-[0.8] origin-top -mt-10 mb-10">
                    <FeeReceipt 
                      student={successReceipt.student} 
                      receipt={successReceipt} 
                      schoolInfo={{
                        name: publicData.schoolName,
                        address: "School Campus, Institutional Registry",
                        phone: "Institutional Helpline Active",
                        email: `accounts@${publicData.schoolName.toLowerCase().replace(/\s+/g, '')}.com`
                      }}
                    />
                 </div>

                 <div className="flex flex-col gap-4">
                    <button onClick={() => window.location.reload()} className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#0047ab] hover:underline transition-all">Exit Secure Portal</button>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-6 animate-in fade-in duration-1000">
         <div className="flex items-center gap-8 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-5" />
            <div className="h-4 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Compliant</span>
            </div>
         </div>
      </div>
    </div>
  );
}
