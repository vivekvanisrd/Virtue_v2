"use client";

import React from "react";
import { 
  Briefcase, 
  Wallet, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getSalaryHubStats } from "@/lib/actions/staff-actions";
import { useTabs } from "@/context/tab-context";

export function SalaryHub() {
  const { openTab } = useTabs();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      const result = await getSalaryHubStats();
      if (result.success) setStats(result.data);
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-4 text-primary">
           <div className="w-10 h-10 border-2 border-current border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Calculating Payroll...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-foreground tracking-tight italic underline decoration-blue-500/20 underline-offset-8">Human Capital Hub</h2>
          <p className="text-foreground opacity-40 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Payroll & Compensation Management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Payroll Budget (Mar)", value: stats?.totalBudget || "₹0", icon: Wallet, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Active Staff", value: stats?.staffCount || "0", icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Pending Payouts", value: "₹0", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" }
        ].map((stat, i) => (
          <div key={i} className={cn("p-8 rounded-[2.5rem] border border-border/50 flex flex-col justify-between", stat.bg)}>
             <div className={cn("w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6", stat.color)}>
               <stat.icon className="w-6 h-6" />
             </div>
             <div>
               <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">{stat.label}</p>
               <p className="text-3xl font-black text-foreground">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 max-w-sm">
               <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full w-fit">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Next Cycle: Apr 01</span>
               </div>
               <h3 className="text-2xl font-black italic">Payroll Preparation Active</h3>
               <p className="text-sm font-medium opacity-50 leading-relaxed">
                  The unified payroll manager is currently aggregating attendance data and incentive multipliers. Ensure all over-time logs are validated by EOD.
               </p>
                <button 
                  onClick={() => openTab({ id: "salary-manager", title: "Payroll Manager", component: "Salaries" })}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 transition-all text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 group shadow-xl shadow-blue-900/50"
                >
                   Execute Payroll Run <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
                <button 
                  onClick={() => openTab({ id: "salary-payments", title: "Manage Salaries", component: "Salaries" })}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 transition-all text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 border border-white/20"
                >
                   Manage Salary Registry
                </button>
                <button 
                  onClick={() => openTab({ id: "salary-advances", title: "Staff Advances", component: "Salaries" })}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 transition-all text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center gap-2 border border-white/10"
                >
                   Manage Staff Advances
                </button>
            </div>
            <div className="hidden lg:flex gap-4 items-end">
               {[60, 40, 80, 50, 90].map((h, i) => (
                 <div key={i} className="w-3 bg-white/10 rounded-full h-32 relative flex items-end">
                    <div className="w-full bg-blue-500 rounded-full transition-all duration-1000" style={{ height: `${h}%` }} />
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}
