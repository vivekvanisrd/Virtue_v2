"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, ArrowRightLeft, ShieldAlert, Loader2, X, CheckCircle2 
} from "lucide-react";
import { getBranchesAction } from "@/lib/actions/tenancy-actions";
import { transferStaffBranchAction } from "@/lib/actions/staff-actions";
import { cn } from "@/lib/utils";

interface StaffTransferModalProps {
  staff: {
    id: string;
    staffCode: string;
    firstName: string;
    lastName: string;
    branchId: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffTransferModal({ staff, onClose, onSuccess }: StaffTransferModalProps) {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBranches = async () => {
      const result = await getBranchesAction();
      if (result.success && result.data) {
        // Filter out current branch
        setBranches(result.data.filter((b: any) => b.id !== staff.branchId));
      }
      setInitialLoading(false);
    };
    fetchBranches();
  }, [staff.branchId]);

  const handleTransfer = async () => {
    if (!selectedBranchId) return;
    
    setLoading(true);
    setError("");
    
    const result = await transferStaffBranchAction(staff.id, selectedBranchId);
    
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Failed to transfer staff.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/30 relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted transition-colors text-foreground opacity-40 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Inter-Campus Transfer</h3>
              <p className="text-xs font-bold text-foreground opacity-40 uppercase tracking-widest">Management Override</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Target Info */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-[10px] font-black text-foreground opacity-40 uppercase tracking-widest mb-2">Personnel To Transfer</p>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                 {staff.firstName[0]}{staff.lastName?.[0]}
               </div>
               <div>
                  <p className="text-sm font-black text-foreground">{staff.firstName} {staff.lastName}</p>
                  <p className="text-xs font-bold text-primary">{staff.staffCode}</p>
               </div>
            </div>
          </div>

          {/* Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-foreground opacity-60 uppercase tracking-widest ml-1">
              Select Destination Campus
            </label>
            {initialLoading ? (
              <div className="h-11 bg-muted/50 animate-pulse rounded-lg border border-border" />
            ) : (
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
                <select 
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer",
                    !selectedBranchId && "text-foreground opacity-40"
                  )}
                >
                  <option value="">Choose a branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                   <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
             <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
             <div className="space-y-1">
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Identity Re-Issuance Policy</p>
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                  Moving this staff will change their <span className="underline">Technical Staff Code</span> to match the destination campus identity prefix. Previous metadata (ID, Department log) will be updated.
                </p>
             </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-[11px] font-bold">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
           <button 
             onClick={onClose}
             className="flex-1 py-3 text-sm font-black text-foreground opacity-60 hover:bg-muted rounded-xl transition-colors border border-transparent hover:border-border"
           >
             Cancel
           </button>
           <button 
             onClick={handleTransfer}
             disabled={!selectedBranchId || loading}
             className="flex-[1.5] py-3 bg-primary text-white text-sm font-black rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
             Initiate Transfer
           </button>
        </div>

      </div>
    </div>
  );
}
