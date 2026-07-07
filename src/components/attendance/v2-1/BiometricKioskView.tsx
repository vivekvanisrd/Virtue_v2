import React, { useState, useEffect, useRef } from "react";
import { Fingerprint, UserCheck, ShieldAlert, Clock, CalendarDays, Maximize2, Minimize2, CheckCircle2 } from "lucide-react";
import { getRecentBiometricPunchesAction, getKioskPunchDetailsAction } from "@/lib/actions/attendance-v2-actions";
import { cn } from "@/lib/utils";

export function BiometricKioskView() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePunch, setActivePunch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [waitingForScan, setWaitingForScan] = useState(true);
  
  const lastPunchIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error("Error attempting to enable full-screen:", err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Monitor fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Poll for new scans every 2 seconds
  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await getRecentBiometricPunchesAction();
        if (!active) return;
        
        if (res.success && res.data && res.data.length > 0) {
          const latest = res.data[0];
          
          // Initialize on first load, or detect a brand-new scan
          if (lastPunchIdRef.current === null) {
            lastPunchIdRef.current = latest.id;
          } else if (lastPunchIdRef.current !== latest.id) {
            lastPunchIdRef.current = latest.id;
            
            // Fetch detailed kiosk info for this punch
            setLoading(true);
            const detailRes = await getKioskPunchDetailsAction(latest.id);
            setLoading(false);
            
            if (detailRes.success && detailRes.data && active) {
              // Clear previous reset timers
              if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
              
              setActivePunch(detailRes.data);
              setWaitingForScan(false);
              
              // Automatically reset back to waiting screen after 5 seconds
              resetTimerRef.current = setTimeout(() => {
                if (active) {
                  setWaitingForScan(true);
                  // Give another 500ms for smooth fade out before purging punch state
                  setTimeout(() => {
                    if (active) setActivePunch(null);
                  }, 500);
                }
              }, 5000);
            }
          }
        }
      } catch (err) {
        console.error("Kiosk polling error:", err);
      }
    };

    poll(); // run immediately
    const interval = setInterval(poll, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-[600px] rounded-3xl overflow-hidden flex flex-col items-center justify-center transition-all duration-700 select-none",
        isFullscreen ? "h-screen bg-slate-950" : "bg-slate-900 border border-slate-800 shadow-2xl"
      )}
    >
      {/* Background ambient glowing nodes */}
      <div className="absolute top-1/4 left-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse pointer-events-none" />

      {/* Header controls */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <div>
          <span className="px-3 py-1 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            Live ADMS Reception Mode
          </span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* STAGE A: Waiting for Fingerprint Scan */}
      <div 
        className={cn(
          "flex flex-col items-center transition-all duration-700 ease-out transform z-10",
          waitingForScan ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-10 pointer-events-none absolute"
        )}
      >
        <div className="relative group cursor-pointer mb-8">
          {/* Pulsing ring layers */}
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md animate-ping" />
          <div className="absolute -inset-4 border border-blue-500/20 rounded-full animate-pulse duration-1000" />
          <div className="absolute -inset-10 border border-blue-500/10 rounded-full animate-pulse duration-2000" />
          
          <div className="relative w-36 h-36 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 rounded-full flex items-center justify-center border-4 border-slate-800/80 shadow-2xl transition-transform duration-300 group-hover:scale-105">
            <Fingerprint className="w-16 h-16 text-white animate-pulse" />
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-white tracking-tight text-center max-w-md px-6">
          Please Scan Your Finger
        </h1>
        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
          Place index finger on biometric terminal
        </p>
      </div>

      {/* STAGE B: Displaying Captured Punch Profile Details */}
      {activePunch && (
        <div 
          className={cn(
            "w-full max-w-lg px-6 transition-all duration-700 ease-out transform z-10",
            !waitingForScan ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-110 -translate-y-10 pointer-events-none absolute"
          )}
        >
          <div className="bg-slate-950/80 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Top accent badge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

            <div className="flex flex-col items-center">
              {/* Photo Avatar Frame */}
              <div className="relative mb-6">
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-500 via-indigo-500 to-violet-500 rounded-2xl blur opacity-75 animate-pulse" />
                <div className="relative w-28 h-28 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  {activePunch.photoUrl ? (
                    <img 
                      src={activePunch.photoUrl} 
                      alt={activePunch.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center text-4xl font-black text-slate-400">
                      {activePunch.name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                  )}
                </div>
                
                {/* Punch Type Badge Check */}
                <div className={cn(
                  "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center shadow-lg text-white font-black text-[9px] uppercase",
                  activePunch.type === "OUT" ? "bg-amber-500" : "bg-emerald-500"
                )}>
                  {activePunch.type}
                </div>
              </div>

              {/* Identity Details */}
              <h2 className="text-xl font-black text-white tracking-tight leading-none mb-1 text-center">
                {activePunch.name}
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-4 text-center">
                {activePunch.code} (PIN: {activePunch.biometricId})
              </p>

              {/* Status Banner */}
              <div className={cn(
                "w-full rounded-2xl px-5 py-3 flex items-center gap-3 border mb-6 shadow-inner",
                activePunch.isUnmapped 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : activePunch.status === "Late" 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              )}>
                {activePunch.isUnmapped ? (
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce" />
                ) : activePunch.status === "Late" ? (
                  <Clock className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                )}
                <div className="flex-1 text-left">
                  <p className="text-xs font-black uppercase tracking-wider leading-none mb-0.5">
                    {activePunch.isUnmapped ? "Unmapped Card" : activePunch.status}
                  </p>
                  <p className="text-[9px] opacity-80 leading-normal">
                    {activePunch.isUnmapped 
                      ? "Device scanned PIN is not assigned to any staff profile."
                      : activePunch.status === "Late"
                        ? `Checked in late by ${activePunch.lateMinutes} minutes.`
                        : "Attendance successfully registered on time."
                    }
                  </p>
                </div>
              </div>

              {/* Quick Analytics Cards */}
              <div className="grid grid-cols-2 gap-4 w-full border-t border-slate-800 pt-5">
                <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-800">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Punch Time</p>
                    <p className="text-xs font-black text-slate-200 tracking-tight leading-none">{activePunch.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-800">
                  <CalendarDays className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Monthly Late</p>
                    <p className="text-xs font-black text-slate-200 tracking-tight leading-none">
                      {activePunch.isUnmapped ? "N/A" : `${activePunch.lateCount} Scans`}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
