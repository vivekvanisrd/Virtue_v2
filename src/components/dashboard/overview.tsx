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

const activities = [
  { id: 1, type: "admission", title: "New Student Admitted", subtitle: "Rahul Kumar - Class XB", time: "2 mins ago", user: "Admin" },
  { id: 2, type: "payment", title: "Fee Payment Received", subtitle: "Reciept #VR-9082 - ₹4,500", time: "15 mins ago", user: "Cashier" },
  { id: 3, type: "staff", title: "Salary Processed", subtitle: "February 2026 Batch", time: "1 hour ago", user: "Pandu Sir" },
  { id: 4, type: "security", title: "Biometric Sync Complete", subtitle: "Gate #4 Attendance Data", time: "3 hours ago", user: "System" },
];

export function OverviewContent() {
  const [data, setData] = React.useState({
    studentCount: "...",
    teacherCount: "...",
    financeBalance: "...",
    pendingIssues: "..."
  });

  React.useEffect(() => {
    getDashboardStatsAction().then(res => {
      if (res.success && res.data) {
        setData({
          studentCount: res.data.studentCount.toLocaleString(),
          teacherCount: res.data.teacherCount.toLocaleString(),
          financeBalance: res.data.financeBalance,
          pendingIssues: res.data.pendingIssues.toString()
        });
      }
    });
  }, []);

  const stats = [
    { label: "Total Students", value: data.studentCount, icon: GraduationCap, trend: "+12.5%", color: "bg-blue-500" },
    { label: "Total Teachers", value: data.teacherCount, icon: Users, trend: "+2.1%", color: "bg-purple-500" },
    { label: "Finance Balance", value: data.financeBalance, icon: CreditCard, trend: "+5.4%", color: "bg-green-500" },
    { label: "Pending Issues", value: data.pendingIssues, icon: Zap, trend: "-2", color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">System Overview</h2>
          <p className="text-slate-500 font-medium mt-1 text-xs lg:text-sm">Real-time snapshots of school operations</p>
        </motion.div>
        
        <div className="flex gap-2 w-full lg:w-auto">
             <button className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-[10px] lg:text-xs premium-shadow">
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
            className="group bg-white p-5 lg:p-6 rounded-2xl border border-slate-100 premium-shadow hover:scale-[1.02] transition-all cursor-pointer overflow-hidden relative"
          >
            <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700", stat.color)} />
            
            <div className="flex justify-between items-start mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                 <stat.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[9px] font-bold">
                 <TrendingUp className="w-2.5 h-2.5" />
                 {stat.trend}
              </div>
            </div>
            <h3 className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mb-0.5">{stat.label}</h3>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Recent Activity Logs
               </h3>
               <button className="text-[10px] font-bold text-primary px-3 py-1.5 bg-primary/5 rounded-full hover:bg-primary/10 transition-colors uppercase tracking-widest">
                  View Live Stream
               </button>
            </div>
            
            <div className="space-y-3">
               {activities.map((act, i) => (
                 <motion.div 
                   key={act.id}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.4 + i * 0.05 }}
                   className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-primary/20 transition-all flex items-center gap-4 group cursor-pointer"
                 >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                       <Layout className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors truncate">{act.title}</h4>
                       <p className="text-xs text-slate-400 font-medium truncate">{act.subtitle}</p>
                    </div>
                    <div className="text-right whitespace-nowrap hidden sm:block">
                       <p className="text-[10px] font-bold text-slate-500">{act.time}</p>
                       <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{act.user}</p>
                    </div>
                 </motion.div>
               ))}
            </div>
        </div>

        <div className="space-y-6">
            <div className="bg-gradient-bg p-6 lg:p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                   <ShieldCheck className="w-24 h-24" />
               </div>
               <h3 className="text-xl font-bold mb-3 relative z-10">System Status</h3>
               <p className="text-white/60 mb-6 relative z-10 text-sm font-medium italic">
                 All school modules are performing within optimal parameters.
               </p>
               
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                     <span>Performance</span>
                     <span className="text-accent text-xs">Excellent</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: "94%" }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className="bg-accent h-full shadow-[0_0_20px_rgba(124,77,255,0.8)]" 
                     />
                  </div>
               </div>
               
               <button className="mt-8 w-full py-3 bg-white text-primary rounded-xl font-bold shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs">
                  System Audit
               </button>
            </div>
        </div>
      </div>
    </div>
  );
}
