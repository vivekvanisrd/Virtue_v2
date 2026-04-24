"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Wallet, ArrowRight, ShieldAlert, CheckCircle2, User, ReceiptText, Settings2 } from "lucide-react";
import { FeeCollectionForm } from "../finance/FeeCollectionForm";
import { FeeStructureManager } from "../finance/FeeStructureManager";
import { DailyCollectionSummary } from "../finance/DailyCollectionSummary";
import { PayrollManager } from "../finance/PayrollManager";
import RazorpayPaymentReport from "../finance/RazorpayPaymentReport";
import { useTabs } from "@/context/tab-context";
import { 
  getRevenueLeakageReport, 
  approveReceiptVoid, 
  rejectReceiptVoid, 
  getPendingVoidRequests, 
  getCollectionHistory 
} from "@/lib/actions/finance-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";

interface FinanceContentProps {
  tabId?: string;
  params?: any;
}

export function FinanceContent({ tabId, params }: FinanceContentProps) {
  const [leakage, setLeakage] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [voids, setVoids] = useState<any[]>([]);
  const { openTab } = useTabs();

  useEffect(() => {
    async function loadAudit() {
      const [report, pendingVoids] = await Promise.all([
        getRevenueLeakageReport(),
        getPendingVoidRequests()
      ]);
      if (report.success) setLeakage(report.data);
      if (pendingVoids.success) setVoids(pendingVoids.data);
    }
    if (!tabId || tabId === "finance") loadAudit();
  }, [tabId]);

  const handleApproveVoid = async (id: string) => {
    setLoading(true);
    const res = await approveReceiptVoid(id);
    if(res.success) setVoids(prev => prev.filter(v => v.id !== id));
    setLoading(false);
  };

  const handleRejectVoid = async (id: string) => {
    setLoading(true);
    const res = await rejectReceiptVoid(id);
    if(res.success) setVoids(prev => prev.filter(v => v.id !== id));
    setLoading(false);
  };

  const handleOpenProfile = (studentId: string, name: string) => {
    openTab({
       id: `student-profile-${studentId}`,
       title: name,
       icon: User,
       component: "Students",
       params: { studentId }
    });
  };

  // Detect if we should FORCE the Fee Collection form (DeepLink Mode)
  const isDirectCollection = tabId === "fee-collection" || params?.studentId;

  if (isDirectCollection) {
    const activeStudentId = params?.studentId;
    return <FeeCollectionForm key={activeStudentId || "fee-search"} params={params} />;
  }

  if (tabId === "fee-manager") {
    return <FeeStructureManager />;
  }

  if (tabId === "payroll") {
    return <PayrollManager />;
  }

  if (tabId === "razorpay-audit") {
    return <RazorpayPaymentReport onBack={() => openTab({ id: "finance", title: "Finance Hub", component: "Finance" })} />;
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-foreground tracking-tighter italic">Financial Hub</h2>
          <p className="text-foreground opacity-40 font-bold uppercase tracking-widest text-[10px] mt-2">Centralized Revenue & Ledger Management</p>
        </div>
        
        {leakage.length > 0 && (
          <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 px-5 py-3 rounded-2xl shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <div>
              <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest leading-none">Revenue Leakage Detected</p>
              <p className="text-sm font-black text-rose-900">{leakage.length} Students Missing Fee Structure</p>
            </div>
          </div>
        )}
      </div>

      <div className="animate-in slide-in-from-right-4 duration-500">
        <DailyCollectionSummary />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900 text-white p-12 rounded-[3.5rem] relative overflow-hidden group shadow-2xl shadow-slate-200">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-all duration-1000" />
           
           <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <h3 className="text-3xl font-black mb-4 tracking-tight">Financial Health Portal</h3>
                <p className="text-white/50 max-w-sm font-medium leading-relaxed">
                  Real-time synchronization active. All ledger entries are hashed and audit-safe. Use this hub to process fee settlements and monitor multi-branch revenue.
                </p>
              </div>

                  <div className="mt-12 flex flex-wrap gap-4">
                      <button 
                        onClick={() => openTab({ id: "fee-collection", title: "Fee Collection", icon: Wallet, component: "Finance" })}
                        className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center gap-3"
                      >
                        <Wallet className="w-4 h-4" /> Collect Fees
                      </button>
                      <button 
                        onClick={() => openTab({ id: "fee-manager", title: "Fee Management", icon: Settings2, component: "Finance" })}
                        className="px-10 py-5 bg-white/10 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest backdrop-blur-sm hover:bg-white/20 transition-all flex items-center gap-3"
                      >
                        <Settings2 className="w-4 h-4" /> Update Structure
                      </button>
                      <button 
                        onClick={() => openTab({ id: "payroll", title: "Monthly Payroll", icon: ReceiptText, component: "Finance" })}
                        className="px-10 py-5 bg-indigo-500/20 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest backdrop-blur-sm border border-indigo-500/30 hover:bg-indigo-500/40 transition-all flex items-center gap-3"
                      >
                        <ReceiptText className="w-4 h-4" /> Payroll Engine
                      </button>
                  </div>
           </div>
        </div>

        <div className="bg-white border-4 border-slate-50 p-10 rounded-[3.5rem] shadow-xl shadow-slate-100 flex flex-col justify-between">
           <div className="space-y-6">
              <div className="flex items-center gap-3 text-primary opacity-60">
                 <ShieldAlert className="w-6 h-6" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Audit Summary</span>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                   <span className="text-xs font-bold opacity-40">Resolved Collections</span>
                   <span className="text-2xl font-black">214</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-50 pb-4 relative group">
                   <span className="text-xs font-bold opacity-40">Void Requests</span>
                   <span className={cn("text-2xl font-black", voids.length > 0 ? "text-amber-500 animate-pulse" : "text-foreground")}>
                      {voids.length}
                   </span>
                </div>
              </div>
           </div>

           <button className="w-full mt-8 py-5 bg-muted rounded-[2rem] text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 hover:bg-primary hover:text-white transition-all">
              Run Safety Audit
           </button>
        </div>
      </div>

      {/* Void Requests Panel */}
      {voids.length > 0 && (
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                 <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Pending Void Approvals</h3>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {voids.map(v => {
                const voidReq = Array.isArray(v.allocatedTo) ? v.allocatedTo.find((i:any) => i.voidReason) : null;
                const reason = voidReq?.voidReason || "Administrative Reversal";
                return (
                  <div key={v.id} className="p-6 bg-white border border-amber-100 rounded-[2.5rem] hover:shadow-xl hover:shadow-amber-100 transition-all group">
                     <div className="flex justify-between items-start mb-4">
                        <div onClick={() => handleOpenProfile(v.studentId, `${v.student?.firstName} ${v.student?.lastName}`)} className="cursor-pointer">
                           <p className="font-black text-lg group-hover:text-primary transition-colors">{v.student?.firstName} {v.student?.lastName}</p>
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{v.student?.academic?.class?.name} • #{v.receiptNumber}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-black text-lg text-amber-600">{formatCurrency(v.totalPaid)}</p>
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Requested by {voidReq?.requestedBy || "Agent"}</p>
                        </div>
                     </div>
                     <div className="bg-amber-50 p-4 rounded-3xl mb-4 border border-amber-100/50">
                        <p className="text-xs font-bold text-amber-900 leading-relaxed italic border-l-2 border-amber-400 pl-3">"{reason}"</p>
                     </div>
                     <div className="flex gap-2">
                        <button disabled={loading} onClick={() => handleApproveVoid(v.id)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-amber-200 disabled:opacity-50">
                           Authorize Void
                        </button>
                        <button disabled={loading} onClick={() => handleRejectVoid(v.id)} className="flex-1 py-3 bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all disabled:opacity-50">
                           Deny & Maintain
                        </button>
                     </div>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      {/* Revenue Leakage View */}
      {leakage.length > 0 && (
        <div className="space-y-6">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                 <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black tracking-tight">Active Students Missing Fee Records</h3>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leakage.map(s => (
                <div key={s.id} onClick={() => handleOpenProfile(s.id, `${s.firstName} ${s.lastName}`)} className="p-6 bg-white border border-rose-100 rounded-[2.5rem] flex items-center justify-between hover:shadow-xl hover:shadow-rose-100 transition-all group cursor-pointer">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black group-hover:bg-rose-600 group-hover:text-white transition-all">
                         {s.firstName[0]}
                      </div>
                      <div>
                         <p className="font-black text-sm group-hover:text-rose-600 transition-colors">{s.firstName} {s.lastName}</p>
                         <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{s.academic?.class?.name} • #{s.admissionNumber}</p>
                      </div>
                   </div>
                   <button className="p-2 bg-rose-600 text-white rounded-xl opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all shadow-lg">
                      <ArrowRight className="w-4 h-4" />
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
