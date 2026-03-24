"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck,
  Zap,
  Clock,
  Layout
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDashboardStatsAction } from "@/lib/actions/dashboard-actions";

// Static stats removed in favor of dynamic fetching

export function OverviewContent() {
  const [data, setData] = React.useState({
    studentCount: "...",
    teacherCount: "...",
    financeBalance: "...",
    pendingIssues: "...",
    academicYear: ""
  });
  const [activities, setActivities] = React.useState<any[]>([]);

  React.useEffect(() => {
    getDashboardStatsAction().then(res => {
      if (res.success && res.data) {
        setData({
          studentCount: res.data.studentCount.toLocaleString(),
          teacherCount: res.data.teacherCount.toLocaleString(),
          financeBalance: res.data.financeBalance,
          pendingIssues: res.data.pendingIssues.toString(),
          academicYear: res.data.academicYear
        });
      }
    });

    import("@/lib/actions/dashboard-actions").then(mod => {
      mod.getRecentActivitiesAction().then(res => {
        if (res.success && res.data) {
          setActivities(res.data);
        }
      });
    });
  }, []);

  const stats = [
    { label: "Total Students", value: data.studentCount, icon: GraduationCap, color: "bg-blue-500" },
    { label: "Total Teachers", value: data.teacherCount, icon: Users, color: "bg-purple-500" },
    { label: "Finance Balance", value: data.financeBalance, icon: CreditCard, color: "bg-green-500" },
    { label: "Pending Enquiries", value: data.pendingIssues, icon: Zap, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight italic">System Overview</h2>
          <p className="text-foreground opacity-50 font-medium mt-1 text-xs lg:text-sm italic">Real-time snapshots for {data.academicYear || "Current Session"}</p>
        </motion.div>
        
        <div className="flex gap-2 w-full lg:w-auto">
             <button className="flex-1 lg:flex-none px-4 py-2 bg-background border border-border rounded-xl font-bold text-foreground opacity-60 hover:opacity-100 hover:bg-muted transition-all text-[10px] lg:text-xs premium-shadow">
                Reports
             </button>
             <button className="flex-1 lg:flex-none px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all text-[10px] lg:text-xs premium-shadow shadow-primary/20">
                Action Center
             </button>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-background p-5 lg:p-6 rounded-2xl border border-border premium-shadow hover:scale-[1.02] transition-all cursor-pointer overflow-hidden relative"
          >
            <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700", stat.color)} />
            
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted text-primary rounded-full text-[9px] font-bold">
                 Live
              </div>
            </div>
            <h3 className="text-foreground opacity-40 font-bold uppercase tracking-widest text-[9px] mb-0.5">{stat.label}</h3>
            <p className="text-2xl font-black text-foreground tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity Logs
               </h3>
               <button className="text-[10px] font-bold text-primary px-3 py-1.5 bg-primary/5 rounded-full hover:bg-primary/10 transition-colors uppercase tracking-widest">
                  View Live Stream
               </button>
            </div>
            
            <div className="space-y-3">
               {activities.length > 0 ? activities.map((act, i) => (
                 <motion.div 
                   key={act.id}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.1 + i * 0.05 }}
                   className="bg-background p-4 rounded-2xl border border-border hover:border-primary/20 transition-all flex items-center gap-4 group cursor-pointer"
                 >
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                       <Layout className="w-5 h-5 text-foreground opacity-40 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{act.title}</h4>
                       <p className="text-xs text-foreground opacity-40 font-medium truncate">{act.subtitle}</p>
                    </div>
                    <div className="text-right whitespace-nowrap hidden sm:block">
                       <p className="text-[10px] font-bold text-foreground opacity-50">{act.time}</p>
                       <p className="text-[9px] font-bold text-foreground opacity-30 uppercase tracking-widest">{act.user}</p>
                    </div>
                 </motion.div>
               )) : (
                 <div className="p-8 text-center bg-muted rounded-2xl border border-dashed border-border">
                    <p className="text-xs font-bold text-foreground opacity-40 uppercase tracking-widest">No recent audit logs found</p>
                 </div>
               )}
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-muted p-6 lg:p-8 rounded-[32px] text-foreground border border-border shadow-md relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                   <ShieldCheck className="w-24 h-24" />
               </div>
               <h3 className="text-xl font-bold mb-3 relative z-10">Database Status</h3>
               <p className="text-foreground opacity-60 mb-6 relative z-10 text-sm font-medium italic">
                 {data.studentCount !== "..." ? "Systems are performing within optimal operational parameters." : "Syncing with school infrastructure..."}
               </p>
               
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-foreground opacity-40">
                     <span>Registry Integrity</span>
                     <span className="text-accent text-xs">Healthy</span>
                  </div>
                  <div className="w-full bg-background/20 h-2 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: data.studentCount !== "..." ? "100%" : "20%" }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className="bg-primary h-full shadow-[0_0_20px_rgba(var(--primary),0.5)]" 
                     />
                  </div>
               </div>
               
               <button className="mt-8 w-full py-3 bg-background border border-border text-primary rounded-xl font-bold shadow-xl shadow-black/5 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs">
                  Connectivity Audit
               </button>
            </div>
        </div>
      </div>
    </div>
  );
}
