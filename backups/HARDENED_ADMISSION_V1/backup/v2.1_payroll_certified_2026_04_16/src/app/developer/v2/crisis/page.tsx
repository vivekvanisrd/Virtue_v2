"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  Zap, 
  RefreshCcw, 
  Database, 
  Lock, 
  Terminal,
  Activity,
  ArrowRight,
  AlertTriangle,
  Settings2,
  Cpu,
  Fingerprint,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
    remapSchoolIdAction, 
    remapBranchIdAction, 
    forceResetCounterAction 
} from '@/lib/actions/crisis-actions';
import { cn } from "@/lib/utils";

export default function V2CrisisConsole() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'remap' | 'counters'>('remap');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[LOG] INITIALIZING HIGH-CLEARANCE COMMAND CENTER..."]);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Form States
  const [remapData, setRemapData] = useState({ oldId: '', newId: '', type: 'SCHOOL' as 'SCHOOL' | 'BRANCH' });
  const [counterData, setCounterData] = useState({ schoolId: '', branchId: 'GLOBAL', type: '', year: '', newValue: 0 });

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRemap = async () => {
    if (!remapData.oldId || !remapData.newId) return;
    setIsLoading(true);
    addLog(`INITIATING ${remapData.type} REMAP...`);
    const res = remapData.type === 'SCHOOL' 
        ? await remapSchoolIdAction(remapData.oldId, remapData.newId)
        : await remapBranchIdAction(remapData.oldId, remapData.newId);
    setResult(res);
    setIsLoading(false);
  };

  const handleCounterUpdate = async () => {
    setIsLoading(true);
    addLog(`FORCING COUNTER ALIGNMENT: ${counterData.type}...`);
    const res = await forceResetCounterAction(counterData);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div className="space-y-10">
      {/* 🔮 Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100 w-fit">
                <ShieldAlert className="w-3 h-3" /> High-Clearance Restricted
            </div>
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">Crisis <span className="text-red-600 italic">Console</span></h2>
            <p className="text-sm font-medium text-slate-500">Atomic surgical tools for registry corruption and identifier remapping.</p>
        </div>
      </section>

      {/* 🏮 Security Banner */}
      <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl shadow-red-900/10">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Fingerprint className="w-48 h-48 rotate-12" />
        </div>
        <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="w-20 h-20 rounded-3xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/30 shrink-0">
                <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
                <h3 className="text-xl font-black tracking-tight mb-2 uppercase italic">DANGER ZONE: SURGICAL OVERRIDE</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
                    By proceeding, you unlock the ability to perform manual cascading updates on primary database keys. 
                    Incorrect usage can lead to orphaned records and broken tenant isolation.
                </p>
            </div>
            <div className="flex gap-3">
                <button 
                  onClick={() => setActiveTab('remap')}
                  className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'remap' ? "bg-red-600 text-white" : "bg-white/5 text-slate-500 hover:text-white")}
                >REMAP ID</button>
                <button 
                  onClick={() => setActiveTab('counters')}
                  className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'counters' ? "bg-red-600 text-white" : "bg-white/5 text-slate-500 hover:text-white")}
                >ALIGN SEQUENCE</button>
            </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left: Command Entry */}
        <div className="lg:col-span-7 bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-sm">
            <AnimatePresence mode="wait">
                {activeTab === 'remap' ? (
                  <motion.div key="remap" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Identity Type</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none appearance-none"
                                value={remapData.type}
                                onChange={e => setRemapData({...remapData, type: e.target.value as any})}
                            >
                                <option value="SCHOOL">SCHOOL REGISTER (ID)</option>
                                <option value="BRANCH">BRANCH REGISTER (ID)</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source ID (Current)</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none uppercase" placeholder="e.g. VIVA" value={remapData.oldId} onChange={e => setRemapData({...remapData, oldId: e.target.value})} />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination ID (New)</label>
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none uppercase" placeholder="e.g. VIVA-2" value={remapData.newId} onChange={e => setRemapData({...remapData, newId: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <button onClick={handleRemap} disabled={isLoading || !remapData.oldId} className="w-full py-5 bg-red-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs hover:bg-black transition-all shadow-xl shadow-red-600/10 flex items-center justify-center gap-4">
                        {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-white" />}
                        {isLoading ? 'EXECUTING CASCADE...' : 'EXECUTE IDENTITY REMAP'}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="counters" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <input className="bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold uppercase text-xs" placeholder="School ID" value={counterData.schoolId} onChange={e => setCounterData({...counterData, schoolId: e.target.value})} />
                        <input className="bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold uppercase text-xs" placeholder="Branch (or GLOBAL)" value={counterData.branchId} onChange={e => setCounterData({...counterData, branchId: e.target.value})} />
                        <input className="bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold uppercase text-xs" placeholder="Type (STUDENT)" value={counterData.type} onChange={e => setCounterData({...counterData, type: e.target.value})} />
                        <input className="bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold uppercase text-xs" placeholder="Year (2026-27)" value={counterData.year} onChange={e => setCounterData({...counterData, year: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Force New Sequence Value</label>
                        <input type="number" className="w-full bg-slate-50 border border-red-100 p-6 rounded-2xl font-black text-red-600 text-2xl text-center" value={counterData.newValue} onChange={e => setCounterData({...counterData, newValue: parseInt(e.target.value)})} />
                    </div>
                    <button onClick={handleCounterUpdate} disabled={isLoading} className="w-full py-5 bg-black text-white rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-4">
                        {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        FORCE ALIGN SEQUENCE
                    </button>
                  </motion.div>
                )}
            </AnimatePresence>

            {result && (
                <div className={cn("mt-8 p-6 rounded-3xl border flex items-center gap-4", result.success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-600")}>
                    {result.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                    <div className="text-xs font-bold">{result.message || result.error}</div>
                </div>
            )}
        </div>

        {/* Right: Runtime Log */}
        <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200/60 rounded-[2.5rem] p-8 h-full min-h-[400px] flex flex-col">
                <h3 className="text-[10px] font-black tracking-widest text-slate-400 mb-6 flex items-center gap-2 uppercase">
                    <Terminal className="w-3 h-3 text-red-500" /> Transactional_Log.iso
                </h3>
                <div className="flex-1 space-y-3 font-mono text-[10px] overflow-y-auto scrollbar-hide">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-4">
                            <span className="text-slate-300 font-bold shrink-0">{i+1}</span>
                            <span className={cn(log.includes('OK') ? 'text-emerald-500 font-bold' : log.includes('INITIATING') || log.includes('ERROR') ? 'text-red-500 font-black' : 'text-slate-500')}>
                                {log}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3">
                        <Cpu className="w-4 h-4 text-slate-300" />
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Isolated Runtime</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-3">
                        <Database className="w-4 h-4 text-slate-300" />
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Postgres-Link Active</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
