"use client";

import React, { useState, useEffect } from "react";
import { 
  Fingerprint, 
  XCircle, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCcw, 
  ShieldCheck,
  Search,
  Cpu
} from "lucide-react";
import { BiometricService, RDServiceStatus } from "@/lib/services/biometric-service";
import { submitFingerprintAttendanceAction } from "@/lib/actions/attendance-v2-actions";
import { cn } from "@/lib/utils";

interface FingerprintModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function FingerprintModal({ onClose, onSuccess }: FingerprintModalProps) {
  const [status, setStatus] = useState<RDServiceStatus | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "FAIL">("IDLE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initScanner = async () => {
    setLoading(true);
    setError(null);
    const res = await BiometricService.discover();
    setStatus(res);
    
    if (res.success) {
      const info = await BiometricService.getDeviceInfo(res.port);
      if (info.success) setDeviceInfo(info.info);
    } else {
      setError("No biometric scanner detected. Please ensure ACPL L1 RD Service is running.");
    }
    setLoading(false);
  };

  useEffect(() => {
    initScanner();
  }, []);

  const handleCapture = async () => {
    if (!status?.success) return;
    
    setScanStatus("SCANNING");
    setError(null);
    
    const res = await BiometricService.capture(status.port);
    
    if (res.success && res.pidBlock) {
      // Send to server for verification
      const verifyRes = await submitFingerprintAttendanceAction(res.pidBlock, deviceInfo?.mc);
      
      if (verifyRes.success) {
        setScanStatus("SUCCESS");
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setScanStatus("FAIL");
        setError(verifyRes.error || "Identity Verification Failed.");
      }
    } else {
      setScanStatus("FAIL");
      setError(res.error || "Capture Failed. Try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-3xl flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center text-white">
          <div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase">Biometric Fingerprint Hub</h3>
            <p className="text-[10px] font-black opacity-40 tracking-[0.2em] uppercase">ACPL L1 Registered Device • Secure Channel</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <XCircle className="w-6 h-6 text-white/40" />
          </button>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Visual Scanner */}
          <div className="relative aspect-square bg-slate-900 rounded-[2.5rem] flex items-center justify-center overflow-hidden border border-white/5 group">
             {loading ? (
                <div className="flex flex-col items-center gap-4 text-white/20">
                   <RefreshCcw className="w-12 h-12 animate-spin" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Waking Scanner...</p>
                </div>
             ) : (
                <>
                  <div className={cn(
                    "w-48 h-48 rounded-full border-2 border-dashed transition-all duration-700 flex items-center justify-center relative",
                    scanStatus === "SCANNING" ? "border-blue-500 scale-110 animate-pulse" : 
                    scanStatus === "SUCCESS" ? "border-emerald-500 bg-emerald-500/10" :
                    scanStatus === "FAIL" ? "border-rose-500 bg-rose-500/10" :
                    "border-white/10 group-hover:border-blue-500/50"
                  )}>
                     <Fingerprint className={cn(
                       "w-24 h-24 transition-all duration-500",
                       scanStatus === "SCANNING" ? "text-blue-500 scale-110" : 
                       scanStatus === "SUCCESS" ? "text-emerald-500 scale-125" :
                       scanStatus === "FAIL" ? "text-rose-500" :
                       "text-white/10 group-hover:text-blue-500/30"
                     )} />

                     {scanStatus === "SCANNING" && (
                       <div className="absolute inset-0 border-t-2 border-blue-400 rounded-full animate-spin" />
                     )}
                  </div>

                  {/* ─── SCAN LINE ─── */}
                  {scanStatus === "SCANNING" && (
                    <div className="absolute inset-x-0 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_infinite] top-0 z-10" />
                  )}
                </>
             )}

             {scanStatus === "SUCCESS" && (
                <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in">
                   <ShieldCheck className="w-16 h-16 mb-4 animate-bounce" />
                   <h4 className="text-xl font-black uppercase italic tracking-tighter">Verified</h4>
                   <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Attendance Recorded</p>
                </div>
             )}
          </div>

          {/* Right: Device Info & Actions */}
          <div className="flex flex-col justify-between py-2">
             <div className="space-y-6">
                <div>
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Device Status</p>
                   <div className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full animate-pulse", status?.status === "READY" ? "bg-emerald-500" : "bg-rose-500")} />
                      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                         {status?.status || "NOT DETECTED"}
                      </h4>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/20 uppercase mb-1">Model ID</p>
                      <p className="text-xs font-bold text-white uppercase">{deviceInfo?.mi || "—"}</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-white/20 uppercase mb-1">RD Port</p>
                      <p className="text-xs font-bold text-white uppercase">{status?.port || "—"}</p>
                   </div>
                </div>

                {error && (
                   <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 animate-in slide-in-from-right-4">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-rose-200 leading-relaxed uppercase">{error}</p>
                   </div>
                )}
             </div>

             <div className="space-y-3">
                <button 
                  onClick={handleCapture}
                  disabled={!status?.success || scanStatus === "SCANNING" || loading}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                >
                  {scanStatus === "SCANNING" ? "Wating for Finger..." : "Initiate Capture"}
                </button>
                
                <button 
                  onClick={initScanner}
                  className="w-full py-4 bg-white/5 text-white/40 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="w-3 h-3" /> Refresh Scanner
                </button>
             </div>
          </div>
        </div>

        {/* Footer Diagnostics */}
        <div className="p-6 bg-slate-900/50 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-white/20" />
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">STQC Certified Device • Hardware Hash: {deviceInfo?.mc?.substring(0, 12) || "None"}...</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">RD Service L1 v2.0.1</span>
           </div>
        </div>
      </div>
    </div>
  );
}
