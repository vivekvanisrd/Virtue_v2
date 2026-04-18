"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Zap, 
  ShieldAlert, 
  RefreshCcw, 
  Database, 
  Lock, 
  ChevronRight,
  Terminal,
  Activity,
  ArrowRight,
  AlertOctagon,
  Settings2
} from 'lucide-react';
import { 
    remapSchoolIdAction, 
    remapBranchIdAction, 
    forceResetCounterAction 
} from '@/lib/actions/crisis-actions';
import Link from 'next/link';

export default function CrisisConsolePage() {
  const [activeTab, setActiveTab] = useState<'remap' | 'counters' | 'audit'>('remap');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(["[LOG] INITIALIZING HIGH-CLEARANCE COMMAND CENTER..."]);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  // Form States
  const [remapData, setRemapData] = useState({ oldId: '', newId: '', type: 'SCHOOL' as 'SCHOOL' | 'BRANCH' });
  const [counterData, setCounterData] = useState({ schoolId: '', branchId: 'GLOBAL', type: '', year: '', newValue: 0 });

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRemap = async () => {
    if (!remapData.oldId || !remapData.newId) return;
    setIsLoading(true);
    addLog(`INITIATING ${remapData.type} REMAP: ${remapData.oldId} >> ${remapData.newId}`);
    
    const res = remapData.type === 'SCHOOL' 
        ? await remapSchoolIdAction(remapData.oldId, remapData.newId)
        : await remapBranchIdAction(remapData.oldId, remapData.newId);

    setResult(res);
    if (res.success) addLog("REMAP COMPLETED. REGISTRY SYNCED.");
    else addLog(`REMAP FAILED: ${res.error}`);
    setIsLoading(false);
  };

  const handleCounterUpdate = async () => {
    setIsLoading(true);
    addLog(`FORCING COUNTER ALIGNMENT: ${counterData.type} (${counterData.year})`);
    const res = await forceResetCounterAction(counterData);
    setResult(res);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono">
      {/* Header Flare */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)] z-50"></div>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">
          <Link href="/developer" className="hover:text-red-500 transition-colors">Developer Dashboard</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-red-500/80">Crisis Console (High-Clearance)</span>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-red-500/20 bg-neutral-900/40 p-12 backdrop-blur-3xl shadow-[0_0_50px_rgba(220,38,38,0.1)]">
          <div className="absolute top-0 right-0 p-8">
             <AlertTriangle className="w-24 h-24 text-red-500/10 rotate-12" />
          </div>
          
          <div className="max-w-2xl relative">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                <ShieldAlert className="w-6 h-6 text-red-500" />
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter">EMERGENCY <span className="text-red-500">FREEDOM</span></h1>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed mb-8">
              Welcome to the High-Clearance Registry Control. These tools bypass standard multi-tenant protections to allow atomic sequence corrections and identity remapping in critical failure scenarios. Use with extreme caution.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('remap')}
                className={`px-6 py-3 rounded-full text-xs font-black tracking-widest transition-all ${activeTab === 'remap' ? 'bg-red-500 text-white' : 'bg-white/5 border border-white/10 text-neutral-500 hover:text-white'}`}
              >
                IDENTITY REMAPPER
              </button>
              <button 
                onClick={() => setActiveTab('counters')}
                className={`px-6 py-3 rounded-full text-xs font-black tracking-widest transition-all ${activeTab === 'counters' ? 'bg-red-500 text-white' : 'bg-white/5 border border-white/10 text-neutral-500 hover:text-white'}`}
              >
                COUNTER FORCE-ALIGN
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {activeTab === 'remap' ? (
                <motion.div 
                    key="remap"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-[2rem] border border-white/5 bg-neutral-900/20 p-8 space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-tighter flex items-center gap-3">
                      <Zap className="w-5 h-5 text-red-500" /> REGISTRY REMAPPER
                    </h2>
                    <span className="text-[10px] text-yellow-500/80 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">CASES CASCADE ENABLED</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Remap Target Type</label>
                        <select 
                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-red-500 transition-all appearance-none"
                            value={remapData.type}
                            onChange={(e) => setRemapData({...remapData, type: e.target.value as any})}
                        >
                            <option value="SCHOOL">SCHOOL IDENTITY (id)</option>
                            <option value="BRANCH">BRANCH IDENTITY (id)</option>
                        </select>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Source Registry ID (Old)</label>
                        <input 
                            type="text"
                            placeholder="e.g. VIVA"
                            className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-red-500 transition-all uppercase placeholder:text-neutral-700"
                            value={remapData.oldId}
                            onChange={(e) => setRemapData({...remapData, oldId: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-black uppercase text-neutral-600 tracking-widest">Destination Registry ID (New)</label>
                        <div className="relative">
                            <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500 rotate-0 group-focus-within:rotate-90 transition-transform" />
                            <input 
                                type="text"
                                placeholder="e.g. VIVA-CORP"
                                className="w-full bg-black border border-red-500/30 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-red-500 transition-all uppercase placeholder:text-neutral-700"
                                value={remapData.newId}
                                onChange={(e) => setRemapData({...remapData, newId: e.target.value})}
                            />
                        </div>
                    </div>
                  </div>

                  <button 
                  onClick={handleRemap}
                  disabled={isLoading || !remapData.oldId || !remapData.newId}
                  className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                  >
                    {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    EXECUTE REGISTRY REMAP
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                    key="counters"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-[2rem] border border-white/5 bg-neutral-900/20 p-8 space-y-8"
                >
                    <h2 className="text-lg font-black tracking-tighter flex items-center gap-3">
                      <RefreshCcw className="w-5 h-5 text-red-500" /> COUNTER FORCE-ALIGN
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6 text-xs">
                        <input className="bg-black border border-white/10 p-4 rounded-xl font-bold uppercase" placeholder="School ID" value={counterData.schoolId} onChange={e => setCounterData({...counterData, schoolId: e.target.value})} />
                        <input className="bg-black border border-white/10 p-4 rounded-xl font-bold uppercase" placeholder="Branch ID (or GLOBAL)" value={counterData.branchId} onChange={e => setCounterData({...counterData, branchId: e.target.value})} />
                        <input className="bg-black border border-white/10 p-4 rounded-xl font-bold uppercase" placeholder="Sequence Type (e.g. STUDENT)" value={counterData.type} onChange={e => setCounterData({...counterData, type: e.target.value})} />
                        <input className="bg-black border border-white/10 p-4 rounded-xl font-bold uppercase" placeholder="Academic Year (e.g. 2026-27)" value={counterData.year} onChange={e => setCounterData({...counterData, year: e.target.value})} />
                        <div className="md:col-span-2 space-y-2">
                             <label className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">New Sequence Value (Force Set To)</label>
                             <input type="number" className="w-full bg-black border border-red-500/30 p-4 rounded-xl font-black text-red-500 text-lg" value={counterData.newValue} onChange={e => setCounterData({...counterData, newValue: parseInt(e.target.value)})} />
                        </div>
                    </div>

                    <button 
                        onClick={handleCounterUpdate}
                        disabled={isLoading}
                        className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs tracking-widest hover:bg-neutral-200 transition-all flex items-center justify-center gap-3"
                    >
                        {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        FORCE ALIGN SEQUENCE
                    </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Warning Cards */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-red-500 mb-1">Impact Warning</h4>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">Remapping IDs can break external API keys, cached tokens, and historical printouts (old receipts with old IDs).</p>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
                    <Database className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                        <h4 className="text-[10px] font-black uppercase text-emerald-500 mb-1">Atomic Safety</h4>
                        <p className="text-[10px] text-neutral-500 leading-relaxed">All operations are wrapped in DB transactions. If any depenedency fails to remap, the entire operation rolls back.</p>
                    </div>
                </div>
            </div>
          </div>

          {/* Console Log Sidebar */}
          <div className="lg:col-span-4 flex flex-col h-full bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-[10px] font-black tracking-widest text-neutral-400 flex items-center gap-2">
                <Terminal className="w-3 h-3 text-red-500" /> SYSTEM.LOG [SESSION_ACTIVE]
              </h3>
            </div>
            
            <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[500px] text-[10px] font-mono scrollbar-hide">
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 ${log.includes('FAILED') || log.includes('INITIATING') ? 'text-red-400' : 'text-neutral-500'}`}>
                  <span className="text-neutral-800 font-bold shrink-0">{i+1} »</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-red-500/5">
                {result && (
                    <div className={`p-4 rounded-xl border ${result.success ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-red-500/30 bg-red-500/10 text-red-500'} text-[10px] font-bold`}>
                        {result.success ? `SUCCESS: ${result.message}` : `SYSTEM ERROR: ${result.error}`}
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
