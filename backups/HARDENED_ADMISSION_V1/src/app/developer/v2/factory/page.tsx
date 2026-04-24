"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Shield, 
  Zap, 
  MapPin, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Mail,
  Phone,
  Settings,
  Database,
  Terminal,
  User,
  Globe
} from 'lucide-react';
import { provisionInstance } from '@/lib/actions/dev-actions';
import { suggestSchoolCodesAction, suggestBranchCodesAction } from '@/lib/actions/nomenclature-actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function V2ResourceFactory() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; schoolId?: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);
  const [branchSuggestions, setBranchSuggestions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    city: '',
    branchCode: '',
    adminName: '',
    adminEmail: '',
    adminPhone: ''
  });
  
  useEffect(() => { setIsMounted(true); }, []);

  // Predictive Engine: School Codes
  useEffect(() => {
    const fetchS = async () => {
        if (formData.schoolName.length >= 3 && !formData.schoolCode) {
            const res = await suggestSchoolCodesAction(formData.schoolName);
            if (res.success) setSchoolSuggestions(res.codes);
        } else if (formData.schoolName.length < 3) {
            setSchoolSuggestions([]);
        }
    };
    const t = setTimeout(fetchS, 400);
    return () => clearTimeout(t);
  }, [formData.schoolName, formData.schoolCode]);

  // Predictive Engine: Branch Codes
  useEffect(() => {
    const fetchB = async () => {
        if (formData.city.length >= 3 && !formData.branchCode) {
            const res = await suggestBranchCodesAction(formData.city);
            if (res.success) setBranchSuggestions(res.codes);
        } else if (formData.city.length < 3) {
            setBranchSuggestions([]);
        }
    };
    const t = setTimeout(fetchB, 400);
    return () => clearTimeout(t);
  }, [formData.city, formData.branchCode]);

  const handleProvision = async () => {
    setIsLoading(true);
    setResult(null);
    setLogs(["[SYSTEM] INITIALIZING ATOMIC PROVISIONING..."]);
    
    const res = await provisionInstance(formData);
    
    if (res.success) {
        setLogs(prev => [...prev, "OK: DATABASE REGISTRY CREATED", "OK: SEEDED ACADEMIC HIERARCHY", "OK: OWNER STAFF LINKED"]);
        setResult({ success: true, message: res.message || "School provisioned successfully.", schoolId: res.schoolId });
    } else {
        setLogs(prev => [...prev, `ERROR: ${res.error}`]);
        setResult({ success: false, message: res.error || "Provisioning protocol failed." });
    }
    setIsLoading(false);
  };

  if (!isMounted) return null;

  return (
    <div className="max-w-6xl mx-auto py-10">
      {/* 🚀 Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">
            <Zap className="w-4 h-4 fill-indigo-500" /> V2 Provisioning Engine
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Resource Factory</h1>
        <p className="text-slate-500 text-sm mt-2">Initialize new production-ready school environments with one click.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* 🛠️ Main Form Column */}
        <div className="lg:col-span-7 space-y-8">
            <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-10 shadow-sm shadow-slate-200/50 space-y-12">
                
                {/* 🏮 Section 1: Identity */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 italic">Tenant <span className="text-indigo-600">Identity</span></h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">School Legal Name</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="e.g. Virtue Global Academy"
                                    value={formData.schoolName}
                                    onChange={e => setFormData({...formData, schoolName: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">City / Location</label>
                            <div className="relative group">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                    placeholder="Bangalore"
                                    value={formData.city}
                                    onChange={e => setFormData({...formData, city: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">School ID (Registry)</label>
                                <div className="relative group">
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase"
                                        placeholder="VGA"
                                        value={formData.schoolCode}
                                        onChange={e => setFormData({...formData, schoolCode: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {schoolSuggestions.map(s => (
                                        <button key={s} onClick={() => setFormData({...formData, schoolCode: s})} className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all">Suggest: {s}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Branch Code</label>
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                    <input 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all uppercase"
                                        placeholder="MAIN"
                                        value={formData.branchCode}
                                        onChange={e => setFormData({...formData, branchCode: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {branchSuggestions.map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => setFormData({...formData, branchCode: s})} 
                                            className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            Suggest: {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🏮 Section 2: Authority */}
                <div className="space-y-8 pt-12 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight text-slate-900 italic">Root <span className="text-emerald-600">Authority</span></h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Primary Admin Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="John Wick" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Corporate Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="admin@vga.pk" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Security Phone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                                    <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all" placeholder="+91 XXX XXXXXXX" value={formData.adminPhone} onChange={e => setFormData({...formData, adminPhone: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🚀 Provision Button */}
                <div className="pt-10">
                    <button 
                        disabled={isLoading || !formData.schoolName || !formData.schoolCode || !formData.adminEmail}
                        onClick={handleProvision}
                        className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none flex items-center justify-center gap-4"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-white" />}
                        {isLoading ? 'EXECUTING PROTOCOL...' : 'INITIATE PROVISIONING'}
                    </button>
                    
                    {result && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-6 p-6 rounded-3xl border flex items-center gap-4", result.success ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-red-50 border-red-100 text-red-600")}>
                            {result.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            <div className="text-xs font-bold leading-tight">{result.message}</div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>

        {/* 📟 Right Column: Status View */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <Settings className="absolute right-0 top-0 w-32 h-32 text-indigo-500/10 rotate-12" />
                <div className="relative">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2">
                        <Terminal className="w-3 h-3" /> Factory Runtime
                    </h3>
                    <div className="space-y-3 font-mono text-[10px] h-80 overflow-y-auto scrollbar-hide">
                        {logs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                                <Database className="w-8 h-8 mb-4 animate-pulse text-indigo-400" />
                                <div>Awaiting registry input...</div>
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="flex gap-3">
                                    <span className="text-slate-800">{String(i+1).padStart(2, '0')}</span>
                                    <span className={cn(log.includes('OK') ? 'text-emerald-400 font-bold' : log.includes('ERROR') ? 'text-red-400 font-bold' : 'text-slate-500')}>
                                        {log}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-300">Registry Sync Online</span>
                    </div>
                    <span className="text-[9px] font-black text-white/30 tracking-widest">PROTOCAL_V2</span>
                </div>
            </div>

            <div className="p-8 rounded-[2.5rem] border border-slate-200 bg-white shadow-sm flex items-center gap-6 group hover:border-indigo-200 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-slate-900">Atomic Provisioning</h4>
                    <p className="text-[10px] font-medium text-slate-500 mt-1 uppercase tracking-tight leading-relaxed">
                        Database schemas, academic hierarchies, and root authority links are created in a single transaction.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
