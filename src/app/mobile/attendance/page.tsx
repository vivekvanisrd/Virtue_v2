"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Building, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  Camera, 
  User, 
  LogOut,
  Zap,
  Clock,
  QrCode,
  X
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { getSessionUserAction, signOutAction } from "@/lib/actions/auth-native";

type ScreenState = "LOGIN" | "DASHBOARD";

type UserState = {
  id: string;
  staffCode: string;
  firstName: string;
  lastName: string;
  branchName: string;
  department: string;
};

type StatsState = {
  presentThisMonth: number;
  latesThisMonth: number;
  attendancePercent: number;
};

type ToastState = {
  type: "success" | "error" | "info" | "loading";
  message: string;
} | null;

export default function MobileAttendanceScanner() {
  const [screen, setScreen] = useState<ScreenState>("LOGIN");
  const [staffCodeInput, setStaffCodeInput] = useState("");
  const [user, setUser] = useState<UserState | null>(null);
  const [stats, setStats] = useState<StatsState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  // Auto-login from session or localStorage
  useEffect(() => {
    const checkSessionAndLocal = async () => {
      setIsLoading(true);
      try {
        const sessionRes = await getSessionUserAction();
        if (sessionRes.success && sessionRes.user) {
          setUser(sessionRes.user);
          if (sessionRes.stats) setStats(sessionRes.stats);
          setScreen("DASHBOARD");
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Session check failed, falling back to localStorage:", err);
      }

      const savedUser = localStorage.getItem("sov2_staff_user");
      const savedStats = localStorage.getItem("sov2_staff_stats");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          setUser(u);
          if (savedStats) setStats(JSON.parse(savedStats));
          setScreen("DASHBOARD");
          // Background refresh stats
          refreshData(u.staffCode);
        } catch (e) {
          localStorage.removeItem("sov2_staff_user");
          localStorage.removeItem("sov2_staff_stats");
        }
      }
      setIsLoading(false);
    };

    checkSessionAndLocal();
  }, []);

  const showToast = (type: "success" | "error" | "info" | "loading", message: string, duration = 4000) => {
    setToast({ type, message });
    if (type !== "loading" && duration > 0) {
      setTimeout(() => setToast(null), duration);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffCodeInput.trim()) {
      showToast("error", "Please enter your Staff Code.");
      return;
    }

    setIsLoading(true);
    showToast("loading", "Securing Identity...");

    try {
      const res = await fetch("/api/auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode: staffCodeInput.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setStats(data.stats);
        localStorage.setItem("sov2_staff_user", JSON.stringify(data.user));
        localStorage.setItem("sov2_staff_stats", JSON.stringify(data.stats));
        setScreen("DASHBOARD");
        setToast(null);
      } else {
        showToast("error", data.error || "Authentication failed.");
      }
    } catch (err: any) {
      showToast("error", "Connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async (code: string) => {
    try {
      const res = await fetch("/api/auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffCode: code })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setStats(data.stats);
        localStorage.setItem("sov2_staff_user", JSON.stringify(data.user));
        localStorage.setItem("sov2_staff_stats", JSON.stringify(data.stats));
      }
    } catch (e) {
      console.error("Stats refresh failed", e);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("sov2_staff_user");
    localStorage.removeItem("sov2_staff_stats");
    setUser(null);
    setStats(null);
    setScreen("LOGIN");
    setStaffCodeInput("");
    try {
      await signOutAction();
    } catch (e) {
      console.error("Sign out action failed:", e);
    }
  };

  // Get high-accuracy GPS coordinates
  const getCoordinates = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("GPS fetch error:", error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Initialize QR scanner when isScanning state becomes true
  useEffect(() => {
    if (isScanning) {
      showToast("loading", "Starting scanner view...");
      
      const startCamera = async () => {
        try {
          const qrScanner = new Html5Qrcode("reader");
          qrCodeRef.current = qrScanner;
          
          await qrScanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              handleQrFound(decodedText);
            },
            () => {
              // Verbose error ignored to avoid spamming
            }
          );
          setToast(null); // Clear loading toast
        } catch (err: any) {
          console.error("Camera start error", err);
          showToast("error", "Camera failed. Verify permissions & secure context (HTTPS).");
          setIsScanning(false);
        }
      };

      // Slight timeout to let the DOM element mount
      const t = setTimeout(startCamera, 200);
      return () => {
        clearTimeout(t);
        if (qrCodeRef.current) {
          if (qrCodeRef.current.isScanning) {
            qrCodeRef.current.stop().catch(e => console.error("Scanner stop fail", e));
          }
          qrCodeRef.current = null;
        }
      };
    }
  }, [isScanning]);

  const handleQrFound = async (token: string) => {
    // 1. Immediately close scanner and clean up to prevent multiple scans
    setIsScanning(false);
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      await qrCodeRef.current.stop().catch(console.error);
    }
    
    if (!user) return;

    showToast("loading", "Verifying gate QR & location...");

    // 2. Fetch coordinates
    const coords = await getCoordinates();
    
    // 3. Post to backend
    try {
      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          staffId: user.id,
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast("success", data.message || "Attendance recorded successfully!");
        // Refresh local stats
        refreshData(user.staffCode);
      } else {
        showToast("error", data.error || "Gate scan failed.");
      }
    } catch (err) {
      showToast("error", "Network error. Failed to record attendance.");
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-neutral-200 font-sans antialiased flex flex-col justify-between selection:bg-blue-500/30">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-20%,_#1e293b_0%,_transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_120%,_#1e1b4b_0%,_transparent_50%)] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase">Sovereign <span className="text-blue-500">PWA</span></h1>
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">Attendance Scanner</p>
          </div>
        </div>
        {screen === "DASHBOARD" && (
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/15"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center p-6 relative z-10 w-full max-w-md mx-auto">
        {screen === "LOGIN" ? (
          <div className="w-full space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <QrCode className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Identity Terminal</h2>
              <p className="text-xs text-slate-400 font-semibold tracking-wide">Enter your official Staff Code to unlock scanner access</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Official Staff Code</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STF-VIVES-HQ-001"
                    value={staffCodeInput}
                    onChange={(e) => setStaffCodeInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/5 focus:border-blue-500/40 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authenticate Terminal"}
              </button>
            </form>
          </div>
        ) : (
          user && (
            <div className="w-full space-y-6 animate-in fade-in duration-500">
              {/* Profile Card */}
              <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl backdrop-blur-xl relative overflow-hidden group shadow-xl shadow-black/10">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building className="w-20 h-20" />
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Staff Profile</span>
                    <h3 className="text-xl font-black text-white tracking-tight mt-0.5">{user.firstName} {user.lastName}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <Building className="w-3.5 h-3.5 text-blue-500" />
                      <span>{user.branchName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{user.department}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "PRESENT", value: stats?.presentThisMonth ?? "—", emoji: "✅", bg: "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" },
                  { label: "LATE", value: stats?.latesThisMonth ?? "—", emoji: "⏰", bg: "bg-orange-500/5 border-orange-500/10 text-orange-400" },
                  { label: "RATIO", value: stats ? `${stats.attendancePercent}%` : "—", emoji: "📊", bg: "bg-blue-500/5 border-blue-500/10 text-blue-400" }
                ].map((stat, i) => (
                  <div key={i} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${stat.bg}`}>
                    <span className="text-xs mb-1">{stat.emoji}</span>
                    <span className="text-lg font-black text-white">{stat.value}</span>
                    <span className="text-[7px] font-black tracking-widest opacity-50 uppercase mt-0.5">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Action Scan Card */}
              <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] text-center shadow-inner relative overflow-hidden group flex flex-col items-center gap-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full pointer-events-none" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black tracking-widest uppercase text-slate-400">Daily Attendance Portal</h4>
                  <p className="text-[9px] font-semibold text-slate-500 tracking-wide">Register presence inside school coordinates</p>
                </div>
                
                <button
                  onClick={() => setIsScanning(true)}
                  className="w-48 h-48 bg-slate-900 border border-white/5 rounded-full flex flex-col items-center justify-center gap-2 hover:border-blue-500/20 shadow-2xl hover:shadow-blue-500/5 hover:scale-[1.02] active:scale-[0.98] transition-all relative group"
                >
                  <div className="absolute inset-2 border-2 border-dashed border-white/5 group-hover:border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
                  <Camera className="w-10 h-10 text-blue-500" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest mt-1">Tap to Scan</span>
                </button>
              </div>

              {/* Code ID card */}
              <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                <span className="text-[7px] font-black tracking-widest text-slate-500 uppercase">Secure Identity Code</span>
                <span className="text-xs font-black tracking-wider text-blue-400 mt-1 font-mono">{user.staffCode}</span>
              </div>
            </div>
          )
        )}

        {/* QR Scan Overlay Viewport */}
        {isScanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between items-center p-6 animate-in fade-in duration-300">
            <header className="w-full flex justify-between items-center max-w-md mx-auto">
              <span className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-500" /> Viewfinder
              </span>
              <button 
                onClick={() => setIsScanning(false)}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="relative w-full max-w-[320px] aspect-square rounded-[2rem] overflow-hidden border-4 border-blue-500 shadow-2xl shadow-blue-500/20 bg-slate-950 flex items-center justify-center">
              <div id="reader" className="w-full h-full object-cover" />
              
              {/* Scan HUD frame */}
              <div className="absolute inset-6 border-2 border-dashed border-blue-500/30 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-4 h-4 border-t-2 border-l-2 border-blue-500 absolute top-0 left-0" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-blue-500 absolute top-0 right-0" />
                <div className="w-4 h-4 border-b-2 border-l-2 border-blue-500 absolute bottom-0 left-0" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-blue-500 absolute bottom-0 right-0" />
                <div className="h-[2px] w-full bg-blue-500/50 absolute top-1/2 left-0 -translate-y-1/2 animate-[pulse_1.5s_infinite]" />
              </div>
            </div>

            <div className="text-center space-y-1 max-w-xs mx-auto">
              <p className="text-xs font-black text-white uppercase tracking-widest">Sample Camera Feed</p>
              <p className="text-[9px] font-semibold text-slate-500">Align the Gate QR code within the focus frame to scan</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
        ⚡ SOVEREIGN V2 · GATEWAY PWA ONLINE
      </footer>

      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 left-6 right-6 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xl backdrop-blur-md ${
            toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100" :
            toast.type === "error" ? "bg-rose-950/90 border-rose-500/30 text-rose-100" :
            toast.type === "loading" ? "bg-slate-950/90 border-slate-700/50 text-slate-100" :
            "bg-slate-900/90 border-slate-700/30 text-neutral-200"
          }`}>
            {toast.type === "loading" ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            ) : toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="text-xs font-bold leading-tight">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
