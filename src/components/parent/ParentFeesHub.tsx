"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CreditCard, CheckCircle2, AlertCircle, Clock, Loader2, 
  Download, User, GraduationCap, Info, ChevronRight, CheckSquare, Square
} from "lucide-react";
import { 
  getParentStudentFeeStatus, 
  createParentRazorpayOrderAction, 
  verifyPublicRazorpayPaymentAction 
} from "@/lib/actions/finance-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";

interface Sibling {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  relationType: string;
  className: string;
  sectionName: string;
  branchName: string;
  schoolName: string;
}

interface ParentFeesHubProps {
  siblings: Sibling[];
  activeStudentId: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function ParentFeesHub({ siblings, activeStudentId }: ParentFeesHubProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [feeData, setFeeData] = useState<any>(null);
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);

  // Find active student
  const activeStudent = siblings.find(s => s.studentId === activeStudentId) || siblings[0];

  const loadFeeDetails = async () => {
    if (!activeStudentId) return;
    setLoading(true);
    const res = await getParentStudentFeeStatus(activeStudentId);
    if (res.success && res.data) {
      setFeeData(res.data);
      setSelectedTerms(new Set()); // Reset selections
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFeeDetails();
  }, [activeStudentId]);

  // Load Razorpay Script
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

  const handleSiblingChange = (studentId: string) => {
    setSelectedTerms(new Set());
    router.push(`/parent/dashboard/fees?studentId=${studentId}`);
  };

  const toggleTermSelection = (termKey: string, isPaid: boolean) => {
    if (isPaid) return; // Cannot pay already settled terms
    const newSelected = new Set(selectedTerms);
    if (newSelected.has(termKey)) {
      newSelected.delete(termKey);
    } else {
      newSelected.add(termKey);
    }
    setSelectedTerms(newSelected);
  };

  // Combine installments and any assigned ancillary fees into a unified ledger list
  const getLedgerItems = () => {
    if (!feeData || !feeData.feeBreakdown) return [];
    
    const items: any[] = [];
    
    // Add core tuition installments
    (feeData.feeBreakdown.installments || []).forEach((inst: any) => {
      items.push({
        key: inst.key,
        name: inst.label || inst.key.toUpperCase(),
        amount: inst.amount,
        balance: inst.balance !== undefined ? inst.balance : (inst.isPaid ? 0 : inst.amount),
        isPaid: inst.isPaid,
        type: "tuition"
      });
    });

    // Add assigned active ancillary items
    if (feeData.feeBreakdown.ancillary) {
      Object.entries(feeData.feeBreakdown.ancillary).forEach(([key, comp]: [string, any]) => {
        if (comp.amount > 0 || comp.isPaid) {
          items.push({
            key: key,
            name: comp.label,
            amount: comp.amount,
            balance: comp.isPaid ? 0 : comp.amount,
            isPaid: comp.isPaid,
            type: "ancillary"
          });
        }
      });
    }

    return items;
  };

  // Calculations for selected terms
  const getSelectedTotals = () => {
    if (!feeData || !feeData.feeBreakdown) return { base: 0, late: 0, total: 0 };
    let base = 0;
    let late = 0;

    const ledgerItems = getLedgerItems();
    selectedTerms.forEach(termKey => {
      const item = ledgerItems.find((i: any) => i.key === termKey);
      if (item) {
        base += Number(item.balance || 0);
      }
    });

    return { base, late, total: base + late };
  };

  const { base: selectedAmount, late: selectedLateFee, total: selectedBaseTotal } = getSelectedTotals();

  // Convenience and tax multiplier: 1.5% gateway fee + 18% GST (1.77%)
  const convenienceFee = selectedBaseTotal > 0 ? selectedBaseTotal * 0.0177 : 0;
  const grandTotal = selectedBaseTotal + convenienceFee;

