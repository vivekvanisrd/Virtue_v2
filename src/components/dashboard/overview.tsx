"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  GraduationCap, 
  CreditCard, 
  TrendingUp, 
  ShieldCheck,
  Zap,
  Clock,
  Layout,
  ArrowRight,
  TrendingDown,
  Percent,
  Wallet,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  ChevronRight,
  IndianRupee,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "@/context/tab-context";
import { getDashboardStatsAction } from "@/lib/actions/dashboard-actions";
import { useTenant } from "@/context/tenant-context";
import { formatCurrency } from "@/lib/utils/fee-utils";

const getTasksForRole = (role: string) => {
  switch (role?.toUpperCase()) {
    case "DEVELOPER":
      return [
        { id: "dev-1", text: "Audit system-wide school tenancy isolation", done: false },
        { id: "dev-2", text: "Review new school & branch provisioning logs", done: false },
        { id: "dev-3", text: "Verify API integration health status", done: false },
      ];
    case "OWNER":
      return [
        { id: "owner-1", text: "Verify today's collection vs outstanding dues", done: false },
        { id: "owner-2", text: "Deactivate departed partners/staff members if any", done: false },
        { id: "owner-3", text: "Audit security RBAC roles and permissions", done: false },
        { id: "owner-4", text: "Review campus-wide operational metrics", done: false },
      ];
    case "PRINCIPAL":
      return [
        { id: "prin-1", text: "Monitor student & staff daily attendance", done: false },
        { id: "prin-2", text: "Approve pending leaves and transport requests", done: false },
        { id: "prin-3", text: "Review fee collections and class updates", done: false },
        { id: "prin-4", text: "Coordinate teacher lesson planning", done: false },
      ];
    default:
      return [
        { id: "staff-1", text: "Take student daily attendance", done: false },
        { id: "staff-2", text: "Verify class lesson plans and timetables", done: false },
        { id: "staff-3", text: "Complete professional profile onboarding", done: false },
      ];
  }
};

