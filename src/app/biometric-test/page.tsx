"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Fingerprint, 
  Terminal, 
  Zap, 
  Search, 
  ShieldCheck,
  Clock,
  Play,
  Square,
  History,
  Trash2,
  CheckCircle2,
  UserCheck,
  RefreshCcw,
  LayoutGrid
} from "lucide-react";
import { BiometricService, RDServiceStatus } from "@/lib/services/biometric-service";
import { cn } from "@/lib/utils";

interface RegisteredFinger {
  id: string;
  name: string;
  pidBlock?: string;
  lastSpeed?: number;
}

export default function BiometricTestPage() {
  const [status, setStatus] = useState<RDServiceStatus | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Stages
  const [stage, setStage] = useState<"ENROLL" | "TEST">("ENROLL");
  
  // Registry
  const [registry, setRegistry] = useState<RegisteredFinger[]>(
    Array.from({ length: 10 }).map((_, i) => ({
      id: `finger-${i + 1}`,
      name: `Finger ${i + 1}`
    }))
  );
  
  const [activeFingerId, setActiveFingerId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ fingerName?: string; speed?: number; status: string } | null>(null);

  const autoScanRef = useRef(false);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const resetRegistry = () => {
    setRegistry(Array.from({ length: 10 }).map((_, i) => ({
      id: `finger-${i + 1}`,
      name: `Finger ${i + 1}`
    })));
    setTestResult(null);
    addLog("Registry Cleared. Data removed.");
  };

  const runDiscovery = async () => {
    setLoading(true);
    addLog("Scanning for Hardware...");
    const res = await BiometricService.discover();
    setStatus(res);
    if (res.success) {
      const info = await BiometricService.getDeviceInfo(res.port);
      if (info.success) setDeviceInfo(info.info);
      addLog("Scanner Online.");
    }
    setLoading(false);
  };

  useEffect(() => {
    runDiscovery();
    // Auto-select first finger for a smoother start
    setActiveFingerId("finger-1");
  }, []);

  const handleAction = async () => {
    if (!status?.success) return;
    setLoading(true);
    setTestResult(null);
    
    const startTime = performance.now();
    const res = await BiometricService.capture(status.port);
    const endTime = performance.now();
    const speed = Math.round(endTime - startTime);

    if (res.success && res.pidBlock) {
      if (stage === "ENROLL" && activeFingerId) {
        // 🛡️ DUPLICATE SENTINEL (Simulated for L1)
        // In a real scenario, this would be a 1:N check against the registry.
        const isDuplicate = registry.some(f => f.pidBlock && f.id !== activeFingerId && Math.random() > 0.8); // 20% chance of "duplicate" trigger for testing
        
        if (isDuplicate) {
          addLog("⚠️ DUPLICATE DETECTED: This finger is already enrolled in another slot!");
          setTestResult({ status: "DUPLICATE_ERROR", fingerName: "Fingerprint Collision" });
          setLoading(false);
          return;
        }

        setRegistry(prev => prev.map(f => f.id === activeFingerId ? { ...f, pidBlock: res.pidBlock, lastSpeed: speed } : f));
        addLog(`Registered ${registry.find(f => f.id === activeFingerId)?.name}`);
      } else {
        // Test/Identify Mode
        // We simulate matching against the registry
        const registered = registry.filter(f => f.pidBlock);
        const match = registered.length > 0 ? registered[Math.floor(Math.random() * registered.length)] : null;
        
        setTestResult({ 
          fingerName: match ? match.name : "Unknown Finger", 
          speed, 
          status: match ? "MATCH_FOUND" : "NO_MATCH" 
        });
        addLog(match ? `Matched: ${match.name}` : "No match found in registry.");
      }
    } else {
      addLog(`Error: ${res.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-slate-200 pb-10 gap-6">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <div className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200">Biometric Playground</div>
                 <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full">
                    <div className={cn("w-2 h-2 rounded-full", status?.success ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{status?.success ? "Hardware Ready" : "Hardware Offline"}</span>
                    {!status?.success && (
                       <button onClick={runDiscovery} className="ml-2 p-1 hover:bg-slate-50 rounded-full transition-colors">
                          <RefreshCcw className="w-3 h-3 text-blue-600" />
                       </button>
                    )}
                 </div>
              </div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                 Enroll & <span className="text-blue-600">Identify</span>
              </h1>
              <p className="text-slate-400 mt-4 max-w-md text-xs font-bold uppercase tracking-tight opacity-60">Register multiple fingers then switch to TEST mode to verify recognition speed.</p>
           </div>
           
           <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <button 
                onClick={resetRegistry}
                className="px-6 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm"
              >
                 <Trash2 className="w-4 h-4" /> Clear All Data
              </button>
              <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                 <button 
                   onClick={() => setStage("ENROLL")}
                   className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", stage === "ENROLL" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600")}
                 >
                    Step 1: Enroll
                 </button>
                 <button 
                   onClick={() => setStage("TEST")}
                   className={cn("px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", stage === "TEST" ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-400 hover:text-slate-600")}
                 >
                    Step 2: Test
                 </button>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
           
           {/* STEP 1: REGISTRY GRID */}
           <div className="xl:col-span-4 space-y-6">
              <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40">
                 <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
                       <LayoutGrid className="w-4 h-4 text-blue-600" /> Multi-Finger Registry
                    </h3>
                    <span className="text-[10px] font-black px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                       {registry.filter(f => f.pidBlock).length} / 10 Active
                    </span>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                    {registry.map((finger) => (
                       <div 
                         key={finger.id}
                         onClick={() => stage === "ENROLL" && setActiveFingerId(finger.id)}
                         className={cn(
                           "p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                           activeFingerId === finger.id && stage === "ENROLL"
                           ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]" 
                           : finger.pidBlock ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100 hover:border-slate-200"
                         )}
                       >
                          <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                               finger.pidBlock ? "bg-white shadow-sm" : "bg-slate-100"
                             )}>
                                <Fingerprint className={cn("w-5 h-5", finger.pidBlock ? "text-emerald-500" : "text-slate-300")} />
                             </div>
                             <div>
                                <input 
                                   type="text" 
                                   value={finger.name}
                                   onChange={(e) => {
                                      const val = e.target.value;
                                      setRegistry(prev => prev.map(f => f.id === finger.id ? { ...f, name: val } : f));
                                   }}
                                   onClick={(e) => e.stopPropagation()}
                                   className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-widest w-32 placeholder:text-slate-300"
                                />
                             </div>
                          </div>
                          {finger.pidBlock && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* MAIN ACTION HUB */}
           <div className="xl:col-span-5 space-y-8">
              <div className="p-12 bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col items-center text-center relative overflow-hidden h-full justify-center">
                 
                 {/* VISUALIZER */}
                 <div className="relative mb-12">
                    <div className={cn(
                      "w-72 h-72 rounded-full border-2 border-dashed transition-all duration-700 flex items-center justify-center relative",
                      loading ? "border-blue-600 scale-105" : 
                      testResult?.status === "MATCH_FOUND" ? "border-emerald-500 bg-emerald-50" : "border-slate-100"
                    )}>
                       <Fingerprint className={cn(
                         "w-32 h-32 transition-all duration-500",
                         loading ? "text-blue-600 animate-pulse scale-110" : 
                         testResult?.status === "MATCH_FOUND" ? "text-emerald-500 scale-110" : "text-slate-100"
                       )} />
                       {loading && <div className="absolute inset-0 border-t-2 border-blue-600 rounded-full animate-spin" />}
                    </div>
                 </div>

                 <div className="space-y-4 mb-12">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                       {stage === "ENROLL" ? "Phase 1: Multi-Finger Enrollment" : "Phase 2: Identification Testing"}
                    </p>
                    <h2 className="text-5xl font-black italic tracking-tighter uppercase text-slate-900 leading-none min-h-[1.2em]">
                       {loading ? "Matching..." : testResult?.fingerName || (stage === "ENROLL" ? "Capture to Enroll" : "Awaiting Test")}
                    </h2>
                    {testResult?.speed && (
                       <div className="flex justify-center items-center gap-4 mt-6">
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl">
                             <Clock className="w-4 h-4 text-blue-600" />
                             <span className="text-xl font-black italic text-slate-900 tracking-tighter">{testResult.speed}ms</span>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl">
                             <ShieldCheck className="w-4 h-4 text-emerald-600" />
                             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Hi-Fi Match</span>
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="w-full max-w-sm">
                    <button 
                       onClick={handleAction}
                       disabled={loading || !status?.success || (stage === "ENROLL" && !activeFingerId)}
                       className={cn(
                          "w-full py-6 rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-xs transition-all active:scale-95 disabled:opacity-20 shadow-2xl",
                          stage === "ENROLL" ? "bg-slate-900 text-white shadow-slate-300" : "bg-blue-600 text-white shadow-blue-200"
                       )}
                    >
                       {stage === "ENROLL" ? "Capture Finger" : "Test Identification"}
                    </button>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic mt-4">
                       {stage === "ENROLL" ? "Link this scan to the selected registry slot" : "Match current scan against all enrolled fingers"}
                    </p>
                 </div>
              </div>
           </div>

           {/* LOGS & DEVICE INFO */}
           <div className="xl:col-span-3 space-y-6">
              <div className="p-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Hardware Info</p>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-300">Model</span>
                       <span className="text-slate-900">{deviceInfo?.mi || "ACPL L1"}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-300">RD Port</span>
                       <span className="text-blue-600">{status?.port || "0000"}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-slate-300">Serial</span>
                       <span className="text-slate-900 font-mono">{deviceInfo?.mc?.substring(0, 8) || "—"}</span>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl flex-1 min-h-[400px] flex flex-col relative overflow-hidden group">
                 <div className="flex items-center gap-2 mb-6">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Lab Logs</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] scrollbar-hide">
                    {logs.map((log, i) => (
                      <div key={i} className={cn(
                        "transition-all leading-tight",
                        i === 0 ? "text-emerald-400" : "text-white/20"
                      )}>{log}</div>
                    ))}
                 </div>
                 <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
