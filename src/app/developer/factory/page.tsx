"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Factory, 
  Shield, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { provisionInstance } from '@/lib/actions/dev-actions';
import { IdGenerator } from '@/lib/id-generator';

const STEPS = [
  { id: 'identity', title: 'Instance Identity', icon: Building2 },
  { id: 'admin', title: 'Primary Admin', icon: Shield },
  { id: 'summary', title: 'Provisioning', icon: Zap }
];

export default function InstanceFactory() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    city: '',
    adminName: '',
    adminEmail: '',
    adminPhone: ''
  });
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; schoolId?: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Suggest codes when school name changes
  useEffect(() => {
    if (formData.schoolName.length > 3 && !formData.schoolCode) {
        // Mock suggestion logic for client-side purely for UI speed, 
        // real logic would call a server action or the id-generator if it were a server component
        const words = formData.schoolName.toUpperCase().split(' ').filter(Boolean);
        const code = words.map(w => w[0]).join('').substring(0, 4);
        if (code.length >= 2) setSuggestions([code, words[0].substring(0, 3)]);
    }
  }, [formData.schoolName]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleProvision = async () => {
    setIsLoading(true);
    setResult(null);
    setLogs([]);
    
    addLog("Initializing Atomic Provisioning Sequence...");
    addLog(`Target: ${formData.schoolName} (${formData.schoolCode})`);
    
    const res = await provisionInstance(formData);
    
    if (res.success) {
        addLog("OK: Databases created.");
        addLog(`OK: School ${res.schoolId} synchronized.`);
        addLog("OK: Admin staff record linked.");
        addLog("OK: Tenancy counters initialized.");
        setResult({ success: true, message: res.message, schoolId: res.schoolId || '' });
    } else {
        addLog(`ERROR: ${res.error}`);
        setResult({ success: false, message: res.error || "Provisioning failed." });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-400 font-mono selection:bg-red-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1a1a1a_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl p-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/developer/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-red-500 mb-1">
                <Zap className="w-3 h-3 fill-current" />
                Atomic Protocols
              </div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Instance Factory <span className="text-neutral-600 font-light">V2.0</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
            <Lock className="w-3 h-3 text-red-500" />
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Secure session</span>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto p-12">
        {/* Step Progress */}
        <div className="flex items-center justify-between mb-16 px-8">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === idx;
            const isCompleted = currentStep > idx;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-3 relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                    isActive ? 'bg-red-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]' :
                    isCompleted ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' :
                    'bg-neutral-900 border-white/5 text-neutral-600'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-neutral-600'}`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] bg-white/5 mx-4 mt-[-24px]">
                    <motion.div 
                      className="h-full bg-red-500"
                      initial={{ width: '0%' }}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">School Legal Name</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="e.g. Virtue International School"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                        value={formData.schoolName}
                        onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Unique School Code</label>
                    <div className="relative group">
                      <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="e.g. VIS-01"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all uppercase"
                        value={formData.schoolCode}
                        onChange={(e) => setFormData({...formData, schoolCode: e.target.value})}
                      />
                    </div>
                    {suggestions.length > 0 && !formData.schoolCode && (
                      <div className="flex gap-2 mt-2">
                        {suggestions.map(s => (
                          <button 
                            key={s}
                            onClick={() => setFormData({...formData, schoolCode: s})}
                            className="text-[10px] px-3 py-1 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg text-neutral-400 hover:text-red-400 transition-all"
                          >
                            Suggest: {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Operational City</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="e.g. Bangalore"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Full Admin Name</label>
                    <div className="relative group">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="text"
                        placeholder="e.g. John Doe"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                        value={formData.adminName}
                        onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Corporate Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="email"
                        placeholder="admin@school.com"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Mobile Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                      <input 
                        type="tel"
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full bg-neutral-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({...formData, adminPhone: e.target.value})}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white">
                            <Zap className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                            <h2 className="text-white font-black uppercase tracking-widest">Initialization Ready</h2>
                            <p className="text-xs text-neutral-500">Atomic provisioning protocol for V2 architecture</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                            <span className="text-[9px] uppercase tracking-widest text-neutral-600 block mb-1">Tenancy Mode</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">Isolated School</span>
                        </div>
                        <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                            <span className="text-[9px] uppercase tracking-widest text-neutral-600 block mb-1">Linkage ID</span>
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{formData.schoolCode || '---'}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleProvision}
                        disabled={isLoading || !formData.schoolCode}
                        className="w-full py-5 bg-red-500 hover:bg-red-600 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white rounded-2xl font-black uppercase tracking-[0.3em] text-sm transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                        {isLoading ? 'Executing Factory Protocol...' : 'Initiate Provisioning'}
                    </button>
                  </div>
                  
                  {result && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 rounded-3xl border ${result.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            {result.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                            <span className="font-black uppercase tracking-widest text-xs">{result.success ? 'Success' : 'Protocol Error'}</span>
                        </div>
                        <p className="text-sm">{result.message}</p>
                        {result.success && (
                          <div className="mt-4 flex gap-4">
                            <Link href="/developer/dashboard" className="text-[10px] font-black uppercase tracking-widest underline">Return to Dashboard</Link>
                            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest underline">Test New Portal</Link>
                          </div>
                        )}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            {currentStep < 2 && (
              <div className="flex justify-between pt-8">
                <button 
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/5 hover:bg-white/5 text-neutral-400 disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Back</span>
                </button>
                <button 
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest transition-all hover:bg-white/90 shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
                >
                  <span className="text-xs">Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Side Info / Console */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-6">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-4">Factory Specs</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-600 uppercase tracking-widest">Stack Mode</span>
                        <span className="text-emerald-500 font-bold uppercase tracking-widest">Production Ready</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-600 uppercase tracking-widest">Tenancy</span>
                        <span className="text-white font-bold uppercase tracking-widest">Isolated-V2</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-neutral-600 uppercase tracking-widest">Auto-Provision</span>
                        <span className="text-white font-bold uppercase tracking-widest">6 Components</span>
                    </div>
                </div>
            </div>

            <div className="bg-black border border-white/5 rounded-3xl p-6 h-[400px] flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Provisioning Console</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono scrollbar-hide">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-800 opacity-20 italic">
                            <Loader2 className="w-12 h-12 mb-4 animate-[spin_4s_linear_infinite]" />
                            <span className="text-xs">Awaiting factory protocol...</span>
                        </div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="text-[10px] text-neutral-600 break-words leading-relaxed">
                                <span className={log.includes('ERROR') ? 'text-red-500' : log.includes('OK') ? 'text-emerald-500' : 'text-neutral-600'}>
                                    {log}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
