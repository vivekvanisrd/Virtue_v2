"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, Search, Edit, Eye, Filter, Loader2, ShieldCheck, FileText, BadgeCheck, ArrowRightLeft, Mail, UserX, UserCheck
} from "lucide-react";
import { getStaffDirectoryAction, toggleStaffStatusAction, updateStaffRoleAction } from "@/lib/actions/staff-actions";
import { cn } from "@/lib/utils";
import { StaffTransferModal } from "./StaffTransferModal";
import { StaffRoleChangeModal } from "./StaffRoleChangeModal";
import { useTabs } from "@/context/tab-context";
import { useTenant } from "@/context/tenant-context";
import { toDisplayId } from "@/lib/utils/id-utils";

function getRoleBadge(role: string) {
  const normalizedRole = (role || "").toUpperCase();
  let text = "STAF";
  let classes = "bg-slate-100 text-slate-700 border-slate-200"; // default
  
  if (normalizedRole.includes("TEACHER")) {
     text = "TEAC";
     classes = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (normalizedRole.includes("ADMIN") || normalizedRole.includes("PRINCIPAL")) {
     text = "ADMN";
     classes = "bg-blue-50 text-blue-700 border-blue-200";
  } else if (normalizedRole.includes("OWNER") || normalizedRole.includes("DEVELOPER")) {
     text = "OWNR";
     classes = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (normalizedRole.includes("STAFF")) {
     text = "STAF";
     classes = "bg-slate-100 text-slate-700 border-slate-200";
  } else {
     text = normalizedRole.slice(0, 4);
     classes = "bg-slate-100 text-slate-700 border-slate-200";
  }

  return (
    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider", classes)}>
      {text}
    </span>
  );
}

interface StaffDirectoryProps {
    onEdit?: (staff: any) => void;
}

export function StaffDirectory({ onEdit }: StaffDirectoryProps) {
  const { openTab } = useTabs();
  const { userRole } = useTenant();
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [transferStaff, setTransferStaff] = useState<any>(null);
  const [roleToChangeStaff, setRoleToChangeStaff] = useState<any>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleStatus = async (employeeId: string, currentStatus: string) => {
    const actionName = currentStatus?.toUpperCase() === "ACTIVE" ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionName} this staff member/partner?`)) {
      return;
    }
    
    setTogglingId(employeeId);
    const res = await toggleStaffStatusAction(employeeId);
    setTogglingId(null);

    if (res.success) {
      alert(`User status successfully changed to ${res.status}.`);
      fetchStaff();
    } else {
      alert(res.error || "Failed to toggle status.");
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [filterDept]);

  const fetchStaff = async () => {
    setLoading(true);
    const result = await getStaffDirectoryAction();
    if (result.success && result.data) {
      setStaff(result.data);
    }
    setLoading(false);
  };

  const filteredStaff = staff.filter((employee) => {
    const searchLower = searchTerm.toLowerCase().trim();
    
    let matchesSearch = true;
    if (searchLower) {
      const firstNameMatch = employee.firstName ? employee.firstName.toLowerCase().includes(searchLower) : false;
      const lastNameMatch = employee.lastName ? employee.lastName.toLowerCase().includes(searchLower) : false;
      const middleNameMatch = employee.middleName ? employee.middleName.toLowerCase().includes(searchLower) : false;
      const staffCodeMatch = employee.staffCode ? employee.staffCode.toLowerCase().includes(searchLower) : false;
      const emailMatch = employee.email ? employee.email.toLowerCase().includes(searchLower) : false;
      const phoneMatch = employee.phone ? employee.phone.toLowerCase().includes(searchLower) : false;
      const designationMatch = employee.professional?.designation ? employee.professional.designation.toLowerCase().includes(searchLower) : false;
      const roleMatch = employee.role ? employee.role.toLowerCase().includes(searchLower) : false;
      const departmentMatch = employee.professional?.department ? employee.professional.department.toLowerCase().includes(searchLower) : false;
      
      matchesSearch = !!(firstNameMatch || lastNameMatch || middleNameMatch || staffCodeMatch || emailMatch || phoneMatch || designationMatch || roleMatch || departmentMatch);
    }

    const matchesDept = !filterDept || employee.professional?.department?.toLowerCase() === filterDept.toLowerCase();

    return matchesSearch && matchesDept;
  });

  const isVerificationRequired = (emp: any) => {
    const checkObj = (obj: any) => {
        if (!obj) return false;
        return Object.values(obj).some(val => typeof val === 'string' && val.includes('[REQ_VERIFY]'));
    };
    return checkObj(emp) || checkObj(emp.professional) || checkObj(emp.statutory) || checkObj(emp.bank);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent full page reload and avoid flashing the server sync loader
  };

  console.log("🔍 [StaffDirectory] Render. searchTerm:", searchTerm, "staff.length:", staff.length, "filteredStaff.length:", filteredStaff.length);

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
            className="px-6 py-2 bg-accent text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 active:scale-95 italic"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-slate-200 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)] ring-1 ring-slate-100">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Staff Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Professional Designation</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Communication</th>
                <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Governance Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-24 text-center">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                      <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4 relative z-10" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing Personnel Registry...</p>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-24 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                      <Users className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-800 font-black text-lg tracking-tight">No Personnel Found</p>
                    <p className="text-slate-400 text-xs font-medium mt-1">Adjust your filters or initiate a new onboarding.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((employee) => {
                  const needsVerify = isVerificationRequired(employee);
                  return (
                    <tr key={employee.id} className="hover:bg-slate-50/80 transition-all duration-300 group cursor-default">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-11 h-11 rounded-2xl border flex items-center justify-center text-xs font-black shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform",
                            needsVerify ? "bg-amber-500 border-amber-600 text-white animate-pulse" : "bg-[#0f172a] border-slate-800 text-white"
                          )}>
                            {employee.firstName[0]}{employee.lastName?.[0]}
                          </div>
                          <div>
                             <p 
                                onClick={() => openTab({ 
                                    id: `staff-profile-${employee.id}`, 
                                    title: `${employee.firstName} [${toDisplayId(employee.staffCode)}]`, 
                                    component: "Staff", 
                                    params: { staffId: employee.id, forceEdit: true } 
                                })}
                                className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-2 cursor-pointer hover:underline hover:text-primary transition-all"
                             >
                               {employee.firstName} {employee.lastName}
                               {employee.role === "TEACHER" && <BadgeCheck className="w-4 h-4 text-primary fill-primary/10" />}
                               {needsVerify && (
                                 <span className="px-2 py-0.5 bg-amber-100 text-amber-600 border border-amber-200 rounded-full text-[8px] font-black uppercase animate-bounce">
                                   Verification Required
                                 </span>
                               )}
                             </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              ID: <span 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    openTab({
                                       id: `staff-financials-${employee.id}`,
                                       title: `${employee.firstName} [${toDisplayId(employee.staffCode)}] Ledger`,
                                       component: "Staff",
                                       params: { staffId: employee.id, view: "financials" }
                                    });
                                 }}
                                 className="text-primary font-black font-mono leading-none bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-normal cursor-pointer hover:bg-primary hover:text-white transition-all"
                              >
                                 {toDisplayId(employee.staffCode)}
                              </span>
                              {getRoleBadge(employee.role)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <p className={cn(
                            "text-xs font-black tracking-tight",
                            employee.professional?.designation === "[REQ_VERIFY]" ? "text-amber-600 italic" : "text-slate-800"
                          )}>
                            {employee.professional?.designation || "Executive Officer"}
                          </p>
                          <span className="px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            {employee.professional?.department || "Administration"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2 group/icon">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                employee.email?.includes("@pending.com") ? "bg-amber-50 text-amber-400" : "bg-indigo-50 text-indigo-400 group-hover/icon:bg-indigo-500 group-hover/icon:text-white"
                            )}>
                               <Mail className="w-3.5 h-3.5" />
                            </div>
                            <p className={cn(
                                "text-xs font-bold truncate max-w-[150px]",
                                employee.email?.includes("@pending.com") ? "text-amber-600 italic" : "text-slate-600"
                            )}>
                                {employee.email || "No Email"}
                            </p>
                         </div>
                         <p className={cn(
                             "text-[10px] font-black mt-1.5 ml-10",
                             employee.phone === "0000000000" ? "text-amber-500" : "text-slate-400"
                         )}>
                            CONT: {employee.phone || "N/A"}
                         </p>
                      </td>
                      <td className="px-4 py-5">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black shadow-sm border uppercase tracking-widest",
                          employee.status?.toUpperCase() === "ACTIVE" 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", employee.status?.toUpperCase() === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                          {employee.status}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                          <button className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-xl hover:shadow-slate-200 rounded-xl text-slate-400 hover:text-primary border border-transparent hover:border-slate-100 transition-all" title="View Profile">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onEdit?.(employee)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-xl hover:shadow-slate-200 rounded-xl text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 transition-all" 
                            title="Edit Staff"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {(userRole === "OWNER" || userRole === "DEVELOPER" || userRole?.toUpperCase() === "PRINCIPAL" || userRole?.toUpperCase() === "PLATFORM_ADMIN") && (
                            <button 
                              onClick={() => setRoleToChangeStaff(employee)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-xl hover:shadow-slate-200 rounded-xl text-slate-400 hover:text-amber-600 border border-transparent hover:border-slate-100 transition-all" 
                              title="Quick Change Role"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => setTransferStaff(employee)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-white hover:shadow-xl hover:shadow-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-100 transition-all" 
                            title="Transfer Branch"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          {(userRole === "OWNER" || userRole === "DEVELOPER") && (
                            <button 
                              disabled={togglingId === employee.id}
                              onClick={() => handleToggleStatus(employee.id, employee.status)}
                              className={cn(
                                "w-9 h-9 flex items-center justify-center rounded-xl border border-transparent transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-200",
                                employee.status?.toUpperCase() === "ACTIVE" 
                                  ? "text-rose-500 hover:text-rose-600 hover:border-rose-100" 
                                  : "text-emerald-500 hover:text-emerald-600 hover:border-emerald-100"
                              )}
                              title={employee.status?.toUpperCase() === "ACTIVE" ? "Deactivate User" : "Activate User"}
                            >
                              {togglingId === employee.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              ) : employee.status?.toUpperCase() === "ACTIVE" ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Simple Footer */}
        {!loading && filteredStaff.length > 0 && (
          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            <span>Total Operational Personnel: <span className="text-primary font-black ml-1 bg-primary/10 px-2 py-0.5 rounded-full">{filteredStaff.length}</span></span>
            <div className="flex gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
               <div className="w-2 h-2 rounded-full bg-primary/30"></div>
               <div className="w-2 h-2 rounded-full bg-indigo-500/10"></div>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferStaff && (
        <StaffTransferModal 
          staff={transferStaff}
          onClose={() => setTransferStaff(null)}
          onSuccess={() => {
            fetchStaff();
          }}
        />
      )}

      {/* Role Change Modal */}
      {roleToChangeStaff && (
        <StaffRoleChangeModal 
          staff={roleToChangeStaff}
          onClose={() => setRoleToChangeStaff(null)}
          onSuccess={() => {
            fetchStaff();
          }}
        />
      )}
    </div>
  );
}