export function OverviewContent() {
  const { openTab } = useTabs();
  const { schoolName, isOperationalReady, userName, userRole } = useTenant();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (userName && userRole) {
      const dismissed = localStorage.getItem(`pava_dismiss_welcome_${userName}_${userRole}`);
      if (!dismissed) {
        setTasks(getTasksForRole(userRole));
        setShowWelcome(true);
      }
    }
  }, [userName, userRole]);

  const handleCloseWelcome = () => {
    if (dontShowAgain) {
      localStorage.setItem(`pava_dismiss_welcome_${userName}_${userRole}`, "true");
    }
    setShowWelcome(false);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
  };

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await getDashboardStatsAction();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 🛡️ OPERATIONAL GUARD: Show personalized setup guide if no campus branch exists
  if (!isOperationalReady) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 animate-in fade-in zoom-in duration-700 p-8">
           <div className="text-center space-y-4 max-w-2xl">
              <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mx-auto mb-8 rotate-3 shadow-2xl shadow-primary/10 border border-primary/20">
                 <ShieldCheck className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">
                {schoolName} <span className="text-primary">— Genesis Phase</span>
              </h1>
              <p className="text-lg font-medium text-slate-500 leading-relaxed italic">
                 Your institution is live in the registry, but its operational pulse is dormant. To begin admissions and fee collection, you must first instantiate a campus branch.
              </p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {[
                { title: "Create Branch", desc: "Define your primary campus or branch headquarters.", icon: Layout, action: "settings" },
                { title: "Appoint Principal", desc: "Assign administrative oversight for the new branch.", icon: Users, action: "staff" },
                { title: "Configure Fees", desc: "Set up the financial framework for the academic year.", icon: CreditCard, action: "finance" },
              ].map((step, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:scale-105 transition-all group cursor-pointer" onClick={() => openTab({ id: step.action, title: step.title, icon: step.icon as any, component: "Generic" })}>
                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <step.icon className="w-5 h-5" />
                   </div>
                   <h3 className="font-black text-slate-800 mb-1">{step.title}</h3>
                   <p className="text-xs text-slate-400 font-bold leading-relaxed">{step.desc}</p>
                </div>
              ))}
           </div>

           <button 
             onClick={() => openTab({ id: "settings", title: "Institutional Setup", icon: Layout, component: "Settings" })}
             className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-400 hover:scale-110 active:scale-95 transition-all text-sm uppercase tracking-[3px] italic flex items-center gap-3"
           >
              Establish Operational Pulse <TrendingUp className="w-4 h-4" />
           </button>
       </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-4">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-slate-200 rounded-xl" />
          <div className="h-10 w-64 bg-slate-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded-[2rem]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-[400px] bg-slate-200 rounded-[2.5rem]" />
          <div className="h-[400px] bg-slate-200 rounded-[2.5rem]" />
        </div>
      </div>
    );
  }

  const outstandingDues = stats?.outstandingDues || 0;
  const expectedRevenue = stats?.expectedRevenue || 0;
  const collectedRevenue = stats?.collectedRevenue || 0;
  const collectionRate = stats?.collectionRate || 0;
  
  // Calculate channel split percentages
  const totalModePaid = (stats?.cashCollected || 0) + (stats?.onlineCollected || 0) || 1;
  const cashPct = Math.round(((stats?.cashCollected || 0) / totalModePaid) * 100);
  const onlinePct = Math.round(((stats?.onlineCollected || 0) / totalModePaid) * 100);

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      
      {/* 1. Header Banner Alert for Void Requests */}
      {stats?.voidRequests > 0 && (
         <motion.div 
           initial={{ height: 0, opacity: 0 }} 
           animate={{ height: "auto", opacity: 1 }}
           className="bg-rose-50 border-2 border-rose-100 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
         >
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
               </div>
               <div>
                  <p className="text-sm font-black text-rose-900 uppercase tracking-wide">Manager Action Required: {stats.voidRequests} Reversal Requests</p>
                  <p className="text-xs font-bold text-rose-700 opacity-70">Unsettled transaction voids require forensic verification & ledger approval.</p>
               </div>
            </div>
            <button 
              onClick={() => openTab({ id: "finance", title: "Finance Hub", icon: CreditCard, component: "Finance" })}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase hover:bg-rose-700 transition-all active:scale-95 shadow-md shadow-rose-500/10"
            >
               Authorize Audit Tray
            </button>
         </motion.div>
      )}

      {/* 2. Professional Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight italic">
              Executive Dashboard
            </h2>
            <button 
              onClick={() => fetchStats(true)} 
              disabled={refreshing}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors border border-slate-100 bg-white"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] lg:text-[10px] mt-2">
            Real-time Financial Snapshot &bull; Session {stats?.academicYear || "2026-27"}
          </p>
        </div>
        
        <div className="flex gap-3 w-full lg:w-auto">
             <button 
               onClick={() => openTab({ id: "finance", title: "Finance Hub", icon: CreditCard, component: "Finance" })}
               className="flex-1 lg:flex-none px-6 py-3.5 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
             >
                Daily Ledger
             </button>
             <button 
               onClick={() => openTab({ id: "fee-collection", title: "Fee Collection", icon: Wallet, component: "Finance" })}
               className="flex-1 lg:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2"
             >
                <Wallet className="w-4 h-4" /> Start Fee Collection
             </button>
        </div>
      </div>

      {/* 3. Metrics Cards (Principal & Owner Specifics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Collected Today */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 p-4 opacity-5 text-emerald-500">
             <IndianRupee className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
               <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Today</span>
          </div>
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Collected Today</h3>
          <p className="text-3xl font-black text-slate-900 tracking-tighter italic">
            ₹{stats?.collectedToday?.toLocaleString() || 0}
          </p>
        </motion.div>

        {/* Card 2: Total Expected */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 p-4 opacity-5 text-indigo-500">
             <GraduationCap className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
               <Users className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{stats?.studentCount} Students</span>
          </div>
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Expected Revenue</h3>
          <p className="text-3xl font-black text-slate-900 tracking-tighter italic">
            ₹{expectedRevenue?.toLocaleString() || 0}
          </p>
        </motion.div>

        {/* Card 3: Lifetime Collected */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 p-4 opacity-5 text-sky-500">
             <Activity className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner">
               <CreditCard className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{collectionRate}% Rate</span>
          </div>
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Lifetime Collected</h3>
          <p className="text-3xl font-black text-slate-900 tracking-tighter italic">
            ₹{collectedRevenue?.toLocaleString() || 0}
          </p>
        </motion.div>

        {/* Card 4: Outstanding Dues */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-xl shadow-slate-200/40 relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 p-4 opacity-5 text-rose-500">
             <ShieldAlert className="w-24 h-24" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
               <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">Defaulters Active</span>
          </div>
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Outstanding Dues</h3>
          <p className="text-3xl font-black text-rose-600 tracking-tighter italic">
            ₹{outstandingDues?.toLocaleString() || 0}
          </p>
        </motion.div>

      </div>

      {/* 4. Lifetime Progress & Payment Splits */}
      <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Progress Section */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <h3 className="text-2xl font-black tracking-tight">Academic Year Collections Progress</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Tuition Progress Dashboard &bull; Core Target</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-end text-xs font-black uppercase tracking-widest text-slate-400">
                 <span>Collection Efficiency Rate</span>
                 <span className="text-primary text-xl font-black italic">{collectionRate}%</span>
              </div>
              <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-700">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${collectionRate}%` }}
                   transition={{ duration: 1.5, ease: "easeOut" }}
                   className="bg-primary h-full rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)]" 
                 />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                 <span>₹{collectedRevenue?.toLocaleString()} Collected</span>
                 <span>₹{outstandingDues?.toLocaleString()} Dues Left</span>
              </div>
            </div>
          </div>

          {/* Mode Splits Section */}
          <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-800 pt-6 lg:pt-0 lg:pl-8 space-y-4">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Lifetime Collection Channels</h4>
             
             <div className="grid grid-cols-2 gap-4">
                
                {/* Cash Segment */}
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shadow-inner">
                      <Banknote className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cash ({cashPct || 0}%)</p>
                      <p className="text-sm font-black text-white">₹{stats?.cashCollected?.toLocaleString() || 0}</p>
                   </div>
                </div>

                {/* Online Segment */}
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                   <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center shadow-inner">
                      <Zap className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Razorpay ({onlinePct || 0}%)</p>
                      <p className="text-sm font-black text-white">₹{stats?.onlineCollected?.toLocaleString() || 0}</p>
                   </div>
                </div>

             </div>

             <div className="text-[9px] font-bold text-slate-500 leading-normal italic">
                Offline cash deposits are logged immediately. Razorpay settlements process automatically every morning.
             </div>
          </div>

        </div>
      </div>

      {/* 5. Core Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Class-wise Dues and Collection (7 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 shadow-xl shadow-slate-200/30 rounded-[3rem] p-6 lg:p-8 space-y-6">
          <div className="flex justify-between items-center">
             <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">Class-wise Revenue Breakdown</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Click class to collect payments &bull; Dues priority</p>
             </div>
             <button 
               onClick={() => openTab({ id: "fee-manager", title: "Fee Management", icon: Layout, component: "Finance" })}
               className="text-[9px] font-black text-indigo-600 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 transition-colors uppercase tracking-widest rounded-full"
             >
                Fee Settings
             </button>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 pb-3">
                      <th className="pb-3">Class Level</th>
                      <th className="pb-3 text-right">Expected</th>
                      <th className="pb-3 text-right">Collected</th>
                      <th className="pb-3 text-right">Pending Dues</th>
                      <th className="pb-3 text-center">Action</th>
                   </tr>
                </thead>
                <tbody>
                   {stats?.classStats?.map((cls: any, i: number) => {
                      const classRate = cls.expected > 0 ? Math.round((cls.collected / cls.expected) * 100) : 0;
                      return (
                         <tr key={i} className="border-b border-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-50/50 transition-colors group">
                            <td 
                              onClick={() => openTab({
                                 id: `class-profile-${cls.classId}`,
                                 title: `${cls.className}`,
                                 icon: GraduationCap,
                                 component: "ClassProfile",
                                 params: { classId: cls.classId }
                              })}
                              className="py-4 font-black text-slate-900 hover:text-primary transition-colors cursor-pointer"
                            >
                               {cls.className}
                            </td>
                            <td className="py-4 text-right">₹{cls.expected.toLocaleString()}</td>
                            <td className="py-4 text-right">
                              <span className="text-emerald-600">₹{cls.collected.toLocaleString()}</span>
                              <span className="text-[9px] text-slate-400 block font-normal">{classRate}% rate</span>
                            </td>
                            <td className={cn("py-4 text-right font-black", cls.dues > 0 ? "text-rose-500" : "text-emerald-500")}>
                               {cls.dues > 0 ? `₹${cls.dues.toLocaleString()}` : "Cleared"}
                            </td>
                            <td className="py-4 text-center">
                               <button 
                                 onClick={() => openTab({ 
                                    id: "fee-collection", 
                                    title: "Fee Collection", 
                                    icon: Wallet, 
                                    component: "Finance", 
                                    params: { classId: cls.classId } 
                                 })}
                                 className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
                               >
                                  Collect
                               </button>
                            </td>
                         </tr>
                      );
                   })}
                   {(!stats?.classStats || stats.classStats.length === 0) && (
                      <tr>
                         <td colSpan={5} className="py-8 text-center text-slate-400 italic text-xs font-medium">No class structure data available.</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed & DB status (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* Recent Collections Feed */}
           <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/30 rounded-[3rem] p-6 lg:p-8 space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-500" />
                    Ledger Stream
                 </h3>
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full">Real-time</span>
              </div>

              <div className="space-y-4">
                 {stats?.recentCollections?.map((col: any) => (
                    <div 
                      key={col.id}
                      onClick={() => col.studentId && openTab({
                         id: `student-profile-${col.studentId}`,
                         title: col.studentName,
                         icon: Users,
                         component: "Students",
                         params: { studentId: col.studentId }
                      })}
                      className="p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 hover:border-slate-200 transition-all border border-transparent cursor-pointer group flex items-start gap-3 justify-between"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", col.paymentMode === "Cash" ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-500")}>
                            {col.paymentMode === "Cash" ? <Banknote className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                         </div>
                         <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors truncate">{col.studentName}</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest truncate">{col.receiptNumber}</p>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-sm font-black text-slate-800">₹{col.amountPaid.toLocaleString()}</p>
                         <p className="text-[8px] font-bold text-slate-400 mt-0.5">{col.time}</p>
                      </div>
                    </div>
                 ))}
                 {(!stats?.recentCollections || stats.recentCollections.length === 0) && (
                    <div className="py-10 text-center border border-dashed border-slate-100 rounded-2xl text-slate-400 italic text-xs font-medium">
                       No recent fee collections recorded.
                    </div>
                 )}
              </div>
           </div>

           {/* System Integrity & Branch overview */}
           <div className="bg-slate-900 text-white rounded-[3rem] p-6 lg:p-8 relative overflow-hidden group shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-500">
                  <ShieldCheck className="w-24 h-24" />
              </div>
              <h3 className="text-xl font-black mb-2 relative z-10 italic">Core Registry Audit</h3>
              <p className="text-slate-400 mb-6 relative z-10 text-xs font-bold uppercase tracking-widest leading-relaxed">
                 Active Campus: Reddy Colony Branch
              </p>
              
              <div className="space-y-4 relative z-10">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Registry Integrity</span>
                    <span className="text-emerald-400 text-xs font-black">Healthy</span>
                 </div>
                 <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    />
                 </div>
              </div>
              
              <button 
                onClick={() => openTab({ id: "settings-audit", title: "Activity Audit", icon: ShieldCheck, component: "Settings" })}
                className="mt-8 w-full py-3.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-2xl font-black shadow-xl shadow-black/10 hover:bg-slate-800/80 active:scale-[0.98] transition-all text-xs uppercase tracking-widest"
              >
                 System Audit logs
              </button>
            </div>

         </div>

      </div>

      {/* 6. Welcome & Daily Tasks Modal Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-8 max-w-lg w-full mx-4 relative overflow-hidden"
          >
            {/* Background design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            {/* Header info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                <Zap className="fill-indigo-600 w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    {userRole || "User"}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Welcome back, {userName || "Administrator"}!
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6">
              Establish your target checklist for today to ensure operational excellence across {schoolName || "your institution"}.
            </p>

            {/* Checklist Section */}
            <div className="space-y-3 mb-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Today's Focus Tasks</h4>
              <div className="space-y-2">
                {tasks.map(task => (
                  <label 
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl cursor-pointer transition-all active:scale-[0.99]",
                      task.done && "opacity-50"
                    )}
                  >
                    <input 
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleTask(task.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className={cn(
                      "text-xs font-bold text-slate-700 select-none",
                      task.done && "line-through text-slate-400 font-medium"
                    )}>
                      {task.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Row */}
            <div className="flex flex-col gap-4 border-t border-slate-100 pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer self-start">
                <input 
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Don't show this screen again on next login
                </span>
              </label>
              
              <button 
                onClick={handleCloseWelcome}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                Let's Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </motion.div>
        </div>
      )}

    </div>
  );
}
