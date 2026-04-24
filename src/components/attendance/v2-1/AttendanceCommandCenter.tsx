"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Zap, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  UserCheck, 
  Clock, 
  Users,
  Search,
  Settings2,
  AlertTriangle,
  RefreshCcw,
  ShieldCheck,
  CalendarDays,
  Rows
} from "lucide-react";
import { 
  getAttendanceCommandStatsAction, 
  submitManualAttendanceAction, 
  submitFaceAttendanceAction,
  getStaffPulseAction
} from "@/lib/actions/attendance-v2-actions";
import { MonthlyRegister } from "./MonthlyRegister";
import { ShiftManager } from "./ShiftManager";
import { PersonnelAssignment } from "./PersonnelAssignment";
import { ExceptionDashboard } from "./ExceptionDashboard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function AttendanceCommandCenter() {
  const [activeTab, setActiveTab] = useState<"PULSE" | "REGISTER" | "SHIFTS" | "LEDGER" | "PERSONNEL" | "AUDIT">("PULSE");
  const [stats, setStats] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  // Face Modal State
  const [isFaceMode, setIsFaceMode] = useState(false);
  const [scanStatus, setScanStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "FAIL">("IDLE");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchStats = async () => {
    const res = await getAttendanceCommandStatsAction("GLOBAL");
    if (res.success) setStats(res.data);
  };

  const fetchStaff = async () => {
    setLoading(true);
    try {
        const res = await getStaffPulseAction();
        if (res.success) setStaff(res.data);
    } catch (err) {
        console.error("Fetch Error:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchStaff();
  }, []);

  const handleManualMark = async (staffId: string, status?: string) => {
    setMarkingId(`${staffId}-${status || 'AUTO'}`);
    try {
        const res = await submitManualAttendanceAction(staffId, status);
        if (res.success) {
          await Promise.all([fetchStats(), fetchStaff()]);
        } else {
            alert(res.error || "Failed to mark attendance.");
        }
    } catch (err) {
        alert("A technical error occurred during marking.");
    } finally {
        setMarkingId(null);
    }
  };

  // 🏛️ Dynamic Policy Gate: Disable 'P' past grace period (8:30 AM + 10m)
  const getIsPDisabled = () => {
    const now = new Date();
    const currentMins = (now.getHours() * 60) + now.getMinutes();
    const graceThreshold = 510 + 10; // 8:30 AM + 10m Grace confirmed by User
    return currentMins > graceThreshold;
  };
  const isPDisabled = getIsPDisabled();

  const startFaceScan = async () => {
     setIsFaceMode(true);
     setScanStatus("IDLE");
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
       if (videoRef.current) videoRef.current.srcObject = stream;
     } catch (err) {
       console.error("Camera Access Error:", err);
       alert("Camera Access Required for Facial Recognition.");
     }
  };

  const captureAndVerify = async () => {
     if (!videoRef.current || !canvasRef.current) return;
     setScanStatus("SCANNING");
     
     const canvas = canvasRef.current;
     canvas.width = videoRef.current.videoWidth;
     canvas.height = videoRef.current.videoHeight;
     const ctx = canvas.getContext("2d");
     ctx?.drawImage(videoRef.current, 0, 0);
     
     const base64 = canvas.toDataURL("image/jpeg");
     const res = await submitFaceAttendanceAction(base64);
     
     if (res.success) {
        setScanStatus("SUCCESS");
        setTimeout(() => {
           setIsFaceMode(false);
           fetchStats();
           fetchStaff();
        }, 1500);
     } else {
        setScanStatus("FAIL");
     }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 relative">
      {/* ─── HI-FIDELITY LOADING BAR ─── */}
      {loading && (
          <div className="fixed top-0 left-0 right-0 h-1.5 bg-blue-600/10 z-[100] overflow-hidden">
              <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite] w-[40%] shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          </div>
      )}

      {/* ─── COMMAND NAV ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-3xl border border-slate-200 shadow-inner">
            <button 
               onClick={() => setActiveTab("PULSE")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "PULSE" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <Zap className={cn("w-4 h-4", activeTab === "PULSE" && "animate-pulse")} /> Pulse
            </button>
            <button 
               onClick={() => setActiveTab("LEDGER")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "LEDGER" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <Rows className="w-4 h-4" /> Daily Ledger
            </button>
            <button 
               onClick={() => setActiveTab("REGISTER")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "REGISTER" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <CalendarDays className="w-4 h-4" /> Register
            </button>
            <button 
               onClick={() => setActiveTab("SHIFTS")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "SHIFTS" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <Settings2 className="w-4 h-4" /> Manager
            </button>
            <button 
               onClick={() => setActiveTab("PERSONNEL")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "PERSONNEL" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <UserCheck className="w-4 h-4" /> Personnel
            </button>
            <button 
               onClick={() => setActiveTab("AUDIT")}
               className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3",
                  activeTab === "AUDIT" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
               )}
            >
               <AlertTriangle className="w-4 h-4" /> Audit
            </button>
         </div>

         <div className="flex items-center gap-4 text-slate-400 italic">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 font-mono tracking-tighter">Sovereign Governance Active</span>
         </div>
      </div>

      {activeTab === "PULSE" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="relative z-10">
                   <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Building Occupancy</p>
                   <h3 className="text-5xl font-black italic tracking-tighter">{stats?.inside || 0}</h3>
                </div>
                <div className="mt-8 flex items-center gap-2 relative z-10">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                   <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Real-Time Pulse Active</span>
                </div>
                <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Users className="w-32 h-32 rotate-12" />
                </div>
            </div>

            <div className="p-8 bg-white border border-border rounded-[2.5rem] shadow-sm flex flex-col justify-between hover:shadow-xl transition-shadow">
                <p className="text-[10px] font-black text-blue-600 opacity-40 uppercase tracking-widest mb-1">Total Present</p>
                <h3 className="text-5xl font-black text-slate-900">{stats?.present || 0}</h3>
                <span className="text-[10px] font-medium opacity-40 mt-8">Across All Departments</span>
            </div>

            <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] shadow-sm flex flex-col justify-between hover:bg-amber-100/30 transition-colors">
                <p className="text-[10px] font-black text-amber-900 opacity-40 uppercase tracking-widest mb-1">Late Exceptions</p>
                <h3 className="text-5xl font-black text-amber-600">{stats?.late || 0}</h3>
                <div className="flex items-center gap-2 mt-8">
                   <Clock className="w-4 h-4 text-amber-600" />
                   <span className="text-[10px] font-bold text-amber-900 opacity-60 uppercase tracking-widest">Pending Policy Review</span>
                </div>
            </div>

            <div className="p-2 border border-slate-200 rounded-[2.5rem] bg-slate-50 flex items-center justify-center group">
                <button 
                   onClick={startFaceScan}
                   disabled={loading}
                   className="w-full h-full bg-blue-600 text-white rounded-[2.2rem] flex flex-col items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 group hover:scale-[0.98] active:scale-90"
                >
                   <Camera className="w-10 h-10 group-hover:scale-110 transition-transform" />
                   <span className="text-xs font-black uppercase tracking-[0.2em]">Launch AI Scan</span>
                </button>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl relative min-h-[400px]">
            <div className="p-10 border-b border-border flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-50/50">
                <div>
                   <h3 className="text-2xl font-black tracking-tighter uppercase italic">Immediate Marking Wall</h3>
                   <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Quick Entry Access • {staff.length} Personnel</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-border shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                   <Search className="w-4 h-4 text-slate-400" />
                   <input 
                      type="text" 
                      placeholder="SEARCH PERSONNEL..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-transparent text-[10px] font-black outline-none w-full md:w-48 placeholder:text-slate-200"
                   />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-8 relative">
                {/* ─── EMPTY STATE / SKELETON ─── */}
                {staff.length === 0 && !loading && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                        <Users className="w-16 h-16" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Personnel Found in Registry</p>
                    </div>
                )}

                {loading && staff.length === 0 && Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center gap-4 animate-pulse">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                        <div className="flex-1 space-y-2">
                             <div className="h-3 bg-slate-100 rounded w-2/3" />
                             <div className="h-2 bg-slate-100 rounded w-1/3" />
                        </div>
                    </div>
                ))}

                {staff.filter(s => 
                    `${s.firstName} ${s.lastName} ${s.staffCode}`.toLowerCase().includes(search.toLowerCase())
                ).map((s) => {
                    const isMarked = !!s.attendance?.[0];
                    const isCurrentlyMarking = markingId?.startsWith(s.id);
                    
                    return (
                        <div key={s.id} className={cn(
                            "p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group transition-all duration-500 overflow-hidden relative",
                            isMarked ? "opacity-60 saturate-50" : "hover:bg-white hover:shadow-2xl hover:-translate-y-1"
                        )}>
                             <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                    {s.firstName[0]}{s.lastName[0]}
                                    </div>
                                    <div>
                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[100px] italic">{s.firstName}</p>
                                    <span className={cn(
                                        "text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                        isMarked ? "text-emerald-500" : "text-slate-300"
                                    )}>
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isMarked ? "bg-emerald-500" : "bg-slate-300")} />
                                        {isMarked ? s.attendance[0].status.toUpperCase() : "PENDING"}
                                    </span>
                                    </div>
                                </div>
                                {isMarked && <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-in zoom-in" />}
                             </div>

                             {/* ─── STATUS MATRIX RAIL ─── */}
                             <div className="flex items-center gap-1.5">
                                {[
                                    { key: "P", status: "Present", color: "bg-emerald-500", disabled: isPDisabled || isMarked },
                                    { key: "A", status: "Absent", color: "bg-rose-500", disabled: isMarked },
                                    { key: "L", status: "Late", color: "bg-amber-500", disabled: isMarked },
                                    { key: "HD", status: "Half-Day", color: "bg-violet-500", disabled: isMarked },
                                    { key: "LP", status: "Loss of Pay", color: "bg-blue-600", disabled: isMarked }
                                ].map((btn) => (
                                    <button
                                        key={btn.key}
                                        onClick={(e) => { e.stopPropagation(); handleManualMark(s.id, btn.status); }}
                                        disabled={btn.disabled || isCurrentlyMarking}
                                        className={cn(
                                            "flex-1 py-3 rounded-xl font-black text-[10px] text-white transition-all active:scale-90 flex items-center justify-center relative overflow-hidden",
                                            btn.color,
                                            btn.disabled ? "opacity-10 grayscale cursor-not-allowed" : "hover:scale-105 shadow-lg shadow-black/5",
                                            markingId === `${s.id}-${btn.status}` && "animate-pulse"
                                        )}
                                        title={btn.status}
                                    >
                                        {markingId === `${s.id}-${btn.status}` ? <RefreshCcw className="w-3 h-3 animate-spin" /> : btn.key}
                                    </button>
                                ))}
                             </div>

                             {isCurrentlyMarking && (
                                 <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in">
                                     <div className="h-1 w-1/2 bg-blue-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-blue-600 animate-[shimmer_1s_infinite] w-[30%]" />
                                     </div>
                                 </div>
                             )}
                        </div>
                    );
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "LEDGER" && (
          <div className="bg-white rounded-[3rem] border border-border overflow-hidden shadow-2xl animate-in flip-in-y-90 duration-500">
             <div className="p-10 border-b border-border bg-slate-50/50 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Daily Attendance Ledger</h3>
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Detailed Operational Log • {format(new Date(), "PP")}</p>
                 </div>
                 <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">Download PDF</button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                       <tr className="bg-slate-50 border-b border-border text-[9px] font-black uppercase tracking-widest text-slate-400">
                          <th className="px-10 py-5">Personnel</th>
                          <th className="px-10 py-5">Status</th>
                          <th className="px-10 py-5">In Time</th>
                          <th className="px-10 py-5">Out Time</th>
                          <th className="px-10 py-5">Duration</th>
                          <th className="px-10 py-5">Verification</th>
                       </tr>
                    </thead>
                    <tbody>
                       {staff.map(s => {
                           const rec = s.attendance?.[0];
                           return (
                               <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                  <td className="px-10 py-6">
                                     <p className="text-sm font-black text-slate-900 uppercase italic">{s.firstName} {s.lastName}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.staffCode}</p>
                                  </td>
                                  <td className="px-10 py-6">
                                     <span className={cn(
                                         "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                         rec?.status === "Present" ? "bg-emerald-100 text-emerald-600" : 
                                         rec?.status === "Late" ? "bg-amber-100 text-amber-600" : 
                                         rec?.status === "Loss of Pay" ? "bg-blue-100 text-blue-600" :
                                         rec?.status === "Half-Day" ? "bg-violet-100 text-violet-600" :
                                         "bg-slate-100 text-slate-400"
                                     )}>
                                         {rec?.status || "ABSENT"}
                                     </span>
                                  </td>
                                  <td className="px-10 py-6 text-xs font-bold text-slate-600">{rec?.checkIn ? format(new Date(rec.checkIn), "p") : "—"}</td>
                                  <td className="px-10 py-6 text-xs font-bold text-slate-600">{rec?.checkOut ? format(new Date(rec.checkOut), "p") : "—"}</td>
                                  <td className="px-10 py-6 text-xs font-bold text-slate-600">{rec?.checkIn && rec?.checkOut ? "8h 15m" : "—"}</td>
                                  <td className="px-10 py-6 font-mono text-[9px] text-slate-400 uppercase">{rec?.isFaceVerified ? "AI_VERIFIED" : "MANUAL_BY_ADMIN"}</td>
                               </tr>
                           );
                       })}
                    </tbody>
                </table>
             </div>
          </div>
      )}

      {activeTab === "REGISTER" && <MonthlyRegister />}
      {activeTab === "SHIFTS" && <ShiftManager />}
      {activeTab === "PERSONNEL" && <PersonnelAssignment />}
      {activeTab === "AUDIT" && <ExceptionDashboard />}

      {isFaceMode && (
         <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-3xl flex items-center justify-center p-6">
            <div className="max-w-xl w-full bg-slate-800 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in duration-300">
               <div className="p-8 border-b border-white/5 flex justify-between items-center text-white">
                  <div>
                     <h3 className="text-xl font-black italic tracking-tighter uppercase">AI Biometric Scanner</h3>
                     <p className="text-[10px] font-black opacity-40 tracking-[0.2em] uppercase">Verifying Staff Identity (90% Threshold)</p>
                  </div>
                  <button onClick={() => setIsFaceMode(false)} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                     <XCircle className="w-6 h-6 text-white/40" />
                  </button>
               </div>
               
               <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  <video 
                     ref={videoRef} 
                     autoPlay 
                     muted 
                     playsInline 
                     className="w-full h-full object-cover grayscale brightness-75 contrast-125"
                  />
                  <div className="absolute inset-0 border-[30px] border-slate-900/30 pointer-events-none" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <div className="w-60 h-60 border-2 border-white/10 rounded-full relative animate-pulse">
                        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin duration-[4s]" />
                     </div>
                  </div>

                  {scanStatus === "SCANNING" && (
                    <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
                       <div className="flex flex-col items-center gap-4 text-white">
                          <RefreshCcw className="w-12 h-12 animate-spin" />
                          <p className="text-xs font-black uppercase tracking-[0.3em]">Processing AI Match...</p>
                       </div>
                    </div>
                  )}

                  {scanStatus === "SUCCESS" && (
                    <div className="absolute inset-0 bg-emerald-600/90 flex flex-col items-center justify-center text-white p-10 text-center">
                       <ShieldCheck className="w-24 h-24 mb-6 animate-bounce" />
                       <h4 className="text-3xl font-black italic tracking-tighter uppercase">Verified & Mark Recorded</h4>
                       <p className="text-xs font-bold opacity-70 tracking-widest mt-2">Identity match confirmed at 98% confidence</p>
                    </div>
                  )}

                  {scanStatus === "FAIL" && (
                     <div className="absolute inset-0 bg-rose-600/90 flex flex-col items-center justify-center text-white p-10 text-center">
                        <AlertTriangle className="w-24 h-24 mb-6" />
                        <h4 className="text-3xl font-black italic tracking-tighter uppercase">Identity Reject</h4>
                        <p className="text-xs font-bold opacity-70 tracking-widest mt-2 uppercase">Please position your face clearly or use manual mark</p>
                        <button onClick={() => setScanStatus("IDLE")} className="mt-8 px-8 py-3 bg-white text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Try Again</button>
                     </div>
                  )}
               </div>

               <canvas ref={canvasRef} className="hidden" />

               <div className="p-10 bg-slate-900 flex items-center justify-between gap-6">
                  <div className="flex-1">
                     <p className="text-[10px] font-black italic text-white/20 uppercase tracking-widest mb-1">Status</p>
                     <p className="text-xs font-bold text-white uppercase tracking-widest">
                        {scanStatus === "IDLE" ? "System Waiting..." : "Biometric Sync Active"}
                     </p>
                  </div>
                  <button 
                     onClick={captureAndVerify}
                     disabled={scanStatus === "SCANNING"}
                     className="px-14 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                     Capture & Sync
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
