"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Scan, 
  Map as MapIcon, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight,
  User,
  LayoutGrid,
  Touchpad,
  ShieldCheck,
  AlertCircle,
  Timer,
  ChevronRight,
  TrendingUp,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { submitStudentAttendanceAction } from "@/lib/actions/attendance-actions";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  photoUrl?: string;
}

interface VelocityAttendanceProps {
  students?: any[];
  classId?: string;
  sectionId?: string;
}

export function VelocityAttendance({ students = [], classId, sectionId }: VelocityAttendanceProps) {
  const [viewMode, setViewMode] = useState<"Swipe" | "Grid">("Swipe");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marked, setMarked] = useState<Record<string, "Present" | "Absent" | "Late">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date] = useState(new Date().toISOString().split("T")[0]);

  const currentStudent = students[currentIndex];
  const progress = (currentIndex / students.length) * 100;
  const stats = useMemo(() => {
    const values = Object.values(marked);
    return {
       present: values.filter(v => v === "Present").length,
       absent: values.filter(v => v === "Absent").length,
       late: values.filter(v => v === "Late").length
    };
  }, [marked]);

  const handleMark = (status: "Present" | "Absent" | "Late") => {
    if (currentIndex >= students.length) return;
    
    setMarked(prev => ({ ...prev, [currentStudent.id]: status }));
    setCurrentIndex(prev => prev + 1);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    const records = students.map(s => ({
       studentId: s.id,
       status: marked[s.id] || "Present", // Fallback to present if skipped
       classId,
       sectionId,
       date
    }));
    
    const result = await submitStudentAttendanceAction(records);
    if (result.success) {
       alert(`Velocity Attendance Synced! ${result.count} records saved.`);
    } else {
       alert("Error syncing records: " + result.error);
    }
    setIsSubmitting(false);
  };

  const resetAll = () => {
    setCurrentIndex(0);
    setMarked({});
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden relative font-sans text-white">
      {/* ─── Velocity Top Bar ─── */}
      <div className="p-6 flex items-center justify-between z-20 backdrop-blur-md bg-slate-900/50">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
               <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
               <h2 className="text-xl font-black tracking-tighter uppercase italic">Velocity <span className="text-blue-400">Attendance</span></h2>
               <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em]">{date}</p>
            </div>
         </div>
         
         <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700">
            <button 
               onClick={() => setViewMode("Swipe")}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", viewMode === "Swipe" ? "bg-blue-600 text-white" : "text-white/40")}
            >
               <Smartphone className="w-4 h-4 inline-block mr-2 -mt-0.5" /> Swipe
            </button>
            <button 
               onClick={() => setViewMode("Grid")}
               className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest", viewMode === "Grid" ? "bg-blue-600 text-white" : "text-white/40")}
            >
               <LayoutGrid className="w-4 h-4 inline-block mr-2 -mt-0.5" /> Grid
            </button>
         </div>
      </div>

      {/* ─── Real Time HUD ─── */}
      <div className="px-6 grid grid-cols-3 gap-3 mb-6 z-20">
         {[
            { label: "Present", count: stats.present, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Absent", count: stats.absent, color: "text-rose-400", bg: "bg-rose-400/10" },
            { label: "Late", count: stats.late, color: "text-amber-400", bg: "bg-amber-400/10" }
         ].map((stat, i) => (
            <div key={i} className={cn("p-4 rounded-3xl border border-white/5", stat.bg)}>
               <p className={cn("text-[9px] font-black uppercase tracking-widest opacity-40 mb-1", stat.color)}>{stat.label}</p>
               <p className="text-2xl font-black tracking-tighter">{stat.count}</p>
            </div>
         ))}
      </div>

      {/* ─── Main Experience ─── */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-12 overflow-hidden">
         {/* Progress Line */}
         <div className="absolute top-0 left-0 h-1 bg-blue-600 transition-all duration-300 z-30" style={{ width: `${progress}%` }} />

         {students.length === 0 ? (
            <div className="text-center space-y-4 animate-pulse">
               <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <User className="w-10 h-10 text-white/20" />
               </div>
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">No Dynamics Found</h3>
               <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Select a class with active enrollments to begin the run.</p>
            </div>
         ) : viewMode === "Swipe" ? (
            <AnimatePresence mode="wait">
               {currentIndex < students.length ? (
                  <SwipeCard 
                     key={currentStudent.id}
                     student={currentStudent}
                     onMark={handleMark}
                  />
               ) : (
                  <CompletionCard stats={stats} onSubmit={handleFinalSubmit} onReset={resetAll} loading={isSubmitting} />
               )}
            </AnimatePresence>
         ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full max-h-full overflow-y-auto custom-scrollbar pr-2">
               {students.map((s, i) => (
                  <GridCell 
                     key={s.id} 
                     student={s} 
                     status={marked[s.id]} 
                     onClick={(st) => setMarked(prev => ({ ...prev, [s.id]: st }))}
                  />
               ))}
               <div className="col-span-full pt-10">
                  <button onClick={handleFinalSubmit} disabled={isSubmitting} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl disabled:opacity-30">
                     {isSubmitting ? "Syncing..." : "Finalize & Submit Attendance"}
                  </button>
               </div>
            </div>
         )}
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}

/** ─── Swipe Mode Component ─── */
function SwipeCard({ student, onMark }: { student: Student, onMark: (s: "Present" | "Absent" | "Late") => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const background = useTransform(x, [-100, 0, 100], ["rgba(255, 34, 34, 0.2)", "rgba(15, 23, 42, 1)", "rgba(16, 185, 129, 0.2)"]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) onMark("Present");
    else if (info.offset.x < -100) onMark("Absent");
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate, opacity, background }}
      initial={{ scale: 0.5, y: 100, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 1.1, opacity: 0, 
         x: x.get() > 0 ? 1000 : x.get() < 0 ? -1000 : 0,
         transition: { duration: 0.3 }
      }}
      className="w-full max-w-sm aspect-[3/4] rounded-[3rem] border border-white/10 shadow-2xl shadow-black/80 flex flex-col relative overflow-hidden group cursor-grab active:cursor-grabbing backdrop-blur-2xl"
    >
       <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-32 h-32 rounded-[2.5rem] bg-slate-800 border-2 border-white/10 flex items-center justify-center mb-8 overflow-hidden">
             {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
             ) : (
                <User className="w-12 h-12 text-white/20" />
             )}
          </div>
          <h3 className="text-3xl font-black tracking-tighter mb-2 underline decoration-blue-500/20 underline-offset-8 decoration-4">{student.firstName} {student.lastName}</h3>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{student.studentCode}</p>
       </div>

       {/* Visual Hints */}
       <div className="absolute inset-x-0 bottom-10 px-10 flex items-center justify-between pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col items-center gap-2 text-rose-500">
             <XCircle className="w-8 h-8" />
             <span className="text-[9px] font-black uppercase tracking-widest">Swipe Left</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-emerald-500">
             <CheckCircle2 className="w-8 h-8" />
             <span className="text-[9px] font-black uppercase tracking-widest">Swipe Right</span>
          </div>
       </div>

       {/* Late Clickable */}
       <button 
          onClick={() => onMark("Late")}
          className="absolute top-8 right-8 w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-amber-400/20 hover:text-amber-400 transition-all active:scale-90"
          title="Mark Late"
       >
          <Timer className="w-5 h-5" />
       </button>
    </motion.div>
  );
}

