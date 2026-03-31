"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, Edit, Eye, Filter, Loader2, ShieldCheck, FileText, BadgeCheck
} from "lucide-react";
import { getStaffDirectoryAction } from "@/lib/actions/staff-actions";
import { cn } from "@/lib/utils";

export function StaffDirectory() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");

  useEffect(() => {
    fetchStaff();
  }, [filterDept]);

  const fetchStaff = async () => {
    setLoading(true);
    const result = await getStaffDirectoryAction({ search: searchTerm, department: filterDept });
    if (result.success && result.data) {
      setStaff(result.data);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStaff();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Search & Filters */}
      <div className="bg-background p-3 rounded-xl border border-border shadow-sm flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground opacity-40" />
          <input
            type="text"
            placeholder="Search by Name, Staff ID, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </form>
        
        <div className="flex items-center gap-2">
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Departments</option>
            <option value="Academics">Academics</option>
            <option value="HR">Human Resources</option>
            <option value="Finance">Finance</option>
            <option value="Operations">Operations</option>
            <option value="Transport">Transport</option>
          </select>
          <button 
            onClick={fetchStaff}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-4 text-xs font-black text-foreground opacity-80 uppercase tracking-wider">Staff Info</th>
                <th className="px-4 py-4 text-xs font-black text-foreground opacity-80 uppercase tracking-wider">Professional</th>
                <th className="px-4 py-4 text-xs font-black text-foreground opacity-80 uppercase tracking-wider text-indigo-700">Contact</th>
                <th className="px-4 py-4 text-xs font-black text-foreground opacity-80 uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-xs font-black text-foreground opacity-80 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-foreground opacity-40 text-xs font-medium uppercase tracking-widest">Loading Personnel...</p>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="bg-muted/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-foreground opacity-30" />
                    </div>
                    <p className="text-foreground opacity-50 font-bold tracking-tight">No Staff Found</p>
                    <p className="text-foreground opacity-40 text-[10px] mt-1">Try adjusting your filters.</p>
                  </td>
                </tr>
              ) : (
                staff.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 border flex items-center justify-center text-white text-xs font-black shadow-sm">
                          {employee.firstName[0]}{employee.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-base font-black text-foreground tracking-tight leading-none mb-1.5 flex items-center gap-1.5">
                            {employee.firstName} {employee.lastName}
                            {employee.role === "TEACHER" && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
                          </p>
                          <p className="text-xs font-bold text-foreground opacity-50 tracking-wide">
                            ID: <span className="text-primary font-black">{employee.staffCode}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">{employee.professional?.designation || "N/A"}</p>
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-black uppercase inline-block">
                          {employee.professional?.department || "Unassigned"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                       <p className="text-xs font-bold text-slate-700 break-all">{employee.email || "No Email"}</p>
                       <p className="text-xs font-bold text-slate-500 mt-0.5">{employee.phone || "No Phone"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm border uppercase",
                        employee.status === "Active" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {employee.status === "Active" ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 opacity-40" />}
                        {employee.status}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 hover:bg-muted rounded text-foreground opacity-40 hover:text-primary transition-colors" title="View Profile">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-muted rounded text-foreground opacity-40 hover:text-foreground transition-colors" title="Edit Staff">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Footer */}
        {!loading && staff.length > 0 && (
          <div className="px-6 py-4 bg-muted/50 border-t border-border flex justify-between items-center text-xs font-black text-foreground opacity-60 uppercase tracking-widest">
            <span>Showing <span className="text-primary">{staff.length}</span> Official Employee records</span>
          </div>
        )}
      </div>
    </div>
  );
}
