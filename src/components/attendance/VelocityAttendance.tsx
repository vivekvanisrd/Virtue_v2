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
  Smartphone,
  Clock,
  Lock as LucideLock
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { submitStudentAttendanceAction } from "@/lib/actions/attendance-actions";
import { getClassesAction, getSectionsAction } from "@/lib/actions/academic-actions";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { useTabs } from "@/context/tab-context";

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

export function VelocityAttendance({ students: initialStudents = [], classId: initialClassId, sectionId: initialSectionId }: VelocityAttendanceProps) {
  const { openTab } = useTabs();
  const [marked, setMarked] = useState<Record<string, "Present" | "Absent" | "Late">>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date] = useState(new Date().toISOString().split("T")[0]);

  // Standalone States
  const [students, setStudents] = useState<any[]>(initialStudents);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"Setup" | "Swipe" | "Grid" | "Recap">("Setup");
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<{ present: number; absent: number; late: number; absentees: any[] } | null>(null);
  const [lockTimeLeft, setLockTimeLeft] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function loadClasses() {
      const res = await getClassesAction();
      if (res.success) setClasses(res.data);
    }
    if (!initialClassId) loadClasses();
  }, [initialClassId]);

  useEffect(() => {
    async function loadSections() {
      if (!classId) return;
      const res = await getSectionsAction(classId);
      if (res.success) setSections(res.data);
    }
    loadSections();
  }, [classId]);

  const fetchStudents = async () => {
    if (!classId) return;
    setIsLoading(true);
    const res = await getStudentListAction({ classId, sectionId });
    if (res.success) {
      setStudents(res.data);
      setCurrentIndex(0);
      setMarked({});
      setViewMode("Swipe");
    }
    setIsLoading(false);
  };

  const currentStudent = students[currentIndex];
  const progress = students.length > 0 ? (currentIndex / students.length) * 100 : 0;
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
       status: marked[s.id] || "Present", 
       classId,
       sectionId,
       date
    }));
    
    const result = await submitStudentAttendanceAction(records);
    if (result.success) {
       // CALCULATE SUMMARY DATA
       const presentCount = records.filter(r => r.status === "Present").length;
       const absentCount = records.filter(r => r.status === "Absent").length;
       const lateCount = records.filter(r => r.status === "Late").length;
       const absentees = students.filter(s => records.find(r => r.studentId === s.id && r.status === "Absent"));

       setSummary({
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          absentees: absentees
       });

       setViewMode("Recap");
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
    <div className="flex flex-col h-full bg-[var(--background)] overflow-hidden relative font-sans text-[var(--foreground)]">
      {/* ─── Velocity Top Bar ─── */}
      <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
               <h2 className="text-xl font-black italic uppercase tracking-tighter text-[var(--foreground)]">Velocity <span className="text-blue-500">Attendance</span></h2>
               <p className="text-xs font-bold text-[var(--foreground)]/40 tracking-widest">{new Date().toISOString().split('T')[0]}</p>
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

         {viewMode === "Setup" ? (
            <div className="text-center space-y-10 animate-in fade-in zoom-in duration-700 bg-[var(--card)] p-12 rounded-[4rem] border border-[var(--border)] backdrop-blur-3xl max-w-lg w-full premium-shadow">
               <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 relative group border border-blue-500/20">
                  <Scan className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform" />
               </div>
               
               <div className="space-y-6">
                 <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--foreground)]">Prepare Your Run</h3>
                    <p className="text-xs font-bold text-[var(--foreground)]/50 uppercase tracking-[0.2em] mt-2">Select a target population to begin fast-track marking.</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                       <label className="text-xs font-black uppercase text-[var(--foreground)]/80 tracking-widest ml-1">Class Level</label>
                       <select 
                         value={classId} 
                         onChange={(e) => {
                            setClassId(e.target.value);
                            setStudents([]); // Clear current list on change
                         }}
                         className="w-full bg-[var(--background)] border border-[var(--border)] p-4 rounded-2xl outline-none focus:border-blue-500 transition-all font-black text-[var(--foreground)]"
                       >
                          <option value="">Select Class</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2 text-left">
                       <label className="text-xs font-black uppercase text-[var(--foreground)]/80 tracking-widest ml-1">Section</label>
                       <select 
                         value={sectionId} 
                         onChange={(e) => {
                            setSectionId(e.target.value);
                            setStudents([]); // Clear current list on change
                         }}
                         className="w-full bg-[var(--background)] border border-[var(--border)] p-4 rounded-2xl outline-none focus:border-blue-500 transition-all font-black text-[var(--foreground)]"
                       >
                          <option value="">All Sections</option>
                          {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <button 
                  onClick={fetchStudents}
                  disabled={!classId || isLoading}
                  className="w-full bg-blue-600 text-white p-6 rounded-[2rem] font-black tracking-widest text-xs uppercase shadow-2xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-20 mt-4 flex items-center justify-center gap-4"
                 >
                   {isLoading ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                   ) : students.length > 0 ? (
                      <>RESUME VELOCITY RUN <ArrowRight className="w-5 h-5" /></>
                   ) : (
                      <>BEGIN VELOCITY RUN <ArrowRight className="w-5 h-5" /></>
                   )}
                 </button>
                 
                 {isLoading === false && classId && students.length === 0 && (
                    <div className="p-4 bg-amber-400/10 border border-amber-400/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
                       <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                          Warning: No students found in this selection.
                       </p>
                    </div>
                 )}
               </div>
            </div>
         ) : viewMode === "Recap" && summary ? (
            /* ─── RECAP DASHBOARD VIEW ─── */
            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500">
               <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-[2.5rem] p-8 text-center backdrop-blur-xl premium-shadow">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                     <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter text-[var(--foreground)] mb-2">Run Complete</h3>
                  <p className="text-xs font-bold text-[var(--foreground)]/40 uppercase tracking-widest mb-8">Daily Ledger Successfully Synchronized</p>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase mb-1">Present</p>
                        <p className="text-2xl font-black text-green-500">{summary.present}</p>
                     </div>
                     <div className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase mb-1">Absent</p>
                        <p className="text-2xl font-black text-red-500">{summary.absent}</p>
                     </div>
                     <div className="bg-[var(--background)] p-4 rounded-2xl border border-[var(--border)]">
                        <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase mb-1">Late</p>
                        <p className="text-2xl font-black text-blue-500">{summary.late}</p>
                     </div>
                  </div>

                  {summary.absent > 0 && (
                     <div className="text-left mb-8">
                        <p className="text-[10px] font-black text-[var(--foreground)]/40 uppercase tracking-widest mb-3 ml-1">Absentees List</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                            {summary.absentees.map(s => (
                              <div 
                                key={s.id} 
                                onClick={() => openTab({
                                   id: `student-profile-${s.id}`,
                                   title: `${s.firstName} Profile`,
                                   component: "Students",
                                   params: { studentId: s.id }
                                })}
                                className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl transition-colors hover:bg-red-500/10 cursor-pointer group"
                              >
                                 <span className="text-xs font-black text-[var(--foreground)] group-hover:underline group-hover:text-red-400">{s.firstName} {s.lastName}</span>
                                 <span className="text-[10px] font-bold text-[var(--foreground)]/60">{s.studentCode}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* LOCK INDICATOR */}
                  {!isLocked && (
                    <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center gap-3">
                       <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                       <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                          Grace Period: Editing Allowed
                       </p>
                    </div>
                  )}

                  <div className="space-y-3">
                     {!isLocked ? (
                       <button 
                        onClick={() => setViewMode("Swipe")}
                        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl hover:bg-blue-500 transition-all active:scale-95"
                       >
                          Edit Attendance Run
                       </button>
                     ) : (
                       <div className="p-5 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex items-center justify-center gap-3 grayscale opacity-60">
                          <LucideLock className="w-4 h-4 text-[var(--foreground)]/40" />
                          <span className="text-xs font-black text-[var(--foreground)]/40 uppercase tracking-widest">Attendance Finalized & Locked</span>
                       </div>
                     )}

                     <button 
                       onClick={() => alert("Simulated: Safety Alerts Broadcast to Parents!")}
                       className="w-full bg-[var(--foreground)] text-[var(--background)] p-5 rounded-2xl font-black tracking-widest text-xs uppercase shadow-xl hover:opacity-90 transition-all active:scale-95"
                     >
                        Broadcast Safety Alerts
                     </button>
                     
                     <button 
                       onClick={() => {
                          setViewMode("Setup");
                          setStudents([]);
                          setSummary(null);
                          setClassId("");
                       }}
                       className="w-full bg-white/5 text-white/60 p-5 rounded-2xl font-black tracking-widest text-xs uppercase hover:bg-white/10 transition-all border border-white/5"
                     >
                        Start Next Class Run
                     </button>
                  </div>
               </div>
            </div>
         ) : viewMode === "Swipe" ? (
            <AnimatePresence mode="wait">
               {currentIndex < students.length ? (
                  <SwipeCard 
                     key={currentStudent.id}
                     student={currentStudent}
                     onMark={handleMark}
                     openTab={openTab}
                  />
               ) : (
                  <CompletionCard stats={stats} onSubmit={handleFinalSubmit} onReset={resetAll} loading={isSubmitting} />
               )}
            </AnimatePresence>
         ) : (
            <div className="w-full h-full overflow-y-auto custom-scrollbar p-6">
               <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                  {students.map(s => (
                     <GridCell 
                        key={s.id} 
                        student={s} 
                        status={marked[s.id]} 
                        openTab={openTab}
                        onClick={(status) => setMarked(prev => ({ ...prev, [s.id]: status }))} 
                     />
                  ))}
               </div>
               <div className="pt-10">
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
function SwipeCard({ student, onMark, openTab }: { student: Student, onMark: (s: "Present" | "Absent" | "Late") => void, openTab: any }) {
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
          <h3 
            onClick={() => openTab({
               id: `student-profile-${student.id}`,
               title: `${student.firstName} [${student.studentCode}] Profile`,
               component: "Students",
               params: { studentId: student.id }
            })}
            className="text-3xl font-black tracking-tighter mb-2 underline decoration-blue-500/20 underline-offset-8 decoration-4 cursor-pointer hover:text-blue-500 transition-all"
          >
            {student.firstName} {student.lastName} <span className="text-blue-500/40">[{student.studentCode}]</span>
          </h3>
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
function GridCell({ student, status, onClick, openTab }: { student: Student, status?: string, onClick: (s: any) => void, openTab: any }) {
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
         <p 
            onClick={(e) => {
               e.stopPropagation();
               openTab({
                  id: `student-profile-${student.id}`,
                  title: `${student.firstName} [${student.studentCode}] Profile`,
                  component: "Students",
                  params: { studentId: student.id }
               });
            }}
            className="text-[8px] font-black text-center uppercase tracking-tighter leading-tight opacity-80 hover:underline hover:opacity-100 transition-all font-mono"
         >
            {student.firstName}
         </p>
         
         <div 
            onClick={(e) => { e.stopPropagation(); onClick("Late"); }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-white/10 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white"
         >
            <Timer className="w-2.5 h-2.5" />
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
