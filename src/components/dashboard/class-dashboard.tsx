"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  User, 
  GraduationCap, 
  TrendingUp, 
  IndianRupee, 
  ArrowLeft, 
  Loader2, 
  UserCheck, 
  Crown, 
  Mail, 
  Phone, 
  Search, 
  AlertTriangle, 
  ChevronRight,
  Wallet
} from "lucide-react";
import { useTabs } from "@/context/tab-context";
import { getClassDashboardDataAction } from "@/lib/actions/class-dashboard-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";

interface ClassDashboardContentProps {
  tabId: string;
  params?: { classId?: string };
}

export function ClassDashboardContent({ tabId, params }: ClassDashboardContentProps) {
  const { openTab } = useTabs();
  const classId = params?.classId || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!classId) {
        setError("Class ID is missing.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getClassDashboardDataAction(classId);
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load class dashboard data.");
        }
      } catch (err: any) {
        console.error("Failed to load class dashboard:", err);
        setError(err.message || "A network error occurred.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [classId]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 animate-pulse">
          Instantiating Class Profile...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 text-center max-w-xl mx-auto my-20 space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-rose-950">Failed to Retrieve Class Dashboard</h3>
        <p className="text-xs font-bold text-rose-700 leading-relaxed">{error || "An unknown error occurred."}</p>
        <button 
          onClick={() => openTab({ id: "overview", title: "Overview", icon: Users, component: "Dashboard" })}
          className="mt-4 px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-700 transition-all active:scale-95"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { classInfo, classTeacher, classLeader, headBoy, headGirl, stats, students } = data;

  const filteredStudents = students.filter((s: any) => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.rollNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      
      {/* Back & Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => openTab({ id: "overview", title: "Overview", icon: Users, component: "Dashboard" })}
            className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-700 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-primary" />
              {classInfo.name} Dashboard
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
              Class Overview &bull; Grade Level {classInfo.level}
            </p>
          </div>
        </div>

        <button 
          onClick={() => openTab({ 
            id: "fee-collection", 
            title: "Fee Collection", 
            icon: Wallet, 
            component: "Finance", 
            params: { classId: classInfo.id } 
          })}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-emerald-600/10 flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" /> Collect Class Fees
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Expected */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
        >
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Expected Tuition</h3>
          <p className="text-3xl font-black text-slate-900 tracking-tighter italic">
            ₹{stats.totalExpected.toLocaleString()}
          </p>
          <div className="text-[10px] font-bold text-slate-400 mt-2">
            For {stats.studentCount} enrolled students
          </div>
        </motion.div>

        {/* Collected */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40"
        >
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Collected Amount</h3>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter italic">
            ₹{stats.totalPaid.toLocaleString()}
          </p>
          <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2">
            {stats.collectionRate}% Collection Rate
          </div>
        </motion.div>

        {/* Pending */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-xl shadow-slate-200/40"
        >
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Outstanding Dues</h3>
          <p className="text-3xl font-black text-rose-500 tracking-tighter italic">
            ₹{stats.totalDues.toLocaleString()}
          </p>
          <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-2">
            ₹{(stats.totalExpected - stats.totalPaid).toLocaleString()} pending
          </div>
        </motion.div>

        {/* Total Students */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden"
        >
          <div className="absolute right-0 bottom-0 p-4 opacity-5 text-primary">
            <Users className="w-24 h-24" />
          </div>
          <h3 className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Class Strength</h3>
          <p className="text-4xl font-black text-primary tracking-tighter italic">
            {stats.studentCount}
          </p>
          <div className="text-[10px] font-bold text-slate-400 mt-2">
            Active admissions &bull; Reddy Colony Campus
          </div>
        </motion.div>
      </div>

      {/* Leadership & Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Leadership Vitals (8 Columns) */}
        <div className="lg:col-span-8 bg-white border border-slate-100 shadow-xl shadow-slate-200/30 rounded-[3rem] p-6 lg:p-8 space-y-6">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Class Leadership & Staff</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Appointed administrative oversight and student representitives</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Class Teacher */}
            <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:scale-[1.03] transition-all duration-300">
              <div className="space-y-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Teacher</h4>
                  <p className="text-xs font-black text-slate-900 mt-1 truncate">{classTeacher?.name || "Unassigned"}</p>
                </div>
              </div>
              {classTeacher && (
                <div className="text-[9px] font-bold text-slate-400 mt-4 space-y-1">
                  <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {classTeacher.email}</p>
                  <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {classTeacher.phone}</p>
                </div>
              )}
            </div>

            {/* Class Leader */}
            <div 
              onClick={() => classLeader && openTab({
                id: `student-profile-${classLeader.id}`,
                title: classLeader.name,
                icon: User,
                component: "Students",
                params: { studentId: classLeader.id }
              })}
              className={cn("bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:scale-[1.03] transition-all duration-300", classLeader && "cursor-pointer group")}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-amber-100 transition-colors">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Class Leader</h4>
                  <p className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors mt-1 truncate">{classLeader?.name || "None"}</p>
                </div>
              </div>
              {classLeader && (
                <div className="text-[9px] font-black text-primary uppercase tracking-wider mt-4 flex items-center gap-1">
                  View Profile <ChevronRight className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Head Boy */}
            <div 
              onClick={() => headBoy && openTab({
                id: `student-profile-${headBoy.id}`,
                title: headBoy.name,
                icon: User,
                component: "Students",
                params: { studentId: headBoy.id }
              })}
              className={cn("bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:scale-[1.03] transition-all duration-300", headBoy && "cursor-pointer group")}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-indigo-100 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Head Boy</h4>
                  <p className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors mt-1 truncate">{headBoy?.name || "None"}</p>
                </div>
              </div>
              {headBoy && (
                <div className="text-[9px] font-bold text-slate-400 mt-4">
                  {headBoy.className}
                </div>
              )}
            </div>

            {/* Head Girl */}
            <div 
              onClick={() => headGirl && openTab({
                id: `student-profile-${headGirl.id}`,
                title: headGirl.name,
                icon: User,
                component: "Students",
                params: { studentId: headGirl.id }
              })}
              className={cn("bg-slate-50/50 p-5 rounded-3xl border border-slate-100 flex flex-col justify-between hover:scale-[1.03] transition-all duration-300", headGirl && "cursor-pointer group")}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-rose-100 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Head Girl</h4>
                  <p className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors mt-1 truncate">{headGirl?.name || "None"}</p>
                </div>
              </div>
              {headGirl && (
                <div className="text-[9px] font-bold text-slate-400 mt-4">
                  {headGirl.className}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collection Target Gauge (4 Columns) */}
        <div className="lg:col-span-4 bg-slate-900 text-white rounded-[3rem] p-8 relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="space-y-4">
            <h3 className="text-xl font-black italic">Collection Rate</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Target Completion Status
            </p>
          </div>

          <div className="my-8 text-center">
            <span className="text-6xl font-black italic text-primary">{stats.collectionRate}%</span>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-2">Class Collection Efficiency</p>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.collectionRate}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="bg-primary h-full rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
              />
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
              <span>₹{stats.totalPaid.toLocaleString()} paid</span>
              <span>₹{stats.totalDues.toLocaleString()} dues</span>
            </div>
          </div>
        </div>
      </div>

      {/* Class Students Directory */}
      <div className="bg-white border border-slate-100 shadow-xl shadow-slate-200/30 rounded-[3rem] p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">Class Students Directory</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total {filteredStudents.length} students matching criteria</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-100 bg-slate-50 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-200 focus:bg-white transition-all text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 pb-3">
                <th className="pb-3 pl-2">Roll No</th>
                <th className="pb-3">Student Name</th>
                <th className="pb-3">Phone</th>
                <th className="pb-3 text-right">Expected</th>
                <th className="pb-3 text-right">Collected</th>
                <th className="pb-3 text-right">Outstanding Dues</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 pl-2 font-black text-slate-500">{s.rollNumber}</td>
                  <td 
                    onClick={() => openTab({
                      id: `student-profile-${s.id}`,
                      title: `${s.firstName} ${s.lastName}`,
                      icon: User,
                      component: "Students",
                      params: { studentId: s.id }
                    })}
                    className="py-4 font-black text-slate-900 hover:text-primary transition-colors cursor-pointer"
                  >
                    {s.firstName} {s.lastName}
                  </td>
                  <td className="py-4 text-slate-400">{s.phone}</td>
                  <td className="py-4 text-right">₹{s.expected.toLocaleString()}</td>
                  <td className="py-4 text-right text-emerald-600">₹{s.paid.toLocaleString()}</td>
                  <td className={cn("py-4 text-right font-black", s.dues > 0 ? "text-rose-500" : "text-emerald-500")}>
                    {s.dues > 0 ? `₹${s.dues.toLocaleString()}` : "Cleared"}
                  </td>
                  <td className="py-4 text-center">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                      s.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <button 
                      onClick={() => openTab({ 
                        id: "fee-collection", 
                        title: "Fee Collection", 
                        icon: Wallet, 
                        component: "Finance", 
                        params: { studentId: s.id } 
                      })}
                      className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors"
                    >
                      Collect
                    </button>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic text-xs font-medium">No students found matching filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
