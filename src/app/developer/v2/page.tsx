"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Database, 
  ShieldCheck, 
  Globe, 
  Zap, 
  Cpu, 
  HardDrive,
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  RefreshCcw,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { getDatabaseHealth, getGlobalData } from "@/lib/actions/dev-actions";
import { cn } from "@/lib/utils";

export default function V2PulseDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [global, setGlobal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    async function load() {
        setIsLoading(true);
        const [hRes, gRes] = await Promise.all([
            getDatabaseHealth(),
            getGlobalData()
        ]);
        if (hRes.success) setStats(hRes.data);
        if (gRes.success) setGlobal(gRes.data);
        setIsLoading(false);
    }
    load();
  }, []);

  if (!isMounted) return null;

  return (
    <div className="space-y-10">
      {/* 🚀 Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">System <span className="text-indigo-600 italic">Pulse</span></h2>
            <p className="text-sm font-medium text-slate-500">Real-time health monitoring & tenant distribution.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-2 border border-emerald-100 shadow-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">Network Operational</span>
            </div>
            <button className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                <RefreshCcw className="w-4 h-4 text-slate-400" />
            </button>
        </div>
      </div>

      {/* 🏮 Gaugues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
            { label: 'DB Connections', value: stats?.activeConnections || '---', icon: Database, color: 'indigo' },
            { label: 'Tenancy Integrity', value: '100%', icon: ShieldCheck, color: 'emerald' },
            { label: 'Global Latency', value: '14ms', icon: Globe, color: 'cyan' },
            { label: 'API Uptime', value: '99.9%', icon: Zap, color: 'amber' }
        ].map((g, i) => (
            <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all"
            >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", `bg-${g.color}-50 text-${g.color}-600`)}>
                    <g.icon className="w-6 h-6" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{g.label}</div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{g.value}</div>
            </motion.div>
        ))}
      </div>

      {/* 📊 Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-10">
            {/* Health Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                    { label: 'CPU LOAD', val: '12%', status: 'nominal', icon: Cpu },
                    { label: 'DISK I/O', val: 'Low', status: 'optimal', icon: HardDrive },
                    { label: 'SYNC HUB', val: 'Live', status: 'online', icon: Activity },
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <item.icon className="w-5 h-5 text-slate-400" />
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
                            <div className="text-xl font-black text-slate-900">{item.val}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Registry Distribution Card */}
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900">Registry Distribution</h3>
                        <p className="text-xs font-medium text-slate-500">Geographic & logical multi-tenant mapping</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {global?.schools?.map((s: any, i: number) => (
                        <div key={s.id} className="group p-5 rounded-3xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-600/5 transition-all flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-110 transition-transform">
                                {s.id.substring(0, 2)}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-black text-slate-900">{s.name}</span>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-[8px] font-black text-indigo-600 rounded-md uppercase tracking-tighter">{s.code}</span>
                                </div>
                                <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-indigo-400" /> {s._count?.students || 0} Students</span>
                                    <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3 text-cyan-400" /> {s._count?.branches || 0} Branches</span>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                    ))}
                    {isLoading && [1,2,3].map(i => <div key={i} className="h-20 bg-slate-50 rounded-3xl animate-pulse" />)}
                </div>
            </div>
        </div>

        {/* Right Column: Activity Stream */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/20">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">System Log</h3>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                </div>

                <div className="space-y-6 font-mono text-[10px]">
                    {[
                        { time: '14:22:05', msg: 'School registration VGA-01 successful', status: 'ok' },
                        { time: '14:21:44', msg: 'Branch master counter synchronized', status: 'ok' },
                        { time: '14:20:12', msg: 'Atomic rollback sequence: NIL', status: 'system' },
                        { time: '14:18:59', msg: 'ID nomenclature filter audit passed', status: 'ok' },
                        { time: '14:15:33', msg: 'Crisis console high-alert clearing', status: 'warning' },
                    ].map((log, i) => (
                        <div key={i} className="flex gap-4 border-l border-white/10 pl-4 py-1">
                            <span className="text-slate-500 font-bold">{log.time}</span>
                            <span className={cn(log.status === 'ok' ? 'text-emerald-400' : log.status === 'warning' ? 'text-amber-400' : 'text-indigo-400')}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="p-8 rounded-[2.5rem] border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Growth Index</div>
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex items-end gap-3">
                    <div className="text-4xl font-black tracking-tight">+14%</div>
                    <div className="text-[10px] font-bold text-emerald-500 mb-1">THIS MONTH</div>
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest leading-none">Security Center</h4>
                </div>
                <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-6">
                    All registry edits are currently being logged under the Root Authority profile. 
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 w-fit px-4 py-2 rounded-xl">
                    <ShieldCheck className="w-3 h-3" /> Encrypted Session
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
