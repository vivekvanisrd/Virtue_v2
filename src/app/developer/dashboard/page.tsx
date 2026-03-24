"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  Box, 
  Settings, 
  Search, 
  RefreshCcw, 
  ExternalLink, 
  AlertTriangle,
  Server,
  Cpu,
  Globe,
  Lock,
  Factory,
  ChevronRight,
  Code2,
  HardDrive,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  LogOut,
  X
} from 'lucide-react';
import Link from "next/link";
import { 
  getDatabaseHealth, 
  getGlobalData, 
  executeFullIDAudit,
  createStaffAction,
  updateStaffAction,
  updateSchoolAction 
} from "@/lib/actions/dev-actions";
import { cn } from "@/lib/utils";
import GlobalSchoolSelector from "@/components/developer/GlobalSchoolSelector";

export default function DeveloperDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] Virtue Runtime v2.0.5 started",
    "[AUTH] Next.js Session Middleware active",
    "[DB] Connected to Supabase Pooler (Port 6543)",
    "[DEV] Developer Portal ready for diagnostics"
  ]);
  const [activeTab, setActiveTab] = useState<"health" | "explorer" | "audit" | "spec">("health");
  const [globalData, setGlobalData] = useState<any>(null);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState<any>(null);
  const [showEditSchool, setShowEditSchool] = useState<any>(null);

  async function refreshData() {
    setIsLoading(true);
    addLog(`[FETCH] Auditing database health...`);
    const result = await getDatabaseHealth();
    if (result.success && result.stats) {
      setStats(result.stats);
      setSystem(result.system);
      addLog(`[SUCCESS] Audit complete. ${result.stats.audits} audit logs found.`);
    } else {
      addLog(`[ERROR] Audit failed: ${result.error}`);
    }
    setIsLoading(false);
  }

  function addLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  }

  async function fetchGlobalData() {
    addLog(`[FETCH] Retrieving global tenant registry...`);
    const result = await getGlobalData();
    if (result.success && result.data) {
      console.log(`[DEBUG] Received Global Data. Active School: ${result.data.activeSchoolId}`);
      setGlobalData(result.data);
      setActiveSchoolId(result.data.activeSchoolId);
      addLog(`[SUCCESS] Global registry loaded: ${result.data.schools?.length || 0} schools active.`);
    }
  }

  async function runIDAudit() {
    addLog(`[AUDIT] Starting recursive ID Spec validation...`);
    const result = await executeFullIDAudit();
    if (result.success && result.summary) {
      setAuditResults(result.summary);
      addLog(`[COMPLETE] Audit finished. Found ${result.summary.totalIssues} compliance issues.`);
    }
  }

  useEffect(() => {
    refreshData();
    fetchGlobalData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-blue-100 p-4 lg:p-6">
      {/* 🔮 Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1700px] mx-auto space-y-6 relative">
        
        {/* 🛰️ MISSION CONTROL HEADER */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 p-6 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/50 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-600/30">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500/80">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                System Oversight 2.0
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-900">
                VIRTUE <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">MISSION CONTROL</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <nav className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-2xl">
              {[
                { id: "health", label: "Health", icon: Activity },
                { id: "explorer", label: "Registry", icon: Globe },
                { id: "audit", label: "Auditor", icon: Shield },
                { id: "spec", label: "V1 Spec", icon: BookOpen } // NEW
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                    activeTab === tab.id 
                      ? "bg-white text-slate-900 shadow-md border border-slate-200/50" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* 🏤 GLOBAL SCHOOL SELECTOR */}
              <GlobalSchoolSelector 
                 schools={globalData?.schools?.map((s: any) => ({ id: s.id, name: s.name })) || []}
                 currentSchoolId={activeSchoolId}
                 onSelect={(id) => {
                   addLog(`[CONTEXT] Switching to ${id || 'Global View'}...`);
                   refreshData();
                   fetchGlobalData();
                 }}
              />

              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] font-black text-slate-400 uppercase">Connectivity</div>
                  <div className="text-xs font-mono text-emerald-600 font-bold uppercase transition-all">
                    {isLoading ? "Syncing..." : "Real-time"}
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <button 
                  onClick={refreshData}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-all active:scale-95"
                  title="Refresh Data"
                >
                  <RefreshCcw className={cn("w-4 h-4 text-slate-400", isLoading && "animate-spin")} />
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <button 
                  onClick={async () => {
                    const { signOutAction } = await import("@/lib/actions/auth-native");
                    await signOutAction();
                    window.location.href = "/login";
                  }}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all active:scale-95"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 🛸 CORE CONTROL GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-9 space-y-6">
            {/* Health tab content */}
            {activeTab === "health" && (
              <div className="space-y-6">
                {/* Database Health Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Active Tenants", value: stats?.schools, icon: Box, color: "blue", trend: "Registry" },
                    { label: "Total Identities", value: stats?.staff, icon: Lock, color: "indigo", trend: "Verified" },
                    { label: "Registry Size", value: stats?.students, icon: Activity, color: "emerald", trend: "Optimized" },
                    { label: "Operations", value: stats?.receipts, icon: Zap, color: "amber", trend: "Real-time" }
                  ].map((item, i) => (
                    <div key={i} className="bg-white border border-slate-200/60 p-5 rounded-[1.5rem] flex flex-col justify-between hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:scale-110 transition-transform", `text-${item.color}-600`)}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.trend}</span>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{item.label}</div>
                        <div className="text-3xl font-black text-slate-900 tracking-tighter">{isLoading ? "---" : (item.value || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Model Auditor Table */}
                <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40 backdrop-blur-sm">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Database className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">Registry Schema Audit</span>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Real-time Model Trace</p>
                      </div>
                    </div>
                    <button className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest transition-all">Export Report</button>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Data Entity</th>
                          <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Record Density</th>
                          <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Health Status</th>
                          <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Tracing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { name: "AcademicYear", count: stats?.years, status: "Reliant", color: "emerald" },
                          { name: "Branch", count: stats?.branches, status: "Isolated", color: "blue" },
                          { name: "Enquiry", count: stats?.enquiries, status: "Scoped", color: "purple" },
                          { name: "AuditLog", count: stats?.audits, status: "Encrypted", color: "amber" },
                        ].map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-all group cursor-pointer">
                            <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-600 transition-colors" />
                              {row.name}
                            </td>
                            <td className="p-4">
                               <div className="flex items-center gap-3">
                                  <span className="text-slate-900 font-black text-sm">{isLoading ? "..." : row.count || 0}</span>
                                  <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-600/40 rounded-full" style={{ width: '40%' }} />
                                  </div>
                               </div>
                            </td>
                            <td className="p-4">
                              <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100", `bg-${row.color}-50 text-${row.color}-600`)}>
                                {row.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400 group-hover:text-blue-600 font-black uppercase tracking-widest text-[9px] transition-colors">
                                Analyze Trace
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link href="/developer/factory" className="bg-neutral-900/50 border border-white/5 p-5 rounded-3xl space-y-4 hover:border-emerald-500/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-neutral-800 group-hover:bg-emerald-500/10 rounded-xl transition-colors">
                        <Factory className="w-5 h-5 text-neutral-400 group-hover:text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Instance Factory</h3>
                        <p className="text-[10px] text-neutral-500">Atomic Multi-Tenant Provisioning</p>
                      </div>
                    </div>
                    <div className="w-full py-3 border border-neutral-800 group-hover:border-emerald-500/30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center">
                      Launch Factory Phase
                    </div>
                  </Link>
                  <Link href="/developer/toolbox" className="bg-neutral-900/50 border border-white/5 p-5 rounded-3xl space-y-4 hover:border-red-500/20 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-neutral-800 group-hover:bg-red-500/10 rounded-xl transition-colors">
                        <Shield className="w-5 h-5 text-neutral-400 group-hover:text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">System Toolbox</h3>
                        <p className="text-[10px] text-neutral-500">Emergency Protocols & Diagnostics</p>
                      </div>
                    </div>
                    <div className="w-full py-3 border border-neutral-800 group-hover:border-red-500/30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all text-center">
                      Initiate Secure Access
                    </div>
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "explorer" && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-1 flex items-center gap-3">
                          <Globe className="w-6 h-6 text-blue-600" /> Global Tenant Workspace
                        </h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Active Instances & Authority Profiles</p>
                      </div>
                      <div className="flex gap-2">
                         <div className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black rounded-xl uppercase">Live Sync Active</div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {globalData?.schools?.map((s: any) => (
                       <div key={s.id} className="p-6 bg-slate-50 border border-slate-200/60 rounded-3xl hover:border-blue-400/40 hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-md">
                         <div className="flex items-center justify-between mb-6">
                           <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">
                             {s.id.substring(0, 2)}
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Code: {s.id}</span>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setShowEditSchool(s); }}
                                 className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors group/btn"
                               >
                                 <Settings className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-blue-600 transition-colors" />
                               </button>
                               <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            </div>
                         </div>
                         <h4 className="text-sm font-black text-slate-800 mb-4 tracking-tight">{s.name}</h4>
                         <div className="grid grid-cols-3 gap-3 border-t border-slate-200/60 pt-4">
                            <div className="text-center">
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Branches</div>
                               <div className="text-xs font-black text-slate-900">{s._count?.branches || 0}</div>
                            </div>
                            <div className="text-center border-x border-slate-200/60">
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Staff</div>
                               <div className="text-xs font-black text-slate-900">{s._count?.staff || 0}</div>
                            </div>
                            <div className="text-center">
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Students</div>
                               <div className="text-xs font-black text-slate-900">{s._count?.students || 0}</div>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <Lock className="w-5 h-5 text-indigo-600" /> Global Authority Directory
                      </h3>
                      <button 
                        onClick={() => setShowCreateStaff(true)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                      >
                        <Lock className="w-3 h-3" /> Provision Identity
                      </button>
                    </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 opacity-70 bg-slate-50/50">
                            <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Identity Name</th>
                            <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Bridge Code</th>
                            <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Role Protocol</th>
                             <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Assigned Tenant</th>
                             <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em] text-right">Actions</th>
                            <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {globalData?.staff?.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                       {u.firstName[0]}{u.lastName?.[0]}
                                    </div>
                                    <span className="font-bold text-slate-700">{u.firstName} {u.lastName}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-tighter">
                                   {u.staffCode}
                                 </span>
                              </td>
                              <td className="p-4">
                                 <div className={cn(
                                   "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100",
                                   u.role === 'DEVELOPER' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-100"
                                 )}>
                                   <Shield className="w-3 h-3" />
                                   {u.role}
                                 </div>
                              </td>
                               <td className="p-4 text-slate-500 truncate max-w-[200px] font-bold group-hover:text-slate-700 transition-colors">
                                 {u.school?.name}
                               </td>
                               <td className="p-4 text-right">
                                 <button 
                                   onClick={() => setShowEditStaff(u)}
                                   className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                 >
                                   <Settings className="w-4 h-4" />
                                 </button>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                     </table>
                   </div>
                </div>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="space-y-6">
                <div className="p-8 bg-white border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-200/30 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100">
                     <Shield className="w-8 h-8 text-blue-600" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Registry Integrity Auditor</h3>
                     <p className="text-sm text-slate-500 mt-2 max-w-md">
                       Scans all tenants and branches to ensure strict compliance with the Global ID Specification (V1).
                     </p>
                   </div>
                   <button 
                    onClick={runIDAudit}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-blue-600/20"
                   >
                     Initialize Recursive Scan
                   </button>
                </div>

                {auditResults && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className={cn(
                      "p-4 rounded-xl border flex items-center justify-between",
                      auditResults.totalIssues === 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      <div className="flex items-center gap-3">
                         {auditResults.totalIssues === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                         <span className="text-xs font-black uppercase tracking-widest">Audit Status: {auditResults.totalIssues === 0 ? "RELIANT" : "CONFLICTS DETECTED"}</span>
                      </div>
                      <span className="text-2xl font-black">{auditResults.totalIssues}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Student ID Issues</h4>
                          <div className="space-y-2">
                             {auditResults.details?.students?.length === 0 ? (
                               <p className="text-[10px] italic text-slate-500">Zero conflicts found.</p>
                             ) : (
                               auditResults.details?.students?.map((err: string, i: number) => (
                                 <p key={i} className="text-[9px] text-red-400 font-mono italic">{err}</p>
                               ))
                             )}
                          </div>
                       </div>
                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Staff ID Issues</h4>
                          <div className="space-y-2">
                             {auditResults.details?.staff?.length === 0 ? (
                               <p className="text-[10px] italic text-slate-500">Zero conflicts found.</p>
                             ) : (
                               auditResults.details?.staff?.map((err: string, i: number) => (
                                 <p key={i} className="text-[9px] text-red-400 font-mono italic">{err}</p>
                               ))
                             )}
                          </div>
                       </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {activeTab === "spec" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-white border border-slate-200/60 rounded-3xl space-y-4 shadow-xl shadow-slate-200/30">
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                       <Fingerprint className="w-4 h-4" /> Identity Specification V1.0
                    </h3>
                    <div className="space-y-4 text-[11px] leading-relaxed text-slate-600 text-slate-500 font-medium">
                      <p>The Global ID Spec ensures data portability and uniqueness across the multi-tenant registry.</p>
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono space-y-2">
                         <div className="flex justify-between">
                            <span className="text-slate-400">Student ID:</span>
                            <span className="text-emerald-600 font-bold">SCH-STU-YYYY-XXXX</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-400">Staff ID:</span>
                            <span className="text-indigo-600 font-bold">SCH-USR-ROLE-XXXX</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-400">Branch ID:</span>
                            <span className="text-blue-600 font-bold">SCH-BR-CODE</span>
                         </div>
                      </div>
                      <p className="italic text-[10px] text-slate-400">Note: High-collision fields are multi-indexed at the DB level.</p>
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-200/60 rounded-3xl space-y-4 shadow-xl shadow-slate-200/30">
                    <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                       <RefreshCcw className="w-4 h-4" /> Global Sequencing Logic
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                         <div className="p-2 bg-amber-50 rounded-lg">
                            <Database className="w-4 h-4 text-amber-600" />
                         </div>
                         <div>
                            <div className="text-[10px] font-black text-slate-900 uppercase">Atomic Counters</div>
                            <div className="text-[9px] text-slate-500">Redis-backed Prisma Transactional Loops</div>
                         </div>
                      </div>
                      <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Initialize Global Sequence Loop
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Protocol Compliance Board</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Atomicity", status: "Verified", color: "emerald" },
                        { label: "Schema Locking", status: "Enforced", color: "blue" },
                        { label: "Tenant Isolation", status: "Strict", color: "indigo" },
                        { label: "Spec version", status: "1.0.4 r2", color: "amber" }
                      ].map((item, i) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                           <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.label}</div>
                           <div className={cn("text-xs font-black uppercase", `text-${item.color}-600`)}>{item.status}</div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 space-y-6">
            
            {/* 📟 DEEP TRACE TERMINAL */}
            <div className="bg-[#080808] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[500px] shadow-2xl">
              <div className="p-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.3em]">DEEP TRACE</span>
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="p-5 flex-grow overflow-y-auto space-y-2 font-mono custom-scrollbar bg-black/40">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "text-[10px] leading-relaxed transition-all",
                    log.includes('[ERROR]') ? "text-red-400" : 
                    log.includes('[SUCCESS]') ? "text-emerald-400" : 
                    log.includes('[SYSTEM]') ? "text-blue-400 font-black" : "text-neutral-500"
                  )}>
                    <span className="opacity-20 mr-3 select-none text-[8px]">{logs.length - i}</span>
                    <span className="text-neutral-700 mr-2 opacity-50 select-none">›</span>
                    {log}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-black/60 border-t border-white/5 text-center">
                 <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest italic">Encrypted Secure Tunnel : TLS 1.3</span>
              </div>
            </div>

            {/* 🛡️ SECURITY OVERRIDE */}
            <div className="bg-blue-50 border border-blue-200 rounded-[2rem] p-6 space-y-6 shadow-xl shadow-blue-100/50">
               <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Security Protocol</h4>
                  <div className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black rounded uppercase">Active</div>
               </div>
               <div className="space-y-4">
                  {[
                    { label: "M-Tenant Guard", status: "Enabled", color: "emerald" },
                    { label: "Auth Lockdown", status: "Verified", color: "blue" },
                    { label: "Identity Proxy", status: "Neutral", color: "slate" }
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                       <span className="text-slate-500 font-bold uppercase tracking-tight">{row.label}</span>
                       <span className={cn("font-black uppercase text-[9px]", `text-${row.color}-600`)}>{row.status}</span>
                    </div>
                  ))}
               </div>
               <button className="w-full py-3 bg-white hover:bg-blue-50 border border-blue-200 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm">
                  Rotate Keys
               </button>
            </div>

            {/* 🔋 ENVIRONMENT SPECS */}
            <div className="p-6 bg-white border border-slate-200/60 rounded-[2rem] space-y-4 shadow-xl shadow-slate-200/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <Server className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Runtime Matrix</span>
              </div>
              
              <div className="space-y-3">
                {[
                  { label: "Engine", value: system?.nodeVersion || "Node.js 20.x", icon: Cpu },
                  { label: "Storage", value: "Supabase PG v15", icon: HardDrive },
                  { label: "Gateway", value: "Vercel Edge", icon: Globe },
                  { label: "Strategy", value: "Multi-Tenant V2", icon: Code2 },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-3 text-slate-500 font-bold uppercase tracking-tighter">
                      <row.icon className="w-3.5 h-3.5 opacity-40" />
                      {row.label}
                    </div>
                    <div className="text-slate-900 font-black italic">{isLoading ? "---" : row.value}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 🎭 MODALS */}
      <AnimatePresence>
        {showCreateStaff && (
          <StaffModal 
            mode="create"
            schoolId={activeSchoolId}
            schools={globalData?.schools || []}
            onClose={() => setShowCreateStaff(false)}
            onSuccess={() => { setShowCreateStaff(false); fetchGlobalData(); refreshData(); }}
          />
        )}
        {showEditStaff && (
          <StaffModal 
            mode="edit"
            staff={showEditStaff}
            onClose={() => setShowEditStaff(null)}
            onSuccess={() => { setShowEditStaff(null); fetchGlobalData(); refreshData(); }}
          />
        )}
        {showEditSchool && (
          <SchoolModal 
            school={showEditSchool}
            onClose={() => setShowEditSchool(null)}
            onSuccess={() => { setShowEditSchool(null); fetchGlobalData(); refreshData(); }}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StaffModal({ mode, staff, schoolId, schools, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: staff?.firstName || "",
    lastName: staff?.lastName || "",
    email: staff?.email || "",
    phone: staff?.phone || "",
    role: staff?.role || "STAFF",
    status: staff?.status || "Active",
    schoolId: staff?.schoolId || schoolId || schools?.[0]?.id || "",
    username: staff?.username || "",
    password: ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let res;
    if (mode === 'create') {
      res = await createStaffAction(formData);
    } else {
      res = await updateStaffAction(staff.id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        status: formData.status
      });
    }

    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">{mode === 'create' ? "Provision New Identity" : "Edit Identity Protocol"}</h3>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
              <input 
                required
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
              <input 
                required
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
            <input 
              required
              disabled={mode === 'edit'}
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input 
                placeholder="Optional"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Password</label>
              <input 
                type="password"
                placeholder={mode === 'edit' ? "Leave blank to keep" : "Default: Virtue@2026"}
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Protocol</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="STAFF">STAFF</option>
                <option value="TEACHER">TEACHER</option>
                <option value="ACCOUNTANT">ACCOUNTANT</option>
                <option value="PRINCIPAL">PRINCIPAL</option>
                <option value="OWNER">OWNER</option>
                <option value="DEVELOPER">DEVELOPER</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {mode === 'create' && !schoolId && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Tenant</label>
              <select 
                value={formData.schoolId}
                onChange={e => setFormData({...formData, schoolId: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              >
                {schools.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Processing..." : mode === 'create' ? "Initialize Identity" : "Commit Changes"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function SchoolModal({ school, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: school.name,
    email: school.email || "",
    phone: school.phone || "",
    address: school.address || ""
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await updateSchoolAction(school.id, formData);
    if (res.success) {
      onSuccess();
    } else {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Edit Tenant Protocol</h3>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">School Name</label>
            <input 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Email</label>
              <input 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
              <input 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
            <textarea 
              rows={3}
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? "Updating..." : "Commit Protocol Changes"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
