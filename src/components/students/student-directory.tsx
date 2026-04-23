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
  Table as TableIcon,
  Terminal,
  RefreshCcw
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";
import { StudentProfile } from "./student-profile";
import { useTabs } from "@/context/tab-context";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { useTenant } from "@/context/tenant-context";

export function StudentDirectory() {
  const { openTab } = useTabs();
  const context = useTenant();
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
  const [refData, setRefData] = useState<{
    branches: any[],
    classes: any[]
  }>({
    branches: [],
    classes: []
  });
  const [isLoadingRef, setIsLoadingRef] = useState(true);

  // Load reference data on mount
  useEffect(() => {
    async function fetchRefData() {
        setIsLoadingRef(true);
        const { getAdmissionReferenceData } = await import("@/lib/actions/reference-actions");
        const res = await getAdmissionReferenceData();
        if (res.success && res.data) {
            setRefData({
              branches: res.data.branches,
              classes: res.data.classes
            });
        }
        setIsLoadingRef(false);
    }
    fetchRefData();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-4">
             <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student Directory</h2>
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                <Terminal className="w-3 h-3 text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  {context?.schoolId || "..."} | {refData.branches.find(b => b.id === context?.branchId)?.name || context?.branchId || "..."}
                </span>
             </div>
          </div>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Registry of all active academic students</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by name, ID or Aadhaar..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
             <button 
                onClick={() => setViewMode("grid")}
                className={cn("p-2 rounded-xl transition-all", viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
             >
                <LayoutGrid className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setViewMode("list")}
                className={cn("p-2 rounded-xl transition-all", viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
             >
                <List className="w-4 h-4" />
             </button>
             <button 
                onClick={() => setViewMode("detailed")}
                className={cn("p-2 rounded-xl transition-all", viewMode === "detailed" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
             >
                <TableIcon className="w-4 h-4" />
             </button>
          </div>

          <button 
            onClick={fetchStudents}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm active:scale-95"
          >
            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ─── Filters Bar ─── */}
      <div className="flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-700">
         <select 
            value={filters.branchId}
            onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
            className="bg-white border border-border px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
         >
            <option value="">All Branches</option>
            {refData.branches.map(b => (
               <option key={b.id} value={b.id}>{b.name}</option>
            ))}
         </select>

         <select 
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            className="bg-white border border-border px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20"
         >
            <option value="">All Classes</option>
            {refData.classes.map(c => (
               <option key={c.id} value={c.id}>{c.name}</option>
            ))}
         </select>
      </div>

      {/* ─── Main Content ─── */}
      {loading ? (
        <div className="py-40 flex flex-col items-center justify-center space-y-4">
           <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Synchronizing Student Registry...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-32 bg-white/50 backdrop-blur-xl rounded-[4rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent pointer-events-none" />
           <div className="p-8 bg-white rounded-[2.5rem] mb-6 shadow-xl shadow-slate-200/50 border border-slate-100">
              <User className="w-12 h-12 text-slate-200" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Results Found</h3>
           <p className="text-sm text-slate-400 mt-2 max-w-xs font-medium">Refine your search parameters or initiate a new admission request from the hub.</p>
           <button 
              onClick={() => { setFilters({ classId: "", sectionId: "", branchId: "" }); setSearchTerm(""); }}
              className="mt-8 px-8 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Reset Registry Filters
            </button>
        </div>
      ) : (
        <div className={cn(
          "grid gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000",
          viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
           {students.map((student) => (
             <motion.div 
                key={student.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white/80 backdrop-blur-xl rounded-[3.5rem] border border-slate-100 overflow-hidden group hover:shadow-[0_40px_100px_rgba(0,0,0,0.06)] hover:border-primary/20 transition-all duration-700",
                  viewMode === "list" && "flex items-center p-6 gap-8 rounded-[4rem]"
                )}
             >
                {/* Visual Header / Avatar */}
                <div className={cn(
                   "relative p-8 flex flex-col items-center transition-all duration-700",
                   viewMode === "grid" ? "bg-slate-50/50 group-hover:bg-primary/[0.03] h-52 justify-center" : "h-32 w-32 rounded-[2.5rem] bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 shadow-inner"
                )}>
                   <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-500">
                         {student.id.includes("VIVES") ? (
                            <div className="text-xl font-black text-slate-300 group-hover:text-primary transition-colors">
                               {student.firstName[0]}{student.lastName?.[0]}
                            </div>
                         ) : (
                            <User className="w-10 h-10 text-slate-200 group-hover:text-primary transition-colors" />
                         )}
                         {student.status === "Active" && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full shadow-sm" />
                         )}
                      </div>
                   </div>
                   {viewMode === "grid" && (
                      <div className="mt-5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white/80 border border-slate-200/50 px-4 py-1.5 rounded-full shadow-sm font-mono tracking-normal">
                             {(student.registrationId || student.studentCode || "NO_ID")}
                          </span>
                      </div>
                   )}
                </div>

                {/* Info Section */}
                 <div className="p-8 flex-1">
                   <div className="flex justify-between items-start mb-6">
                      <div>
                         <h4 
                           onClick={() => openTab({ 
                              id: `student-profile-${student.id}`, 
                              title: "Student Profile", 
                              component: "Students", 
                              params: { studentId: student.id } 
                           })}
                           className="text-xl font-black text-slate-900 tracking-tighter leading-none cursor-pointer hover:underline hover:text-primary transition-all"
                         >
                           {student.firstName} {student.lastName}
                         </h4>
                         <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-500/5 text-indigo-600 border border-indigo-500/10 rounded-lg uppercase tracking-widest">
                               {student.academic?.class?.name || "Class X"}
                            </span>
                            <span className="text-[10px] font-black px-2.5 py-1 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg uppercase tracking-widest">
                               {student.academic?.section?.name || "Section A"}
                            </span>
                         </div>
                      </div>
                      <div className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-2xl transition-all cursor-pointer text-slate-300 hover:text-slate-900 border border-transparent hover:border-slate-100">
                         <MoreHorizontal className="w-5 h-5" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6 my-8">
                      <div className="space-y-1.5">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Enrollment</p>
                         <p className="text-xs font-black text-slate-700 tracking-tight">{student.history?.[0]?.admissionNumber || student.admissionNumber || "N/A"}</p>
                      </div>
                      <div className="space-y-1.5 text-right">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Financials</p>
                         <div className="flex items-center justify-end gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-600 tracking-widest uppercase italic shadow-emerald-100 drop-shadow-sm">VIVA-CLEAR</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                      <button 
                         onClick={() => openTab({ 
                            id: `student-profile-${student.id}`, 
                            title: "Student Profile", 
                            component: "Students", 
                            params: { studentId: student.id } 
                         })}
                         className="flex-1 py-4 bg-primary text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:bg-primary/90 active:scale-95 transition-all duration-300 relative overflow-hidden group/btn"
                      >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                         <span className="relative z-10 italic">Access Profile</span> 
                         <ChevronRight className="w-3.5 h-3.5 relative z-10" />
                      </button>
                      <button 
                        onClick={() => openTab({ 
                          id: "fee-collection", 
                          title: "Fee Collection", 
                          icon: Wallet, 
                          component: "Finance",
                          params: { studentId: student.id } 
                        })}
                        className="w-14 h-14 bg-white border border-slate-200 rounded-[22px] flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all active:scale-90"
                      >
                         <Wallet className="w-5 h-5" />
                      </button>
                   </div>
                </div>
             </motion.div>
           ))}
        </div>
      )}
    </div>
  );
}
