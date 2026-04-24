"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  History, 
  User, 
  FileText 
} from "lucide-react";
import { 
  getPendingVoidRequests, 
  approveReceiptVoid, 
  rejectReceiptVoid 
} from "@/lib/actions/finance-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * VoidRequestManager
 * 
 * A premium administrative tray for managing receipt void requests.
 * Implements Step 2 of the Two-Factor Audit system.
 */
export function VoidRequestManager() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const res = await getPendingVoidRequests();
    if (res.success) setRequests(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to AUTHORIZE this reversal? This will update the ledger and cannot be undone.")) return;
    
    setActionId(id);
    const res = await approveReceiptVoid(id);
    if (res.success) {
      setRequests(prev => prev.filter(r => r.id !== id));
      setMessage({ type: "success", text: "Receipt voided and ledger reversed successfully." });
    } else {
      setMessage({ type: "error", text: res.error || "Approval failed." });
    }
    setActionId(null);
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    const res = await rejectReceiptVoid(id);
    if (res.success) {
      setRequests(prev => prev.filter(r => r.id !== id));
      setMessage({ type: "success", text: "Void request dismissed. Receipt restored to active status." });
    } else {
      setMessage({ type: "error", text: res.error || "Rejection failed." });
    }
    setActionId(null);
  };

  if (loading && requests.length === 0) return (
    <div className="flex items-center justify-center p-12 bg-slate-50 rounded-[3rem] border border-slate-100">
      <Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" />
    </div>
  );

  if (requests.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-rose-50/50 border-2 border-rose-100 rounded-[3rem] p-8 sm:p-12 mb-12 relative overflow-hidden"
    >
      <div className="absolute top-0 right-12 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-rose-200">
              <History className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-rose-900 tracking-tighter">Audit Required</h3>
              <p className="text-[10px] font-black text-rose-700 opacity-60 uppercase tracking-[0.2em] mt-1">Manager Authorization Needed for Reversals</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="px-5 py-2 bg-rose-100 text-rose-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-200">
                {requests.length} Pending Actions
             </span>
             <button onClick={fetchRequests} className="p-2 hover:bg-rose-200/50 rounded-xl transition-colors">
                <Loader2 className={cn("w-4 h-4 text-rose-400", loading && "animate-spin")} />
             </button>
          </div>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: "auto", opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "mb-8 p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold",
                message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-100 border-rose-200 text-rose-900"
              )}
            >
              <CheckCircle2 className="w-4 h-4" /> {message.text}
              <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((r) => {
            // Reason extraction: handle both string and array-of-objects if status is pushed
            const auditData = Array.isArray(r.allocatedTo) ? r.allocatedTo.find((i:any) => i.voidReason) : null;
            const reason = auditData?.voidReason || "Administrative Reversal Requested";
            const requestedBy = auditData?.requestedBy || "Staff";

            return (
              <motion.div 
                key={r.id} 
                layout
                className="bg-white p-8 rounded-[2.5rem] border-2 border-rose-100 shadow-xl shadow-rose-200/10 hover:shadow-rose-200/20 transition-all group"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 tracking-tight">{r.student.firstName} {r.student.lastName}</h4>
                    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest leading-none mt-1.5">
                       {r.student.academic?.class?.name} • #{r.student.history?.[0]?.admissionNumber || r.student.admissionNumber || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>Receipt Reference</span>
                    <span className="text-slate-900 font-black">{r.receiptNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-40">
                    <span>Batch Total</span>
                    <span className="text-rose-600 font-black">{formatCurrency(r.totalPaid)}</span>
                  </div>
                  <div className="pt-5 border-t border-rose-50/50">
                    <div className="flex items-center justify-between mb-3">
                       <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Audit Premise</p>
                       <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-md text-[8px] font-black uppercase">By {requestedBy}</span>
                    </div>
                    <p className="text-sm font-bold text-rose-900 leading-relaxed italic pr-4">
                       "{reason}"
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleApprove(r.id)}
                    disabled={actionId === r.id}
                    className="bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
                  >
                    {actionId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> AUTHORIZE</>}
                  </button>
                  <button 
                    onClick={() => handleReject(r.id)}
                    disabled={actionId === r.id}
                    className="bg-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center active:scale-95 disabled:opacity-50"
                  >
                    {actionId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
