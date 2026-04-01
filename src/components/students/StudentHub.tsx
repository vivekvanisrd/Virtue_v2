"use client";

import React from "react";
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  GraduationCap, 
  User, 
  ArrowUpRight,
  Calendar,
  Search,
  Plus,
  Zap,
  MoreHorizontal,
  UploadCloud,
  Terminal
} from "lucide-react";
import { useTenant } from "@/context/tenant-context";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTabs } from "@/context/tab-context";
import { getStudentHubStats } from "@/lib/actions/student-actions";

export function StudentHub() {
  const { openTab } = useTabs();
  const context = useTenant();
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      const result = await getStudentHubStats();
      if (result.success) {
        setStats(result.data);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-40">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
           <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 animate-pulse">Aggregating School Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      {/* ─── Header & Search ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl font-black text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">Student Hub</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
               <Terminal className="w-3 h-3 text-slate-400" />
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Node: {context?.schoolId || "..."}:{context?.branchId || "..."}</span>
            </div>
          </div>
          <p className="text-foreground opacity-40 font-bold uppercase tracking-[0.2em] text-[10px] mt-4">Growth & Enrollment Intelligence</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
             onClick={() => openTab({ id: "students-add", title: "Add Student", icon: Plus, component: "Students" })}
             className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-200"
          >
            <Plus className="w-4 h-4" /> New Admission
          </button>
          <button 
             onClick={() => openTab({ id: "students-all", title: "Directory", icon: Users, component: "Students" })}
             className="px-6 py-3 bg-white border border-border text-foreground rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-muted transition-all"
          >
            Open Directory
          </button>
        </div>
      </div>

      {/* ─── Statistics Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Enrolled Students", value: stats?.totalStudents?.toLocaleString() || "0", icon: Users, color: "text-blue-500", bg: "bg-blue-50", trend: "Live Count" },
          { label: "New Admissions", value: stats?.newAdmissions || "0", icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-50", trend: "Current Month" },
          { label: "Attendance Today", value: stats?.attendanceToday || "0%", icon: Calendar, color: "text-violet-500", bg: "bg-violet-50", trend: "Present Now" },
          { label: "Growth Rating", value: "A+", icon: GraduationCap, color: "text-amber-500", bg: "bg-amber-50", trend: "Performance" }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn("p-6 rounded-[2.5rem] border border-border/50 relative overflow-hidden group", stat.bg)}
          >
            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-white/40 blur-2xl rounded-full" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl bg-white shadow-sm border border-border/10", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{stat.trend}</span>
              </div>
              <div>
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-foreground tracking-tighter">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Distribution & Trends ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-fit">
        {/* Gender Distribution Card */}
        <div className="bg-white rounded-[3rem] border border-border p-8 shadow-xl shadow-slate-100/50 flex flex-col justify-between">
           <div>
              <h3 className="text-lg font-black tracking-tight mb-8">Gender Distribution</h3>
              <div className="space-y-6">
                 {stats?.genderDistribution?.map((gender: any, i: number) => (
                   <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                       <span className={cn("text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2")}>
                          <div className={cn("w-2 h-2 rounded-full", gender.label === "Male" ? "bg-blue-500" : "bg-rose-500")} /> {gender.label}s
                       </span>
                       <span className="text-sm font-black">{gender.percentage}% ({gender.count})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className={cn("h-full transition-all duration-1000", gender.label === "Male" ? "bg-blue-500" : "bg-rose-500")} style={{ width: `${gender.percentage}%` }} />
                    </div>
                 </div>
                 ))}
                 {(!stats?.genderDistribution || stats.genderDistribution.length === 0) && (
                   <p className="text-xs font-medium opacity-30 italic">No demographic data available.</p>
                 )}
              </div>
           </div>
           
           <div className="mt-10 pt-6 border-t border-dashed border-border">
              <p className="text-[10px] font-bold opacity-40 uppercase leading-relaxed italic">
                 Total diversity score improved by 2.4% since last academic year enrollment cycle.
              </p>
           </div>
        </div>

        {/* Growth Trends (Simulated Chart) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden flex flex-col shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
           
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <h3 className="text-lg font-black tracking-tight">Enrollment Trends</h3>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">FY 2025-26 Intake</p>
                 </div>
                 <button className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                    <MoreHorizontal className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 flex items-end gap-3 min-h-[180px]">
                 {[40, 65, 45, 90, 70, 85, 100, 60, 75, 95, 80, 55].map((h, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                      <div 
                        className="w-full bg-primary/20 group-hover:bg-primary transition-all rounded-t-lg relative"
                        style={{ height: `${h}%` }}
                      >
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                           {h+120}
                         </div>
                      </div>
                      <span className="text-[8px] font-bold opacity-20 uppercase tracking-tighter">M{i+1}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* ─── Elite Professional Modules ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div 
            onClick={() => openTab({ id: "students-attendance", title: "Velocity Attendance", icon: Zap, component: "Students" })}
            className="p-8 bg-emerald-600 rounded-[2.5rem] text-white flex flex-col justify-between group cursor-pointer hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
         >
            <Zap className="w-8 h-8 opacity-40 group-hover:rotate-12 transition-transform" />
            <div className="mt-8">
               <h4 className="text-xl font-black italic">Velocity Attendance</h4>
               <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest mt-2">Mobile-First Swipe Engine</p>
            </div>
         </div>
         <div 
            onClick={() => openTab({ id: "students-exams", title: "Examination Hub", icon: GraduationCap, component: "Students" })}
            className="p-8 bg-amber-500 rounded-[2.5rem] text-white flex flex-col justify-between group cursor-pointer hover:bg-amber-600 transition-all shadow-xl shadow-amber-100"
         >
            <GraduationCap className="w-8 h-8 opacity-40 group-hover:-rotate-12 transition-transform" />
            <div className="mt-8">
               <h4 className="text-xl font-black italic">Examination Matrix</h4>
               <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest mt-2">Bulk Marks & Report Cards</p>
            </div>
         </div>
         <div 
            onClick={() => openTab({ id: "students-promotion", title: "Promotion Hub", icon: TrendingUp, component: "Students" })}
            className="p-8 bg-violet-600 rounded-[2.5rem] text-white flex flex-col justify-between group cursor-pointer hover:bg-violet-700 transition-all shadow-xl shadow-violet-200"
         >
            <TrendingUp className="w-8 h-8 opacity-40 group-hover:scale-110 transition-transform" />
            <div className="mt-8">
               <h4 className="text-xl font-black italic">Batch Promotion</h4>
               <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest mt-2">Sequential Grade Progress</p>
            </div>
         </div>
         <div 
            onClick={() => openTab({ id: "students-import", title: "Migration Hub", icon: UploadCloud, component: "Students" })}
            className="p-8 bg-slate-900 border border-slate-700 rounded-[2.5rem] text-white flex flex-col justify-between group cursor-pointer hover:bg-black transition-all shadow-xl shadow-slate-300"
         >
            <UploadCloud className="w-8 h-8 opacity-40 group-hover:scale-110 transition-transform" />
            <div className="mt-8">
               <h4 className="text-xl font-black italic">Professional Migration</h4>
               <p className="text-[10px] font-medium opacity-60 uppercase tracking-widest mt-2">Bulk Legacy Ingestion</p>
            </div>
         </div>
      </div>

      {/* ─── Registry & Audit Cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div 
            onClick={() => openTab({ id: "students-enquiries", title: "Enquiries", icon: Users, component: "Students" })}
            className="p-8 bg-white border border-border rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
         >
            <div className="space-y-2">
               <h4 className="text-xl font-black text-slate-900 italic">Admission Registry</h4>
               <p className="text-xs font-medium text-slate-400">Audit and finalize pending admission entries.</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12">
               <ArrowUpRight className="w-6 h-6" />
            </div>
         </div>
         <div 
            onClick={() => openTab({ id: "students-all", title: "Directory", icon: Users, component: "Students" })}
            className="p-8 bg-white border border-border rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
         >
            <div className="space-y-2">
               <h4 className="text-xl font-black text-slate-900 italic">Student Directory</h4>
               <p className="text-xs font-medium text-slate-400">Full lifecycle management & profile audit.</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12">
               <ArrowUpRight className="w-6 h-6" />
            </div>
         </div>
      </div>
    </div>
  );
}
