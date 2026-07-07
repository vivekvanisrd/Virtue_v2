"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, Loader2, X, CheckCircle2, UserCog 
} from "lucide-react";
import { updateStaffRoleAction } from "@/lib/actions/staff-actions";
import { cn } from "@/lib/utils";
import { toDisplayId } from "@/lib/utils/id-utils";

interface StaffRoleChangeModalProps {
  staff: {
    id: string;
    staffCode: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function StaffRoleChangeModal({ staff, onClose, onSuccess }: StaffRoleChangeModalProps) {
  const [selectedRole, setSelectedRole] = useState(staff.role || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const roles = [
    { value: "Teacher", label: "Teacher / Instructor" },
    { value: "Admin", label: "Administrator" },
    { value: "Management", label: "Management Staff" },
    { value: "Principal", label: "Principal" },
    { value: "Vice Principal", label: "Vice Principal" },
    { value: "FEE_COLLECTOR", label: "Fee Collector / Cashier" },
    { value: "Driver", label: "Driver / Transit Operator" },
    { value: "Clerk", label: "Clerk / Support Staff" },
    { value: "Owner", label: "Institution Owner" }
  ];

  const handleRoleChange = async () => {
    if (!selectedRole) return;
    if (selectedRole === staff.role) {
      onClose();
      return;
    }
    
    setLoading(true);
    setError("");
    
    const result = await updateStaffRoleAction(staff.id, selectedRole);
    
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || "Failed to update role.");
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
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground tracking-tight">Security Role Elevation</h3>
              <p className="text-xs font-bold text-foreground opacity-40 uppercase tracking-widest">Management Override</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Target Info */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border">
            <p className="text-[10px] font-black text-foreground opacity-40 uppercase tracking-widest mb-2">Personnel To Modify</p>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                 {staff.firstName[0]}{staff.lastName?.[0] || ""}
               </div>
               <div>
                  <p className="text-sm font-black text-foreground">{staff.firstName} {staff.lastName || ""}</p>
                  <p className="text-xs font-bold text-primary">{toDisplayId(staff.staffCode)}</p>
               </div>
            </div>
          </div>

          {/* Selection */}
          <div className="space-y-2">
            <label className="text-xs font-black text-foreground opacity-60 uppercase tracking-widest ml-1">
              Select New Security Role
            </label>
            <div className="relative group">
              <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground opacity-30 group-focus-within:text-amber-500 group-focus-within:opacity-100 transition-all" />
              <select 
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all appearance-none cursor-pointer"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                 <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          </div>

          {/* Security policy warning */}
          <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-xl flex gap-3">
             <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
             <div className="space-y-1">
                <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Security & Permissions Impact</p>
                <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                  Changing the security role will immediately update this staff member's administrative privileges and dashboard permissions. No other profile fields will be updated or validated.
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
             onClick={handleRoleChange}
             disabled={loading || selectedRole === staff.role}
             className="flex-[1.5] py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-black rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
             Update Role
           </button>
        </div>

      </div>
    </div>
  );
}
