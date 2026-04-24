"use client";

import React, { useEffect, useState } from "react";
import { getEnquiryPaymentReviewAction } from "@/lib/actions/enquiry-actions";
import { createPaymentLinkAction } from "@/lib/actions/payment-actions";
import { 
  CheckCircle, ShieldCheck, CreditCard, ChevronRight, 
  Sparkles, Info, ArrowLeft, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  enquiryId: string;
}

export function BrandedPublicPaymentReview({ enquiryId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await getEnquiryPaymentReviewAction(enquiryId);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || "Failed to load admission details.");
      }
      setLoading(false);
    }
    loadData();
  }, [enquiryId]);

  const handlePayment = async (type: 'TERM_1' | 'ANNUAL') => {
    setPaying(true);
    const amount = type === 'ANNUAL' ? data.netAnnual : data.balanceRemaining;
    const res = await createPaymentLinkAction({
      amount: amount,
      studentId: enquiryId,
      studentName: data.studentName,
      notes: `Admission ${type === 'ANNUAL' ? 'Annual Full' : 'Term 1 Partial/Full'} via Public Portal`,
      terms: [type === 'ANNUAL' ? 'ANNUAL_2026' : 'TERM_1_2026'],
      baseAmount: amount
    });

    if (res.success && res.shortUrl) {
      window.location.href = res.shortUrl;
    } else {
      alert("Payment Error: " + res.error);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-medium">Securing connection to PaVa-EDUX portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <div className="bg-slate-900/50 border border-red-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl backdrop-blur-xl">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl transition-all font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-xl mx-auto px-4 py-8 md:py-16 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Admission Review 2026-27</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
            Finalize Your <br/> <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent underline decoration-indigo-500/30 underline-offset-8">Admission</span>
          </h1>
          <p className="text-slate-400 max-w-sm mx-auto">Please review the details below and select your preferred payment mode to secure the seat.</p>
        </div>

        {/* Identity & Details Card */}
        <div className="bg-slate-900/40 border border-white/5 rounded-[40px] p-8 md:p-10 mb-8 backdrop-blur-3xl shadow-2xl space-y-10 group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

            {/* Profile Section */}
            <div className="flex items-start gap-6 border-b border-white/5 pb-8">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-500/20 animate-in zoom-in duration-1000">
                    {data.studentName.charAt(0)}
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-1 tracking-tight">{data.studentName}</h2>
                    <div className="flex flex-wrap gap-3">
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider border border-white/5">{data.className}</span>
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider border border-white/5">{data.schoolName}</span>
                    </div>
                </div>
            </div>

            {/* Financial Details Grid */}
            <div className="space-y-6">
                {/* Academic Components */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between group/line">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center group-hover/line:bg-indigo-500/20 transition-colors">
                                <CheckCircle className="w-4 h-4 text-slate-400 group-hover/line:text-indigo-400" />
                            </div>
                            <span className="text-slate-400 font-medium">Academic Fee Breakdown</span>
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(data.breakdown.tuition + data.breakdown.admission + data.breakdown.library)}</span>
                    </div>

                    {/* Tuition Discount */}
                    {data.breakdown.tuitionDiscount > 0 && (
                        <div className="flex items-center justify-between pl-11">
                            <span className="text-xs text-emerald-400 font-bold italic">Tuition Scholarship Applied</span>
                            <span className="text-sm font-bold text-emerald-400">-{formatCurrency(data.breakdown.tuitionDiscount)}</span>
                        </div>
                    )}

                    {/* Admission Waiver */}
                    {data.breakdown.admissionWaiver > 0 && (
                        <div className="flex items-center justify-between pl-11">
                            <span className="text-xs text-sky-400 font-bold italic">Admission Waiver Applied</span>
                            <span className="text-sm font-bold text-sky-400">-{formatCurrency(data.breakdown.admissionWaiver)}</span>
                        </div>
                    )}
                </div>

                {/* Transport Section (Only if selected) */}
                {data.transportEstimate > 0 && (
                    <div className="pt-6 border-t border-white/5 space-y-3">
                         <div className="flex items-center justify-between group/line">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <span className="text-slate-400 font-medium block">Transport: {data.breakdown.stopName}</span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">{formatCurrency(data.breakdown.transportMonthly)} /Month</span>
                                </div>
                            </div>
                            <span className="text-lg font-bold text-emerald-400">{formatCurrency(data.transportEstimate)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-11 italic">10 Month Academic Cycle Billing</p>
                    </div>
                )}

                <div className="pt-6 border-t border-white/10 flex items-center justify-between bg-gradient-to-r from-transparent to-indigo-500/5 -mx-8 px-8 py-4">
                    <div>
                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] block mb-1">Total Net Portfolio</span>
                        <span className="text-[10px] text-indigo-400 font-bold">(Academic + Transport)</span>
                    </div>
                    <span className="text-4xl font-black text-indigo-400 underline decoration-indigo-500/30 underline-offset-4">{formatCurrency(data.grandTotalNet)}</span>
                </div>
            </div>
        </div>

        {/* Current Balance / Milestone Card (If Partial exists) */}
        {data.totalPaid > 0 && !data.milestoneMet && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 mb-8 flex items-start gap-4">
                <Info className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                <div className="space-y-2">
                    <p className="text-amber-200 font-bold tracking-tight leading-snug">Partial Payment Found: You have already paid {formatCurrency(data.totalPaid)}.</p>
                    <p className="text-amber-200/60 text-sm">Please pay the remaining {formatCurrency(data.balanceRemaining)} to complete Term 1 and secure the admission.</p>
                </div>
            </div>
        )}

        {/* Payment Options - The "Strict Selection" */}
        <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 ml-4 mb-4">Choose Payment Mode</h3>
            
            {/* Term 1 Button */}
            {!data.milestoneMet && (
                <button 
                    disabled={paying}
                    onClick={() => handlePayment('TERM_1')}
                    className={cn(
                        "w-full group rounded-[32px] p-1 transition-all shadow-xl hover:shadow-indigo-500/20",
                        paying ? "bg-slate-800" : "bg-gradient-to-r from-indigo-500 to-sky-500 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                >
                    <div className="bg-slate-950/80 rounded-[30px] p-6 flex items-center justify-between group-hover:bg-transparent transition-colors">
                        <div className="text-left">
                            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1", paying ? "text-slate-500" : "text-white/60")}>Term 1 Settlement</p>
                            <p className="text-2xl font-black">{formatCurrency(data.balanceRemaining)}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            {paying ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : <ChevronRight className="w-6 h-6" />}
                        </div>
                    </div>
                </button>
            )}

            {/* Annual Button */}
            <button 
                disabled={paying}
                onClick={() => handlePayment('ANNUAL')}
                className={cn(
                    "w-full group rounded-[32px] p-1 transition-all shadow-xl hover:shadow-green-500/10",
                    paying ? "bg-slate-800" : "bg-white/5 hover:bg-white/10 border border-white/5 hover:scale-[1.02] active:scale-[0.98]"
                )}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                            <p className={cn("text-xs font-bold uppercase tracking-widest", paying ? "text-slate-500" : "text-slate-400")}>Full Annual 2026-27</p>
                            <span className="bg-green-500/20 text-green-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Recommended</span>
                        </div>
                        <p className="text-2xl font-black">{formatCurrency(data.netAnnual)}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center">
                        {paying ? <Loader2 className="w-6 h-6 animate-spin text-slate-500" /> : <ChevronRight className="w-6 h-6 text-slate-400" />}
                    </div>
                </div>
            </button>
        </div>

        {/* Footer & Security */}
        <div className="mt-16 text-center space-y-6">
            <div className="flex items-center justify-center gap-4 text-slate-500">
                <div className="flex items-center gap-1.5 border border-white/5 bg-white/5 px-3 py-1.5 rounded-full">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Secure Gateway</span>
                </div>
                <div className="flex items-center gap-1.5 border border-white/5 bg-white/5 px-3 py-1.5 rounded-full">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">PCI-DSS Ready</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-600 max-w-xs mx-auto leading-relaxed font-medium uppercase tracking-widest">
                By clicking proceed, you agree to PaVa-EDUX Educational Systems' 2026-27 Admission Terms and No-Refund Policy for Admission Fees.
            </p>
        </div>

      </div>
    </div>
  );
}
