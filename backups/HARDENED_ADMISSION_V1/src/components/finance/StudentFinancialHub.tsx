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
  ExternalLink,
  School
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FeeReceipt } from "./FeeReceipt";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { supabase } from "@/lib/supabase/client";
import { 
  getAdHocFeeOptions,
  assignAdHocFeeAction,
  applyDiscountAction,
  updateStudentFeeComponentAction,
  getStudentFeeStatus,
  findPotentialSiblings,
  generatePaymentLinkAction,
  createRazorpayOrderAction,
  verifyRazorpayPaymentAction
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
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [adHocOptions, setAdHocOptions] = useState<any[]>([]);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [adjustmentTarget, setAdjustmentTarget] = useState<any>(null); // { id, name, amount }
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);

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

  // [SOVEREIGN_REFINEMENT] - Listen for external triggers (e.g. from Sidebar)
  useEffect(() => {
    const handleTrigger = (e: any) => {
      if (e.detail?.studentId === studentId) {
        handleOpenAssignModal();
      }
    };
    window.addEventListener('v2-open-opt-in', handleTrigger);
    return () => window.removeEventListener('v2-open-opt-in', handleTrigger);
  }, [studentId]);

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

  const handleOpenAssignModal = async () => {
    setIsAssignModalOpen(true);
    const res = await getAdHocFeeOptions();
    if (res.success) setAdHocOptions(res.data);
  };

  const handleAssignFee = async (componentId: string, amount: number) => {
    setAssigningLoading(true);
    const res = await assignAdHocFeeAction({
      studentId: studentData.id,
      componentId,
      amount
    });
    setAssigningLoading(false);
    if (res.success) {
      setIsAssignModalOpen(false);
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleApplyDiscount = async () => {
    const amountStr = prompt("Enter Discount Amount (in ₹):");
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

    const reason = prompt("Enter Reason for Discount:");
    if (!reason) return alert("Reason is required");

    setAssigningLoading(true);
    const res = await applyDiscountAction({
      studentId,
      amount,
      reason
    });
    setAssigningLoading(false);

    if (res.success) {
      loadData();
    } else {
      alert(res.error);
    }
  };

  const handleUpdateFee = async (newAmount: number, reason: string) => {
    if (!adjustmentTarget) return;
    setAdjustmentLoading(true);
    const res = await updateStudentFeeComponentAction({
      studentId,
      componentId: adjustmentTarget.id,
      newAmount,
      reason
    });
    setAdjustmentLoading(false);
    if (res.success) {
      setAdjustmentTarget(null);
      loadData();
    } else {
      alert(res.error);
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
  
  // 🛡️ RE-CALIBRATED OUTSTANDING: Annual Net (minus) Total Collections
  const outstanding = (Number(studentData.feeBreakdown?.annualNet) || 0) - (studentData.collections?.reduce((acc: number, curr: any) => acc + Number(curr.amountPaid), 0) || 0);

  if (success) {
    return (
      <div className="flex flex-col bg-slate-50 animate-in fade-in zoom-in duration-500 min-h-[600px] border border-slate-200 rounded-[3.5rem] mt-6">
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
      {/* ─── ENHANCED SUMMARY VITAL SIGNS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 [background:var(--sidebar-bg)] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group border border-white/5 flex flex-col justify-between min-h-[340px]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-[100px] rounded-full -mr-32 -mt-32 animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/60">Sovereign Wallet V2.0</span>
                </div>
                <button 
                  onClick={() => setView('audit')}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 transition-all border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] flex items-center gap-2 backdrop-blur-md active:scale-95 group"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:animate-bounce" />
                  Audit Registry
                </button>
            </div>
            
            <div className="space-y-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] ml-1">Net Outstanding</p>
              <h2 className="text-6xl lg:text-7xl font-black italic tracking-tighter tabular-nums flex items-baseline gap-2">
                <span className="text-2xl font-normal not-italic text-white/20 mr-1">₹</span>
                {formatCurrency(outstanding).replace('₹', '')}
              </h2>
            </div>
          </div>

          <div className="relative z-10 flex gap-4 mt-8">
             <button 
               onClick={() => handlePayInitiate("term1", studentData.financial?.term1Amount)}
               className="flex-1 py-4 bg-accent text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-all active:scale-95 group italic"
             >
                <CreditCard className="w-3.5 h-3.5" />
                Settle Installment
             </button>
             <button className="px-6 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all backdrop-blur-md">
                <Download className="w-3.5 h-3.5" />
                Ledger
             </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col justify-between gap-6">
            <div className="space-y-6">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Gross Inventory</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight italic">
                      {formatCurrency((Number(studentData.feeBreakdown?.annualNet) || 0) + (Number(studentData.financial?.totalDiscount) || 0))}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <TrendingUp className="w-5 h-5" />
                  </div>
               </div>
               
               <div className="h-px bg-slate-50" />

                <div className="flex items-center justify-between">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Policy Savings</p>
                     <div className="flex items-center gap-2">
                        <p className="text-2xl font-black text-emerald-600 tracking-tight italic">-{formatCurrency(studentData.financial?.totalDiscount)}</p>
                     </div>
                   </div>
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100">
                     <Zap className="w-5 h-5 fill-emerald-500/10" />
                   </div>
                </div>
            </div>

            <button 
              onClick={handleApplyDiscount}
              className="w-full py-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Modify Policy Discounts
            </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex flex-col justify-between group overflow-hidden relative min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16" />
            
            <div className="relative z-10">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-6 border border-white/20">
                  <Users className="w-6 h-6" />
               </div>
               <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">Institutional Links</p>
               <p className="text-xl font-black tracking-tight">{siblings.length} Sibling Profiles</p>
            </div>

            <div className="relative z-10 pt-4 border-t border-white/10">
               <p className="text-[10px] font-medium text-white/60 leading-relaxed italic">
                 Automatic multi-child fee concessions are active based on the Sovereign Rulebook.
               </p>
            </div>
        </div>
      </div>

      {/* ─── DETAILED FEE INVENTORY (POINT-OF-SALE VIEW) ─── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
         <div className="px-10 py-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div>
               <h4 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-900">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Comprehensive Fee Inventory
               </h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Surgical Breakdown of All Financial Components</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Academic Year: {studentData.financial?.feeStructure?.academicYear?.name || "2024-25"}
               </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/30">
                     <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Component Name</th>
                     <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                     <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Fee</th>
                     <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {/* Tuition Breakdown Row */}
                  <tr className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center border border-indigo-100">
                              <School className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-sm font-black text-slate-900 tracking-tight">Tuition & Operations Fee</p>
                              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Annual Instructional Base</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-10 py-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-tight">Core Academic</span>
                     </td>
                     <td className="px-10 py-6 text-right">
                        <p className="text-lg font-black text-slate-900 italic tracking-tighter">{formatCurrency(Number(studentData.feeBreakdown?.annualNet))}</p>
                     </td>
                     <td className="px-10 py-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                           <div className={cn("w-2 h-2 rounded-full", outstanding <= 0 ? "bg-emerald-500" : "bg-amber-400 animate-pulse")} />
                           <span className={cn("text-[10px] font-black uppercase tracking-widest", outstanding <= 0 ? "text-emerald-600" : "text-amber-600")}>
                              {outstanding <= 0 ? "Settled" : "Installments Active"}
                           </span>
                        </div>
                     </td>
                     <td className="px-10 py-6 text-right">
                        <button className="p-3 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all text-slate-400 hover:text-slate-900">
                           <Search className="w-4 h-4" />
                        </button>
                     </td>
                  </tr>

                  {/* Ancillary Components */}
                  {Object.entries(studentData.feeBreakdown?.ancillary || {}).map(([key, comp]: [string, any]) => (
                     <tr key={key} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center border border-slate-200 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                 <Plus className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-900 tracking-tight">{comp.label}</p>
                                 <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{comp.isAdHoc ? "Registry Potential" : "Institutional Component"}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-amber-100/50">Ancillary</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <p className="text-lg font-black text-slate-900 italic tracking-tighter">{formatCurrency(comp.amount)}</p>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <div className="flex items-center justify-center gap-2">
                              {comp.isPaid ? (
                                 <div className="flex items-center gap-2 text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Paid</span>
                                 </div>
                              ) : comp.amount > 0 ? (
                                 <div className="flex items-center gap-2 text-rose-500">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Unpaid</span>
                                 </div>
                              ) : (
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Opt-in Required</span>
                              )}
                           </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                           {!comp.isPaid && (
                              <button 
                                onClick={() => {
                                  if (comp.isAdHoc) handleOpenAssignModal();
                                  else handlePayInitiate(key, comp.amount);
                                }}
                                className="px-5 py-2.5 bg-slate-900 hover:bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                              >
                                {comp.amount > 0 ? "Settle Now" : "Assign Fee"}
                              </button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-8">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Inventory Total</p>
                  <p className="text-2xl font-black italic tracking-tighter">{formatCurrency(outstanding + studentData.collections?.reduce((acc: number, curr: any) => acc + Number(curr.amountPaid), 0))}</p>
               </div>
               <div className="w-px h-10 bg-white/10" />
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Total Collected</p>
                  <p className="text-2xl font-black italic tracking-tighter text-emerald-400">{formatCurrency(studentData.collections?.reduce((acc: number, curr: any) => acc + Number(curr.amountPaid), 0) || 0)}</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Final Net Payable</p>
               <p className="text-4xl font-black italic tracking-tighter text-accent">{formatCurrency(outstanding)}</p>
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

      {/* ─── INSTITUTIONAL ASSIGNMENT MODAL ─── */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white"
            >
              <div className="p-10 space-y-8">
                <div>
                   <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">Institutional Opt-In</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                      Assigning DB-Sourced Fees • Authorized Personnel Only
                   </p>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {adHocOptions.length > 0 ? adHocOptions.map((opt: any) => {
                    const alreadyHas = studentData.feeBreakdown?.ancillary?.[opt.name.toLowerCase()] || 
                                     studentData.feeBreakdown?.ancillary?.[Object.keys(studentData.feeBreakdown.ancillary).find(k => k.toLowerCase().includes(opt.name.toLowerCase())) || ""];
                    
                    return (
                      <div key={opt.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm border border-slate-100">
                              <Zap className="w-6 h-6" />
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{opt.name}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{opt.type}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <p className="text-lg font-black italic text-slate-900">{formatCurrency(Number(opt.amount || 1000))}</p>
                           <button 
                             onClick={() => handleAssignFee(opt.id, Number(opt.amount || 1000))}
                             disabled={assigningLoading || (alreadyHas && alreadyHas.amount > 0)}
                             className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30"
                           >
                             {alreadyHas && alreadyHas.amount > 0 ? "Already Assigned" : (assigningLoading ? "Syncing..." : "Assign Fee")}
                           </button>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-10">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-200 mx-auto" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-4">Loading Master Repository...</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <button 
                     onClick={() => setIsAssignModalOpen(false)}
                     className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
                   >
                     Close Registry
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── INSTITUTIONAL FEE MANAGEMENT (PRINCIPAL OVERRIDE) ─── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 p-10 mt-10 shadow-sm relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
         
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
               <h4 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3 text-slate-900 mb-1">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Institutional Fee Recognition
               </h4>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authorized Adjustments & Registry Sync</p>
            </div>
            
            <button 
              onClick={handleOpenAssignModal}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2 shadow-xl shadow-slate-200 active:scale-95"
            >
               <Plus className="w-4 h-4" /> Add Master Fee
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentData.financial?.components?.map((comp: any) => (
               <div key={comp.id} className="p-6 bg-slate-50/50 border border-slate-100 rounded-[2rem] hover:border-primary/20 transition-all group/item">
                  <div className="flex justify-between items-start mb-4">
                     <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{comp.masterComponent?.name}</p>
                        <p className="text-xl font-black text-slate-900 italic tracking-tighter">{formatCurrency(Number(comp.baseAmount))}</p>
                     </div>
                     <button 
                       onClick={() => setAdjustmentTarget({ id: comp.id, name: comp.masterComponent.name, amount: Number(comp.baseAmount) })}
                       className="p-3 bg-white text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl border border-slate-100 transition-all opacity-0 group-item-hover:opacity-100"
                     >
                        <Zap className="w-4 h-4" />
                     </button>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-tight">V.{comp.version || 1}</span>
                     {comp.lockReason && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-tight border border-amber-100/50">{comp.lockReason}</span>}
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* ─── ADJUSTMENT OVERLAY MODAL ─── */}
      <AnimatePresence>
        {adjustmentTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAdjustmentTarget(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-[4rem] shadow-2xl overflow-hidden border-4 border-white">
              <div className="p-12 space-y-10">
                <div>
                  <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">Adjustment Engine</h3>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Refining Component: {adjustmentTarget.name}</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">New Base Amount (₹)</label>
                    <input 
                      type="number"
                      defaultValue={adjustmentTarget.amount}
                      id="adj_amount"
                      className="w-full h-16 px-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-black text-2xl text-slate-900 transition-all italic"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Adjustment Reason (Audit Trial)</label>
                    <textarea 
                      placeholder="e.g. Principal approved sibling discount..."
                      id="adj_reason"
                      className="w-full h-32 p-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-medium text-slate-600 transition-all resize-none italic"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setAdjustmentTarget(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all">Cancel</button>
                  <button 
                    disabled={adjustmentLoading}
                    onClick={() => {
                      const amount = Number((document.getElementById('adj_amount') as HTMLInputElement).value);
                      const reason = (document.getElementById('adj_reason') as HTMLTextAreaElement).value;
                      handleUpdateFee(amount, reason);
                    }}
                    className="flex-[2] py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    {adjustmentLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    Commit Adjustment
                  </button>
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