  const handlePayNow = async () => {
    if (selectedTerms.size === 0) return;
    setProcessing(true);

    try {
      // 1. Create Order
      const orderRes = await createParentRazorpayOrderAction({
        amountPaid: selectedAmount,
        studentId: activeStudentId,
        selectedTerms: Array.from(selectedTerms),
        lateFeePaid: selectedLateFee
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.error || "Order creation failed.");
      }

      const orderData = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_SXq6vgnal7PtUM",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Virtue School",
        description: `Parent Portal Fee Payment - ${activeStudent.firstName}`,
        image: "https://mock-storage.supabase.co/school-logo.png",
        order_id: orderData.id,
        handler: async function (response: any) {
          setProcessing(true);
          // 3. Verify Payment
          const verifyRes = await verifyPublicRazorpayPaymentAction({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            studentId: activeStudentId,
            selectedTerms: Array.from(selectedTerms),
            amountPaid: orderData.baseAmount,
            lateFeePaid: orderData.lateFee,
            convenienceFee: orderData.convenienceFee
          });

          if (verifyRes.success && verifyRes.data) {
            setPaymentSuccess(verifyRes.data);
            setSelectedTerms(new Set());
            loadFeeDetails(); // Reload ledger state
          } else {
            alert(`Payment verification failed: ${verifyRes.error || "Please contact administration."}`);
          }
          setProcessing(false);
        },
        prefill: {
          name: activeStudent.firstName + " " + activeStudent.lastName,
          contact: "",
          email: ""
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
      setProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-500 animate-pulse">Loading Ledger Statement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Sibling Switcher Tabs */}
      {siblings.length > 1 && (
        <div className="bg-card/45 border border-border p-2 rounded-2xl flex flex-wrap gap-2 print:hidden">
          {siblings.map((sibling) => {
            const isActive = sibling.studentId === activeStudent.studentId;
            return (
              <button
                key={sibling.studentId}
                onClick={() => handleSiblingChange(sibling.studentId)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-background/40 text-foreground/75 hover:text-foreground border border-border/80"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {sibling.firstName} {sibling.lastName}
              </button>
            );
          })}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-gradient-to-br from-card to-background border border-border rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl print:border-none print:shadow-none print:p-0">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 blur-[80px] rounded-full pointer-events-none print:hidden" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg print:hidden">
              {activeStudent.firstName[0]}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{activeStudent.firstName} {activeStudent.lastName}</h2>
              <p className="text-xs opacity-55 font-bold mt-0.5">Student Code: {activeStudent.studentCode}</p>
              <p className="text-xs opacity-80 font-semibold mt-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                {activeStudent.className} — Section {activeStudent.sectionName}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right border-t md:border-t-0 border-border/65 pt-4 md:pt-0">
            <p className="text-[10px] opacity-45 font-bold uppercase tracking-wider">Campus Branch</p>
            <p className="text-sm font-black">{activeStudent.branchName}</p>
            <p className="text-xs opacity-60 font-semibold mt-0.5">{activeStudent.schoolName}</p>
          </div>
        </div>
      </div>

      {paymentSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 p-6 rounded-3xl space-y-4 animate-in fade-in zoom-in-95 duration-300 print:bg-white print:border-none print:text-black">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0 print:hidden" />
            <div>
              <h3 className="text-lg font-black tracking-tight">Payment Recorded Successfully</h3>
              <p className="text-xs opacity-85">Receipt No: <strong>{paymentSuccess.receiptNumber}</strong>. Reference Code: {paymentSuccess.paymentReference}</p>
            </div>
          </div>
          <div className="border-t border-emerald-500/10 pt-4 flex flex-col md:flex-row md:justify-between text-xs gap-3">
            <div>
              <p className="opacity-75 font-semibold">Allocated Terms:</p>
              <p className="font-black text-sm uppercase">{paymentSuccess.allocatedTo?.terms?.join(", ")}</p>
            </div>
            <div>
              <p className="opacity-75 font-semibold">Total Paid Amount:</p>
              <p className="font-black text-sm text-emerald-600 print:text-black">{formatCurrency(paymentSuccess.totalPaid)}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <button 
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button 
                onClick={() => setPaymentSuccess(null)}
                className="px-4 py-2 bg-background/50 border border-emerald-500/20 text-emerald-800 rounded-xl font-bold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {feeData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {/* Card 1: Paid to Date */}
          <div className="bg-card/40 border border-border/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Total Paid</p>
              <p className="text-2xl font-black mt-2 text-emerald-500">{formatCurrency(feeData.feeBreakdown.paidTotal)}</p>
              <p className="text-[10px] opacity-40 font-bold mt-1">Directly recorded in ledger</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Net Outstanding */}
          <div className="bg-card/40 border border-border/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Pending Balance</p>
              <p className="text-2xl font-black mt-2 text-rose-500">{formatCurrency(feeData.feeBreakdown.dueTotal)}</p>
              <p className="text-[10px] opacity-40 font-bold mt-1">Outstanding active terms</p>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          {/* Card 3: Total Discounts */}
          <div className="bg-card/40 border border-border/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Total Discounts</p>
              <p className="text-2xl font-black mt-2 text-primary">{formatCurrency(feeData.feeBreakdown.totalDiscount || 0)}</p>
              <p className="text-[10px] opacity-40 font-bold mt-1">Concessions and scholarships</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
              <Info className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Main Term Breakdown Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-md print:border-none print:shadow-none">
        <div className="p-6 border-b border-border/80 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black">Fee Ledger Breakdown</h3>
            <p className="text-xs opacity-50 mt-0.5">Select pending terms to process online payment</p>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {getLedgerItems().map((item: any) => {
            const isPaid = item.isPaid || item.balance === 0;
            const isSelected = selectedTerms.has(item.key);

            return (
              <div 
                key={item.key}
                onClick={() => toggleTermSelection(item.key, isPaid)}
                className={`p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isPaid 
                    ? "opacity-60 bg-slate-50/20" 
                    : "cursor-pointer hover:bg-muted/30"
                } ${isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 print:hidden">
                    {isPaid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : isSelected ? (
                      <CheckSquare className="w-5 h-5 text-primary shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wider">{item.name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs opacity-60 font-semibold">
                      <span>Total Amount: {formatCurrency(item.amount)}</span>
                      {item.balance > 0 && item.balance !== item.amount && (
                        <span className="text-amber-600">Pending Balance: {formatCurrency(item.balance)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-between md:justify-end">
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-wider opacity-45">Outstanding</p>
                    <p className="font-black text-sm">{formatCurrency(item.balance)}</p>
                  </div>
                  <div>
                    {isPaid ? (
                      <span className="px-3 py-1 bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Paid</span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Razorpay Gateway Checkout Drawer */}
      {selectedTerms.size > 0 && (
        <div className="bg-card border border-primary/20 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 animate-in slide-in-from-bottom-5 duration-300 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-wider rounded-md">
                {selectedTerms.size} Term(s) Selected
              </span>
              <p className="text-xs opacity-50 font-bold">Convenience fee (1.77%) applies</p>
            </div>
            <div className="flex flex-wrap gap-x-4 items-baseline">
              <p className="text-lg font-black tracking-tight">{formatCurrency(grandTotal)}</p>
              <p className="text-xs opacity-55 font-bold line-through">{formatCurrency(selectedBaseTotal)}</p>
            </div>
            <p className="text-[9px] opacity-40 font-bold">
              Base: {formatCurrency(selectedAmount)} + Late Fee: {formatCurrency(selectedLateFee)} + Gateway: {formatCurrency(convenienceFee)}
            </p>
          </div>

          <button
            onClick={handlePayNow}
            disabled={processing}
            className="px-8 py-4 bg-primary hover:bg-primary/95 disabled:bg-slate-200 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all shrink-0 cursor-pointer"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Pay via Razorpay <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Past Collections/Receipt History */}
      {feeData?.collections?.length > 0 && (
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4 print:hidden">
          <div>
            <h3 className="text-base font-black">Payment Log & Receipts</h3>
            <p className="text-xs opacity-50 mt-0.5">Historical payments recorded online or at campus</p>
          </div>

          <div className="divide-y divide-border/60">
            {feeData.collections.map((log: any) => (
              <div key={log.id} className="py-4 flex justify-between items-center text-xs">
                <div>
                  <p className="font-black text-sm text-foreground/90">{log.receiptNumber}</p>
                  <p className="opacity-50 mt-0.5">Mode: {log.paymentMode} • Ref: {log.paymentReference || "N/A"}</p>
                  <p className="opacity-40 text-[10px] mt-0.5">{new Date(log.paymentDate).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-emerald-600">{formatCurrency(log.totalPaid)}</p>
                  <button 
                    onClick={() => {
                      setPaymentSuccess(log);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-[10px] text-primary hover:underline font-bold mt-1 block cursor-pointer"
                  >
                    View Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
