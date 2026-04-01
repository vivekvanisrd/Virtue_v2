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
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{context?.schoolId || "..."}@{context?.branchId || "..."}</span>
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
           <Loader2 className="w-10 h-10 text-primary animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Student Records...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
           <div className="p-6 bg-slate-50 rounded-full mb-6">
              <User className="w-12 h-12 text-slate-200" />
           </div>
           <h3 className="text-xl font-black text-slate-900 tracking-tight">No Students Found</h3>
           <p className="text-sm text-slate-400 mt-2 max-w-xs">We couldn't find any student records matching your current criteria or branch assignment.</p>
           <button 
              onClick={() => { setFilters({ classId: "", sectionId: "", branchId: "" }); setSearchTerm(""); }}
              className="mt-8 text-xs font-black uppercase tracking-widest text-primary hover:underline"
           >
             Reset All Filters
           </button>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000",
          viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
        )}>
           {students.map((student) => (
             <motion.div 
                key={student.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white rounded-[2.5rem] border border-border overflow-hidden group hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500",
                  viewMode === "list" && "flex items-center p-4 gap-6"
                )}
             >
                {/* Visual Header / Avatar */}
                <div className={cn(
                   "relative p-6 flex flex-col items-center transition-all duration-700",
                   viewMode === "grid" ? "bg-slate-50 group-hover:bg-primary/5 h-48 justify-center" : "h-24 w-24 rounded-3xl bg-slate-50 shrink-0"
                )}>
                   <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center border border-slate-100 relative z-10">
                      <User className="w-10 h-10 text-slate-300 group-hover:text-primary transition-colors" />
                      {student.status === "Active" && (
                         <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                      )}
                   </div>
                   {viewMode === "grid" && (
                      <div className="mt-4 text-center">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">{student.studentCode}</span>
                      </div>
                   )}
                </div>

                {/* Info Section */}
                <div className="p-6 flex-1">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none group-hover:text-primary transition-colors">{student.firstName} {student.lastName}</h4>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{student.academic?.class?.name} - {student.academic?.section?.name || "Section A"}</p>
                      </div>
                      <div className="p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer text-slate-300 hover:text-slate-900">
                         <MoreHorizontal className="w-5 h-5" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 my-6">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Admission No</p>
                         <p className="text-xs font-bold text-slate-600">{student.admissionNumber}</p>
                      </div>
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Fees Status</p>
                         <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-black text-emerald-600 tracking-tight">VIVA-CLEAR</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                      <button 
                         onClick={() => setSelectedStudentId(student.id)}
                         className="flex-1 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-black transition-all"
                      >
                         Profile Profile <ChevronRight className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => openTab({ 
                          id: `fee-collection-${student.id}`, 
                          title: `Fees: ${student.firstName}`, 
                          icon: Wallet, 
                          component: "Financials",
                          params: { studentId: student.id } 
                        })}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-primary hover:border-primary transition-all"
                      >
                         <Wallet className="w-4 h-4" />
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