/** ─── Grid Mode Cell ─── */
function GridCell({ student, status, onClick }: { student: Student, status?: string, onClick: (s: any) => void }) {
   return (
      <div 
         onClick={() => onClick(status === "Present" ? "Absent" : "Present")}
         className={cn(
            "aspect-square rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center p-2 relative group",
            status === "Present" ? "bg-emerald-600 border-emerald-400 shadow-lg shadow-emerald-500/20" :
            status === "Absent" ? "bg-rose-600 border-rose-400 shadow-lg shadow-rose-500/20" :
            status === "Late" ? "bg-amber-600 border-amber-400 shadow-lg shadow-amber-500/20" :
            "bg-slate-800 border-white/5 hover:border-white/20"
         )}
      >
         <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-bold mb-1">
            {student.firstName[0]}
         </div>
         <p className="text-[8px] font-black text-center uppercase tracking-tighter leading-tight opacity-80">{student.firstName}</p>
         
         <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white text-slate-900 rounded-full p-1 border shadow-2xl shadow-white/40">
               <ArrowRight className="w-2 h-2" />
            </div>
         </div>
      </div>
   );
}

/** ─── Completion State ─── */
function CompletionCard({ stats, onSubmit, onReset, loading }: any) {
   return (
      <motion.div 
         initial={{ opacity: 0, scale: 0.9 }} 
         animate={{ opacity: 1, scale: 1 }}
         className="w-full max-w-sm bg-slate-800/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 text-center"
      >
         <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
         </div>
         <h3 className="text-3xl font-black tracking-tighter mb-4 italic uppercase">Run Complete</h3>
         <p className="text-xs font-medium opacity-40 leading-relaxed mb-8">
            You have marked all students. Review the summary below before final sync.
         </p>

         <div className="space-y-3 mb-10">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-white/30">Total Present</span>
                <span className="text-xl font-black text-emerald-400">{stats.present}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-white/30">Total Absent</span>
                <span className="text-xl font-black text-rose-400">{stats.absent}</span>
            </div>
         </div>

         <div className="flex flex-col gap-3">
            <button 
               onClick={onSubmit}
               disabled={loading}
               className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
               {loading ? "Syncing Logic..." : "Sync Daily Ledger"}
               <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={onReset} className="w-full py-3 text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
               <RotateCcw className="w-3 h-3 inline-block mr-2" /> Reset Run
            </button>
         </div>
      </motion.div>
   );
}
