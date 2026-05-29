"use client";

import React, { useState, useEffect } from "react";
import { Smartphone, Download, Share2, PlusSquare } from "lucide-react";

export function PWAInstallBlocker() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [bypassed, setBypassed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running on mobile
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent || "";
      const ios = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      setIsIOS(ios);
      
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || window.innerWidth < 768;
      setIsMobileDevice(mobile);
    };

    // Check if running in standalone PWA mode
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };

    checkMobile();
    checkStandalone();

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("resize", checkMobile);

    // Check local storage bypass (useful for testing)
    const pwaBypassed = localStorage.getItem("virtue_pwa_bypass") === "true";
    setBypassed(pwaBypassed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
    }
  };

  const handleBypass = () => {
    localStorage.setItem("virtue_pwa_bypass", "true");
    setBypassed(true);
  };

  // If not on mobile, or already running in PWA standalone, or bypassed by developer, do not block
  if (!isMobileDevice || isStandalone || bypassed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#070b13] text-neutral-200 flex flex-col justify-between p-6 overflow-y-auto selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1e293b_0%,_transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e1b4b_0%,_transparent_60%)] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center pt-8 space-y-3">
        <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <Smartphone className="w-8 h-8 animate-bounce text-blue-400" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">PWA App Installation Required</h1>
        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none">Security & Geofencing Protocol</p>
      </div>

      {/* Body Guide */}
      <div className="relative z-10 w-full max-w-sm mx-auto bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl shadow-2xl space-y-6">
        <p className="text-xs text-slate-400 font-semibold leading-relaxed text-center">
          To access the mobile attendance scanner and leave applications, you must install the official Virtue App on your home screen. This enforces secure browser sandboxing and precise GPS verification.
        </p>

        <div className="h-px bg-white/5" />

        {isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">iOS Installation Steps</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-400 shrink-0">1</div>
                <p className="text-[11px] font-semibold text-slate-300">
                  Tap the **Share** button <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> in the browser bar.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-xs text-slate-400 shrink-0">2</div>
                <p className="text-[11px] font-semibold text-slate-300">
                  Scroll down and tap **Add to Home Screen** <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Android / Chrome Guide */
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Android / Chrome</h2>
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Install Application Now
              </button>
            ) : (
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-white/5 space-y-2">
                <p className="text-[10px] font-semibold text-slate-300 text-center">
                  To install, tap the browser's menu button (three dots <span className="font-bold">⋮</span>) and select <span className="font-black text-blue-400">Install App</span> or <span className="font-black text-blue-400">Add to Home Screen</span>.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Bypass */}
      <div className="relative z-10 text-center pb-4 space-y-4">
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
          ⚡ SOVEREIGN V2 · GEOFENCING ENFORCED
        </p>
        <button
          onClick={handleBypass}
          className="text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-widest underline decoration-slate-500/30 underline-offset-4"
        >
          Bypass for Development
        </button>
      </div>
    </div>
  );
}
