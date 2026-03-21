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
  ExternalLink
} from "lucide-react";
import { getStudentListAction } from "@/lib/actions/student-actions";
import { cn } from "@/lib/utils";
import { StudentProfile } from "./student-profile";

export function StudentDirectory() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    classId: "",
    sectionId: "",
    branchId: ""
  });

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
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Search & Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, Admission ID, or PEN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </form>
        
        <div className="flex items-center gap-2">
          <select 
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Classes</option>
            <option value="CLASS-1">Class 1</option>
            <option value="CLASS-10">Class 10</option>
          </select>
          
          <select 
            value={filters.branchId}
            onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value }))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Branches</option>
            <option value="BR001">Main Campus</option>
          </select>

          <button 
            onClick={fetchStudents}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-wider">Student Info</th>
                <th className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-wider">Academic Details</th>
                <th className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-wider text-indigo-700">Govt Identifiers (UDISE+)</th>
                <th className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-wider">Compliance</th>
                <th className="px-4 py-4 text-xs font-black text-slate-700 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Syncing Cloud Records...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold tracking-tight">No Students Found</p>
                    <p className="text-slate-400 text-[10px] mt-1">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-primary flex items-center justify-center text-white text-xs font-black shadow-sm">
                          {student.firstName[0]}{student.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 tracking-tight leading-none mb-1.5">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs font-bold text-slate-500 tracking-wide">
                            ID: <span className="text-primary font-black">{student.admissionId}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-black">
                            {student.academic?.class?.name || (typeof student.academic?.class === 'string' ? student.academic.class : 'N/A')}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-black">
                            Sec {student.academic?.section?.name || (typeof student.academic?.section === 'string' ? student.academic.section : "A")}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">
                          AY: <span className="text-slate-900">{student.academic?.academicYear}</span>
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">PEN (UDISE)</span>
                          <span className="text-sm font-black text-slate-900">{student.academic?.penNumber || "Pending"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">STS / SATS</span>
                          <span className="text-sm font-black text-slate-900">{student.academic?.stsId || "N/A"}</span>
                        </div>
                        <div className="flex flex-col col-span-2 mt-1">
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-tighter">APAAR ID</span>
                          <span className="text-sm font-bold text-slate-600 tracking-tight">{student.academic?.apaarId || "Not Linked"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2.5">
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm border",
                          student.aadhaarVerified 
                            ? "bg-green-50 text-green-700 border-green-100" 
                            : "bg-red-50 text-red-600 border-red-100"
                        )}>
                          {student.aadhaarVerified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          AADHAAR: {student.aadhaarVerified ? "VERIFIED" : "PENDING"}
                        </div>
                        {student.bplStatus && (
                          <div className="px-2.5 py-1 bg-violet-100 text-violet-700 border border-violet-200 rounded-lg text-[11px] font-black shadow-sm">
                            BPL HOLDER
                          </div>
                        )}
                        <div className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-black shadow-sm">
                          {student.category}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedStudentId(student.id)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-primary transition-colors" 
                          title="View Profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors" title="Edit Student">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-red-50 rounded text-red-200 hover:text-red-500 transition-colors" title="Delete record">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Footer Pagination Info */}
        {!loading && students.length > 0 && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-black text-slate-600 uppercase tracking-widest">
            <span>Showing <span className="text-primary">{students.length}</span> Official Student records</span>
            <div className="flex gap-3">
              <button disabled className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 shadow-sm">Prev</button>
              <button disabled className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 shadow-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
