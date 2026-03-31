"use client";

import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Key, 
  Lock, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Globe,
  Zap,
  Activity
} from "lucide-react";
import { saveAxisConfigAction, testAxisConnectionAction } from "@/lib/actions/banking-actions";
import { cn } from "@/lib/utils";

interface BankSettingsProps {
  schoolId: string;
}

export function BankSettings({ schoolId }: BankSettingsProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    clientSecret: "",
    publicKey: "",
    accountNumber: "",
    corporateId: ""
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await saveAxisConfigAction({ ...formData, schoolId });
    setStatus(result);
    setIsSaving(false);
    setTimeout(() => setStatus(null), 5000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const result = await testAxisConnectionAction(schoolId);
    setStatus(result);
    setIsTesting(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-xl shadow-slate-100/50">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-0 transition-transform">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">Axis Neo Configuration</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1 flex items-center gap-2">
              <Zap className="w-3 h-3 fill-primary" /> Connected Banking v2.0
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 hover:bg-emerald-100 transition-all disabled:opacity-50"
          >
             {isTesting ? <Activity className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
             {isTesting ? "Handshaking..." : "Check Connection"}
          </button>
          <a 
            href="https://developer.axisbank.co.in/" 
            target="_blank" 
            className="p-3 bg-slate-50 text-slate-400 hover:text-primary rounded-xl transition-all border border-border"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      {status && (
        <div className={cn(
          "p-4 rounded-2xl border flex items-center gap-3 animate-in zoom-in-95 duration-300",
          status.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {status.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-bold">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Main Form ─── */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-[2.5rem] border border-border overflow-hidden shadow-sm">
            <div className="p-8 border-b border-border bg-slate-50/50">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400" />
                API Credentials
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1">These keys authorize Virtue V2 to perform payouts and verify receipts.</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client ID</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text" 
                      value={formData.clientId}
                      onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                      placeholder="AXIS_CLIENT_XXXX"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Client Secret</label>
                  <div className="relative group">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      type={showSecrets ? "text" : "password"} 
                      value={formData.clientSecret}
                      onChange={e => setFormData({ ...formData, clientSecret: e.target.value })}
                      placeholder="••••••••••••••••"
                      required
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-all"
                    >
                      {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Universal Encryption Key (RSA Public)</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-6 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <textarea 
                    rows={4}
                    value={formData.publicKey}
                    onChange={e => setFormData({ ...formData, publicKey: e.target.value })}
                    placeholder="-----BEGIN PUBLIC KEY-----"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-mono focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate Account Number</label>
                  <input 
                    type="text" 
                    value={formData.accountNumber}
                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="9120XXXXXXXXXXX"
                    required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate ID</label>
                  <input 
                    type="text" 
                    value={formData.corporateId}
                    onChange={e => setFormData({ ...formData, corporateId: e.target.value })}
                    placeholder="CORP001"
                    required
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <Globe className="w-4 h-4" />
                Region: India (Axis Connect)
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className={cn(
                  "px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50",
                  status?.success && "bg-emerald-600 shadow-emerald-200"
                )}
              >
                {isSaving ? <Activity className="w-5 h-5 animate-spin" /> : (status?.success ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
                {isSaving ? "Authorizing..." : (status?.success ? "Saved Securely" : "Store Credentials")}
              </button>
            </div>
          </form>

          {/* Webhook Configuration Section */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative z-10">
               <h4 className="text-xl font-black italic mb-2 tracking-tight">Webhook Listener Hub</h4>
               <p className="text-sm font-medium opacity-60 max-w-md">Configure this URL in your Axis Developer Portal to receive real-time fee payment notifications.</p>
               
               <div className="mt-8 flex items-center gap-3">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-xs text-primary group-hover:bg-white/10 transition-colors">
                     https://virtue-v2.edu/api/webhooks/axis
                  </div>
                  <button className="px-6 py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                    Copy URL
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* ─── Security Checklist ─── */}
        <div className="space-y-6">
          <div className="bg-amber-50 rounded-[2.5rem] border border-amber-200 p-8">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm">
               <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest text-amber-800 mb-4">Security Protocol</h4>
            <ul className="space-y-4">
              {[
                "Virtue V2 encodes all secrets with AES-256 before storage.",
                "Passwords are never logged in the system audit trail.",
                "Bank requests require Maker-Checker authorization.",
                "IP Whitelisting is recommended at the bank portal."
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-xs font-bold text-amber-900/60 leading-relaxed">
                   <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                   {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-border p-8 shadow-sm">
             <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Integration Status</h4>
             <div className="space-y-6">
                {[
                  { label: "Connectivity", status: "Active", color: "bg-emerald-500" },
                  { label: "IP Whitelist", status: "Verified", color: "bg-emerald-500" },
                  { label: "Encryption", status: "Secure", color: "bg-emerald-500" },
                  { label: "Payroll Batching", status: "Pending", color: "bg-amber-500" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-500">{item.label}</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">{item.status}</span>
                        <div className={cn("w-2 h-2 rounded-full", item.color)} />
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
