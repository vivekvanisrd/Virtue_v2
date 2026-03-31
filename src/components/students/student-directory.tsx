"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  User, 
  ChevronRight, 
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Trash2,
  Edit,
  ExternalLink,
  Wallet,
  Layout as LayoutIcon,
  History as HistoryIcon,
  LayoutGrid,
  List,
  Table as TableIcon
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";
import { StudentProfile } from "./student-profile";
import { useTabs } from "@/context/tab-context";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils/fee-utils";

export function StudentDirectory() {
  const { openTab } = useTabs();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    classId: "",
    sectionId: "",
    branchId: ""
  });
  const [viewMode, setViewMode] = useState<"grid" | "list" | "detailed">("grid");

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchStudents = async () => {
    setLoading(true);
    const result = await getStudentListAction({ search: searchTerm, ...filters });
    if (result.success && result.data) {
      setStudents(result.data);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents();
  };

  if (selectedStudentId) {
    return (
      <StudentProfile 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
      />
    );
  }

  const handleOpenProfile = (student: any) => {
     openTab({
        id: `student-profile-${student.id}`,
        title: `${student.firstName} ${student.lastName[0]}.`,
        icon: User,
        component: "Students",
        params: { studentId: student.id }
     });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 1. Augmented Search & Filter Suite */}
      <div className="bg-white p-4 rounded-[2rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 flex flex-wrap gap-4 items-center relative z-10">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[300px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search Registry by Name, ID, or SATS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-primary/10 outline-none transition-all placeholder:text-slate-400"
          />
        </form>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-50 mr-2">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
              title="Compact List"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("detailed")}
              className={cn("p-2.5 rounded-xl transition-all", viewMode === "detailed" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
              title="Detailed Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <select 
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            className="bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option value="">All Grades</option>
            <option value="CLASS-1">Grade 1</option>
            <option value="CLASS-10">Grade 10</option>
          </select>
          
          <button 
            onClick={fetchStudents}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all shadow-lg active:scale-95"
          >
            Refresh Registry
          </button>
        </div>
      </div>

      {/* 2. Professional Entity Cards Grid */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center space-y-4">
           <Loader2 className="w-10 h-10 text-primary animate-spin opacity-20" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Global Student Records...</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {students.map((student) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={student.id} 
                  className="bg-white p-8 rounded-[3.5rem] border-2 border-slate-50 shadow-xl shadow-slate-200/10 hover:border-primary/20 transition-all flex flex-col group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all" />
                  
                  {/* Card Header: Avatar & Base Info */}
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div 
                          onClick={() => handleOpenProfile(student)}
                          className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 font-black text-xl shadow-inner cursor-pointer hover:scale-105 transition-all group-hover:from-primary group-hover:to-violet-600 group-hover:text-white"
                        >
                          {student.firstName[0]}
                        </div>
                        <div>
                            <h4 
                              onClick={() => handleOpenProfile(student)}
                              className="text-xl font-black text-slate-900 tracking-tighter leading-tight hover:text-primary cursor-pointer transition-colors"
                            >
                              {student.firstName} {student.lastName}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">Active</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">#{student.admissionId}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                          onClick={() => openTab({ 
                              id: "fee-collection", 
                              title: "Fee Collection", 
                              icon: Wallet, 
                              component: "Finance", 
                              params: { studentId: student.id } 
                          })}
                          className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                        >
                          <Wallet className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                          <Edit className="w-5 h-5" />
                        </button>
                    </div>
                  </div>

                  {/* Card Body: Academic & Govt Info */}
                  <div className="space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <LayoutIcon className="w-3 h-3" /> Grade / Class
                          </p>
                          <p className="text-sm font-black text-slate-800 tracking-tight">
                            {student.academic?.class?.name || "Unassigned"} <span className="text-primary ml-1 opacity-60">Section {student.academic?.section?.name || "A"}</span>
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100/50">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <HistoryIcon className="w-3 h-3" /> Admission Year
                          </p>
                          <p className="text-sm font-black text-slate-800 tracking-tight">{student.academic?.academicYear?.name || "2025"}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-2">
                        <div>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter mb-0.5">National ID (PEN)</p>
                          <p className="text-xs font-black text-slate-600 tracking-tight">{student.academic?.penNumber || "PendingSync"}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter mb-0.5">Aadhaar Staus</p>
                          <div className={cn("flex items-center gap-1.5 text-[9px] font-black tracking-widest", student.aadhaarVerified ? "text-emerald-600" : "text-rose-600")}>
                              {student.aadhaarVerified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                              {student.aadhaarVerified ? "VERIFIED" : "UNLINKED"}
                          </div>
                        </div>
                    </div>
                  </div>

                  {/* Card Footer: Quick Navigation */}
                  <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                    <div className="flex -space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100" />
                        ))}
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[8px] font-black text-slate-400">+</div>
                    </div>
                    <button 
                      onClick={() => handleOpenProfile(student)}
                      className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group/btn"
                    >
                        Full Detail <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-3">
              {students.map((student) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={student.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => handleOpenProfile(student)}
                      className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer hover:bg-primary hover:text-white transition-all"
                    >
                      {student.firstName[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-none">{student.firstName} {student.lastName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">#{student.admissionId} • {student.academic?.class?.name || "Unassigned"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openTab({ 
                          id: "fee-collection", 
                          title: "Fee Collection", 
                          icon: Wallet, 
                          component: "Finance", 
                          params: { studentId: student.id } 
                      })}
                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all" title="Wallet"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenProfile(student)}
                      className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" title="Profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {viewMode === "detailed" && (
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Identity</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Placement</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fees Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={student.id} 
                      className="group hover:bg-slate-50/30 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                            {student.firstName[0]}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-none">{student.firstName} {student.lastName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">#{student.admissionId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-700">{student.academic?.class?.name || "N/A"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section {student.academic?.section?.name || "A"}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="w-[60%] h-full bg-emerald-500 rounded-full" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Term 1 Clear</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                          <button 
                            onClick={() => openTab({ 
                                id: "fee-collection", 
                                title: "Fee Collection", 
                                icon: Wallet, 
                                component: "Finance", 
                                params: { studentId: student.id } 
                            })}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => handleOpenProfile(student)}
                             className="p-2 bg-slate-900 text-white rounded-lg hover:bg-primary transition-all"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Pagination & Fleet Summary */}
      {!loading && students.length > 0 && (
        <div className="px-10 py-8 bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex flex-col">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Fleet Summary</p>
              <p className="text-sm font-black text-white italic">Synchronized <span className="text-primary">{students.length}</span> Official Student Profiles</p>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <button disabled className="w-10 h-10 bg-white/5 text-white rounded-xl flex items-center justify-center disabled:opacity-20 hover:bg-white/10 transition-all border border-white/5">
                   <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <button disabled className="w-10 h-10 bg-white/5 text-white rounded-xl flex items-center justify-center disabled:opacity-20 hover:bg-white/10 transition-all border border-white/5">
                   <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] font-black text-white opacity-40 uppercase tracking-widest hidden lg:block">Page 01 of 12</p>
           </div>
        </div>
      )}
    </div>
  );
}
