"use client";

import React, { useState } from "react";
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
  CalendarDays,
  User
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { getStudentFeeStatus, recordFeeCollection } from "@/lib/actions/finance-actions";
import { calculateTermBreakdown, formatCurrency } from "@/lib/utils/fee-utils";
import { DiscountRoadmap } from "./DiscountRoadmap";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/**
 * FeeCollectionForm
 * 
 * A high-end, interactive form for recording fee collections.
 * Features:
 * - Real-time student search
 * - 360-degree financial overview
 * - Discount roadmap visibility (WOW factor)
 * - Atomic transaction status with success visualizer
 */
export function FeeCollectionForm() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [reference, setReference] = useState("");

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
    setSuccess(null);
    setError(null);
    const result = await getStudentFeeStatus(id);
    if (result.success && result.data) {
      setStudent(result.data);
      setSearchResults([]);
      setSearchTerm("");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const processPayment = async () => {
    if (!student || paymentAmount <= 0) return;
    
    setCollectionLoading(true);
    setSuccess(null);
    setError(null);
    
    try {
      const result = await recordFeeCollection({
        studentId: student.id,
        amountPaid: paymentAmount,
        paymentMode,
        paymentReference: reference,
      });

      if (result.success && result.data) {
        setSuccess(result.data.receiptNumber);
        // Refresh the student's local state to show updated totals
        const updated = await getStudentFeeStatus(student.id);
        if (updated.success && updated.data) setStudent(updated.data);
        setPaymentAmount(0);
        setReference("");
      } else {
        setError(result.error || "Collection failed");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setCollectionLoading(false);
    }
  };

  // Derived financial data
  const tuition = Number(student?.financial?.tuitionFee || 0);
  const totalDiscount = Number(student?.financial?.totalDiscount || 0);
  const breakdown = calculateTermBreakdown(tuition, totalDiscount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px] items-start pb-20">
      {/* Left Column: Search & Profile */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="bg-background rounded-3xl border border-border shadow-xl p-6 ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-[0.2em]">Student Lookup</h3>
            {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </div>
          
          <form onSubmit={handleSearch} className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground opacity-50 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by Name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-4 bg-muted/50 border-2 border-border rounded-2xl text-sm font-bold focus:border-primary focus:bg-background outline-none transition-all shadow-inner"
            />
          </form>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar pr-2"
              >
                {searchResults.map(res => (
                  <button
                    key={res.id}
                    onClick={() => selectStudent(res.id)}
                    className="w-full text-left p-4 hover:bg-primary/5 transition-colors flex items-center gap-4 rounded-xl group relative overflow-hidden mb-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-foreground opacity-50 text-xs font-black group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-110">
                      {res.firstName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground leading-tight mb-0.5 group-hover:text-primary transition-colors">
                        {res.firstName} {res.lastName}
                      </p>
                      <p className="text-[10px] font-black text-foreground opacity-50 tracking-wider">
                        {res.admissionId} • {res.academic?.classId || "Grade I"}
                      </p>
                    </div>
                    <ArrowRight className="ml-auto w-4 h-4 text-slate-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {student && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group shadow-primary/20 cursor-default"
          >
            {/* Visual background accents */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

            <div className="flex flex-col items-center text-center relative z-10 mb-8">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-1 mb-4 shadow-2xl">
                <div className="w-full h-full rounded-[1.8rem] bg-slate-800 flex items-center justify-center text-4xl font-black text-white/90">
                  {student.firstName[0]}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter leading-tight mb-1">{student.firstName} {student.lastName}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black bg-primary px-2 py-0.5 rounded tracking-[0.1em] text-white">
                    {student.academic?.classId || "PRIMARY"}
                  </span>
                  <span className="text-xs text-white/40 font-bold">•</span>
                  <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">
                    {student.admissionId}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-background/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-background/10 transition-colors">
                <p className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Tuition Total</p>
                <p className="text-lg font-black tracking-tight">{formatCurrency(tuition)}</p>
              </div>
              <div className="bg-background/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-background/10 transition-colors">
                <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mb-1">Scholarship</p>
                <p className="text-lg font-black tracking-tight">-{formatCurrency(totalDiscount)}</p>
              </div>
              <div className="bg-primary/20 backdrop-blur-md rounded-2xl p-4 border border-primary/20 col-span-2">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] text-primary-foreground/50 uppercase font-black tracking-widest">Yearly Net Payable</p>
                  <span className="text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">VALID</span>
                </div>
                <p className="text-3xl font-black text-white leading-none mt-1">{formatCurrency(breakdown.annualNet)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right Column: Fee Details & Collection */}
      <div className="lg:col-span-8">
        {!student ? (
          <div className="bg-background rounded-[3rem] border-2 border-dashed border-border p-24 text-center group flex flex-col items-center justify-center min-h-[500px]">
            <div className="w-20 h-20 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner">
              <User className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-foreground font-black text-2xl tracking-tight mb-2 uppercase">Ready to Collect</h3>
            <p className="text-foreground opacity-50 text-sm max-w-xs font-medium leading-relaxed">
              Find a student record using the search panel to view their financial roadmap and record payments.
            </p>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-10 duration-700">
            {/* Discount WOW Widget */}
            <DiscountRoadmap 
              annualTuition={tuition}
              totalDiscount={totalDiscount}
              term3Base={Math.round(tuition * 0.25)}
              term3Net={breakdown.term3}
            />

            {/* Term Breakdown Grid */}
            <div className="bg-background rounded-[2.5rem] border border-border shadow-xl overflow-hidden ring-1 ring-slate-900/5">
              <div className="bg-muted/50 px-8 py-5 border-b border-border flex justify-between items-center">
                <h3 className="font-black text-foreground uppercase tracking-[0.2em] text-[10px]">Academic Fee Breakdown</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Real-time DB Sync</span>
                </div>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Term 1 (50%)", amount: breakdown.term1, status: "DUE", color: "amber" },
                  { label: "Term 2 (25%)", amount: breakdown.term2, status: "UPCOMING", color: "slate" },
                  { label: "Term 3 (Settlement)", amount: breakdown.term3, status: "BENEFIT", color: "indigo" }
                ].map((term, i) => (
                  <div key={i} className="bg-muted/50 rounded-2xl p-6 border border-border hover:border-primary/20 transition-all hover:bg-background group cursor-default">
                    <p className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest mb-3">{term.label}</p>
                    <p className="text-3xl font-black text-foreground mb-3 tracking-tighter transition-colors group-hover:text-primary">
                      {formatCurrency(term.amount)}
                    </p>
                    <div className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase",
                      term.color === 'amber' ? "bg-amber-100 text-amber-600" :
                      term.color === 'indigo' ? "bg-indigo-100 text-indigo-600" :
                      "bg-slate-200 text-foreground opacity-60"
                    )}>
                      {term.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection Logic Form */}
            <div className="bg-background rounded-[3rem] border border-border shadow-2xl p-10 ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between mb-10">
                <h3 className="font-black text-foreground uppercase tracking-[0.2em] text-xs flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  Record Fee Collection
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                <div className="space-y-4">
                  <label className="text-xs font-black text-foreground opacity-50 uppercase tracking-widest flex items-center gap-2">
                    Collection Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 group-focus-within:text-primary transition-colors">₹</div>
                    <input
                      type="number"
                      value={paymentAmount || ""}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full pl-14 pr-8 py-6 bg-muted/50 border-2 border-border rounded-[1.5rem] text-4xl font-black text-foreground focus:border-primary focus:bg-background outline-none transition-all shadow-inner placeholder:text-slate-200"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-foreground opacity-50 font-medium italic pl-2">Enter the exact amount collected from the parent.</p>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-foreground opacity-50 uppercase tracking-widest">Payment Channel</label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: "Cash", icon: Banknote },
                      { id: "Bank", icon: CreditCard },
                      { id: "UPI", icon: QrCode },
                      { id: "Cheque", icon: CalendarDays },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setPaymentMode(mode.id)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all group relative overflow-hidden",
                          paymentMode === mode.id 
                            ? "bg-primary border-primary text-white shadow-xl shadow-primary/20" 
                            : "bg-background border-border text-foreground opacity-50 hover:border-border"
                        )}
                      >
                        <mode.icon className={cn("w-6 h-6", paymentMode === mode.id ? "text-white" : "text-slate-300")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{mode.id}</span>
                        {paymentMode === mode.id && (
                          <motion.div layoutId="activeMode" className="absolute bottom-1 right-1">
                            <CheckCircle2 size={12} className="text-white/50" />
                          </motion.div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-stretch pt-6 border-t border-slate-50">
                <div className="flex-1 space-y-3">
                  <label className="text-xs font-black text-foreground opacity-50 uppercase tracking-widest">Reference / ID (Optional)</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-6 py-5 bg-muted/50 border-2 border-border rounded-2xl text-sm font-bold focus:border-primary focus:bg-background outline-none transition-all shadow-inner"
                    placeholder="Chq No, UTR, or Remarks..."
                  />
                </div>

                <div className="flex-1 flex flex-col justify-end">
                  <button
                    onClick={processPayment}
                    disabled={collectionLoading || paymentAmount <= 0}
                    className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black text-lg shadow-2xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-3">
                      {collectionLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          POST TO FINANCIAL LEDGER
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Status Feedbacks */}
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="mt-10 bg-green-500 rounded-[2rem] p-8 text-white text-center shadow-2xl shadow-green-200"
                  >
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4" />
                    <h4 className="text-2xl font-black tracking-tight mb-2">Collection Verified!</h4>
                    <div className="bg-background/10 rounded-xl p-4 inline-block border border-white/20 mb-4">
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Receipt Entry Added</p>
                      <p className="text-2xl font-black tracking-widest">{success}</p>
                    </div>
                    <div className="flex justify-center gap-4">
                      <button className="px-6 py-2 bg-background text-green-600 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-green-50 transition-colors">
                        Print Thermal Receipt
                      </button>
                      <button className="px-6 py-2 bg-transparent text-white border border-white/30 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-background/10 transition-colors">
                        Send via Firebase Push
                      </button>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-xs font-bold text-red-700">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
