"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  unlockAccount, 
  runDiagnostics, 
  resetUserPassword,
  createUserAccount
} from "@/lib/actions/dev-actions";
import { 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Activity, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle, 
  Search,
  ArrowLeft,
  Terminal,
  Server,
  AlertTriangle,
  Fingerprint,
  UserPlus,
  Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ToolboxPage() {
  const [identifier, setIdentifier] = useState("");
  const [unlockStatus, setUnlockStatus] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<any[] | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [resetId, setResetId] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetStatus, setResetStatus] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [traceId, setTraceId] = useState("");

  useEffect(() => {
    setTraceId(Math.random().toString(36).substring(7).toUpperCase());
  }, []);

  const handleUnlock = async () => {
    if (!identifier) return;
    setIsUnlocking(true);
    const result = await unlockAccount(identifier);
    setUnlockStatus(result);
    setIsUnlocking(false);
    if (result.success) setIdentifier("");
  };

  const handleRunDiag = async () => {
    setIsRunningDiag(true);
    const result = await runDiagnostics();
    if (result.success) {
      setDiagnostics(result.checks || []);
    }
    setIsRunningDiag(false);
  };

  const handleResetPassword = async () => {
    if (!resetId) return;
    setIsResetting(true);
    const result = await resetUserPassword(resetId, newPass || undefined);
    setResetStatus(result);
    setIsResetting(false);
    if (result.success) {
      setResetId("");
      setNewPass("");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#d1d1d1] font-mono p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/developer/dashboard" className="p-2 hover:bg-white/5 rounded-lg transition-colors group">
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-red-500 mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Emergency Protocols</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">System Toolbox</h1>
            </div>
          </div>
          
          <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-[9px] font-bold uppercase tracking-widest">
            Level 4 Auth Required
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Account Unlocker */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 rounded-xl">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Emergency Account Unlock</h2>
                <p className="text-xs text-neutral-500">Clear failed login attempts and re-enable access</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-red-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Username / Email / User ID" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-red-500/50 transition-all"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <button 
                onClick={handleUnlock}
                disabled={isUnlocking || !identifier}
                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isUnlocking ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4" />
                )}
                Initiate Unlock Sequence
              </button>

              <AnimatePresence>
                {unlockStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "p-4 rounded-xl border text-xs",
                      unlockStatus.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {unlockStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {unlockStatus.success ? "SYSTEM SUCCESS" : "PROTOCOL ERROR"}
                    </div>
                    {unlockStatus.success ? unlockStatus.message : unlockStatus.error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Password Reset Section */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <RefreshCcw className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Emergency Password Reset</h2>
                <p className="text-xs text-neutral-500">Over-ride user authentication credentials</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Email / Staff Code / Phone" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-all font-mono"
                  value={resetId}
                  onChange={(e) => setResetId(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-amber-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="New Password (Optional: Default Virtue@2026)" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:border-amber-500/50 transition-all font-mono"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>

              <button 
                onClick={handleResetPassword}
                disabled={isResetting || !resetId}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                    <Fingerprint className="w-4 h-4" />
                )}
                Authorize Password Update
              </button>

              <AnimatePresence>
                {resetStatus && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      "p-4 rounded-xl border text-xs",
                      resetStatus.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {resetStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {resetStatus.success ? "RESET SUCCESS" : "PROTOCOL WARNING"}
                    </div>
                    {resetStatus.success ? resetStatus.message : resetStatus.error}
                    {!resetStatus.success && (resetStatus as any).code === "MISSING_KEY" && (
                        <div className="mt-2 p-2 bg-black/40 rounded border border-white/5 text-[9px] uppercase tracking-tighter italic">
                            ACTION REQUIRED: ADD SUPABASE_SERVICE_ROLE_KEY TO .ENV
                        </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Identity Provisioning Section */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl space-y-6 text-slate-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <UserPlus className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Identity Provisioning</h2>
                <p className="text-xs text-neutral-500 italic">Link Supabase accounts to V2 Staff records</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Target Email" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-xs focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                  id="prov-email"
                />
                <input 
                  type="text" 
                  placeholder="School ID (VIVA)" 
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 px-4 text-xs focus:outline-none focus:border-blue-500/50 transition-all font-mono uppercase"
                  id="prov-school"
                />
              </div>

              <button 
                onClick={async () => {
                   const email = (document.getElementById('prov-email') as HTMLInputElement).value;
                   const schoolId = (document.getElementById('prov-school') as HTMLInputElement).value;
                   if (!email || !schoolId) return;
                   
                   const result = await createUserAccount(email, schoolId, "OWNER");
                   alert(result.success ? "PROVISION SUCCESS: " + result.message : "PROVISION ERROR: " + result.error);
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                Provision Auth Access
              </button>
            </div>
          </section>

          {/* Diagnostics Panel */}
          <section className="bg-neutral-900/50 border border-white/5 p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl">
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">System Integrity Scan</h2>
                  <p className="text-xs text-neutral-500">Run security and connectivity diagnostics</p>
                </div>
              </div>
              <button 
                onClick={handleRunDiag}
                disabled={isRunningDiag}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              >
                <RefreshCcw className={cn("w-4 h-4 text-blue-400", isRunningDiag && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-3">
              {!diagnostics ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-white/10 rounded-2xl">
                  <Terminal className="w-8 h-8 text-neutral-800" />
                  <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">No active scan data</p>
                </div>
              ) : (
                diagnostics.map((check, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-bold text-neutral-300">{check.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] text-neutral-500 italic">{check.detail}</span>
                       <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded border border-emerald-500/20">PASS</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Bottom Security Info */}
          <div className="md:col-span-2 p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">Audit Policy</h3>
              <p className="text-xs text-amber-500/60 leading-relaxed italic uppercase">
                All emergency actions are logged with Fingerprint ID and IP traceability. 
                Unauthorized use of toolbox protocols will trigger a global security freeze.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-amber-500/40">
                <Fingerprint className="w-3 h-3" />
                <span>TRACE_ID: {traceId || "INITIALIZING"}</span>
                <span className="mx-2">|</span>
                <Server className="w-3 h-3" />
                <span>NODE: MASTER-PRIMARY-01</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
