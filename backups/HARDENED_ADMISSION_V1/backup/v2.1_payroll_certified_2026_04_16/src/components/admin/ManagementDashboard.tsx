"use client";

import React, { useEffect, useState } from "react";
import { getManagementFinancialsAction } from "@/lib/actions/financial-analytics-actions";
import { 
  TrendingUp, ShieldAlert, Zap, Wallet, 
  ArrowUpRight, Users, Clock, AlertTriangle,
  Loader2, RefreshCcw, Landmark
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";

export function ManagementDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getManagementFinancialsAction();
    if (res.success) setData(res.data);
    setLoading(false);
  };

  if (loading || !data) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 bg-slate-950/20 rounded-[40px] border-2 border-dashed border-slate-200">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Financial Pulse...</p>
      </div>
    );
  }

  const { dailyStats, impact, riskFlags } = data;
  const concessionRatio = (impact.totalDiscounts / impact.grossPotential) * 100;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. Daily Pulse & Liquidity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-white/5 rounded-[32px] p-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 text-indigo-500/10 group-hover:text-indigo-500/20 transition-colors">
            <Landmark className="w-20 h-20" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                <TrendingUp className="w-4 h-4" />
                Academic Pulse
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">{formatCurrency(dailyStats.academic)}</h2>
            <p className="text-slate-500 text-xs font-medium">Daily Collections (Academic)</p>
          </div>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-[32px] p-8 relative overflow-hidden group shadow-xl">
           <div className="absolute top-0 right-0 p-8 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
            <Zap className="w-20 h-20" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                <Clock className="w-4 h-4" />
                Transport Pulse
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">{formatCurrency(dailyStats.transport)}</h2>
            <p className="text-emerald-500/60 text-xs font-medium">Collection Daily Aggregate (Standalone)</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 rounded-[32px] p-8 space-y-6 shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Collection Mode Meta</h3>
            <div className="space-y-4">
                {Object.entries(dailyStats.byMode).map(([mode, amt]: any) => (
                    <div key={mode} className="flex items-center justify-between group">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{mode}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-black text-white">{formatCurrency(amt)}</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 2. Risk Shield & Concession Impact */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Risk Flags Panel */}
        <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                        Risk Shield Analytics
                    </h3>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">30-Day Staff Action Monitoring</p>
                </div>
                <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                    {riskFlags.length} Alerts Detected
                </div>
            </div>

            <div className="space-y-4">
                {riskFlags.length === 0 ? (
                    <div className="p-10 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                         <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                            <Zap className="w-6 h-6 fill-current" />
                         </div>
                         <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">Financial Pattern: SECURE</p>
                    </div>
                ) : (
                    riskFlags.map((flag: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 hover:bg-red-50 transition-colors rounded-3xl group border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-red-500 group-hover:border-red-200 transition-all">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{flag.staff}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{flag.reason}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-widest">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {flag.severity}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Concession Impact Radar */}
        <div className="bg-slate-900 rounded-[40px] border border-white/5 p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 blur-[100px] group-hover:bg-indigo-500/20 transition-all rounded-full" />
            
            <div className="relative z-10 flex flex-col h-full justify-between gap-10">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full px-4 py-1.5">
                        <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Revenue Yield Report</span>
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">Concession Impact: <span className={cn(concessionRatio > 15 ? "text-red-400" : "text-emerald-400")}>{concessionRatio.toFixed(1)}%</span></h3>
                    <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Percentage of 2026-27 gross revenue potential allocated as tuition discounts and admission waivers.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2">
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gross Potential</p>
                        <p className="text-xl font-black text-white tracking-tight">{formatCurrency(impact.grossPotential)}</p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-2">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Total Concessions</p>
                        <p className="text-xl font-black text-indigo-400 tracking-tight">{formatCurrency(impact.totalDiscounts)}</p>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* 3. Operational Quick Actions */}
      <div className="flex items-center gap-4 pt-4">
        <button 
           onClick={loadData}
           className="bg-slate-900 hover:bg-slate-800 text-slate-400 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border border-white/5"
        >
            <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh Portfolio
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2 transition-all active:scale-95">
            <TrendingUp className="w-3.5 h-3.5" />
            Generate PDF Recap
        </button>
      </div>

    </div>
  );
}
