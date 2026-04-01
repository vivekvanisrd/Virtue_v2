"use client";

import React from "react";
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getStaffHubStats } from "@/lib/actions/staff-actions";
import { useTenant } from "@/context/tenant-context";

export function StaffHub() {
  const { academicYear } = useTenant();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      const result = await getStaffHubStats();
      if (result.success) setStats(result.data);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-4 text-indigo-600">
           <div className="w-10 h-10 border-2 border-current border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Staff Records...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-foreground tracking-tight underline decoration-indigo-500/20 underline-offset-8 italic">Staff Registry Hub</h2>
          <p className="text-foreground opacity-40 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Employee Lifecycle & Directory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-8 bg-indigo-600 rounded-[3rem] text-white flex flex-col justify-between h-64 relative overflow-hidden shadow-2xl shadow-indigo-200 group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl opacity-50 transition-all duration-700 group-hover:scale-150 group-hover:opacity-100" />
           <div className="relative z-10">
              <Users className="w-8 h-8 mb-4 text-white opacity-40" />
              <h3 className="text-4xl font-black tracking-tighter">{stats?.totalStaff || 0}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Workforce</p>
           </div>
           
           <div className="relative z-10 flex gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">{stats?.activeStaff || 0} Active</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest">{stats?.supportStaff || 0} Support</span>
           </div>
        </div>

        <div className="p-8 bg-white border border-border rounded-[3rem] flex flex-col justify-between h-64 shadow-xl shadow-slate-100/50">
           <div>
              <div className="flex items-center justify-between mb-6">
                 <div className="w-10 h-10 bg-emerald-100/50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                 </div>
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">+4 New Hires</span>
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">Recruitment Active</h3>
              <p className="text-xs font-medium text-foreground opacity-40 mt-1 leading-relaxed">System is tracking 4 new onboarding cycles for Academic Year 2025-26.</p>
           </div>
           
           <button className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest hover:translate-x-1 transition-transform">
              Review Pipeline <TrendingUp className="w-4 h-4" />
           </button>
        </div>

        <div className="p-8 bg-slate-900 rounded-[3rem] text-white flex flex-col justify-between h-64 relative overflow-hidden shadow-2xl">
           <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
           <div className="relative z-10">
              <ShieldCheck className="w-8 h-8 mb-4 text-primary" />
              <h3 className="text-xl font-black italic mb-2 tracking-tight">Security & Roles</h3>
              <p className="text-xs font-medium opacity-50 leading-relaxed">Audit and manage access levels across the school directory for all employees.</p>
           </div>
           
           <button className="w-full py-4 bg-white/5 hover:bg-white/10 transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 shadow-xl">
              Configure RBAC
           </button>
        </div>
      </div>
    </div>
  );
}
