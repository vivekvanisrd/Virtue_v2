"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Loader2, 
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { getStaffMembers, updateStaffRole } from "@/lib/actions/role-actions";
import { ROLES, Role, canManageRole } from "@/lib/utils/rbac";
import { cn } from "@/lib/utils";

// Mocking the current active user's role and school for demo purposes
// In production, this comes from Supabase Session/Auth Context
const CURRENT_SCENARIO = {
  actingUserRole: ROLES.OWNER, 
  schoolId: "VR-SCH01" // Active school in the current DB
};

export function StaffRolesManager() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setIsLoading(true);
    const result = await getStaffMembers(CURRENT_SCENARIO.schoolId);
    if (result.success && result.data) {
      setStaffList(result.data);
    }
    setIsLoading(false);
  };

  const handleRoleChange = async (staffId: string, newRole: string) => {
    setUpdatingId(staffId);
    setMessage(null);

    const result = await updateStaffRole(
      CURRENT_SCENARIO.actingUserRole, 
      staffId, 
      newRole as Role
    );

    if (result.success) {
      setMessage({ type: "success", text: "Role updated successfully!" });
      // Update local state to reflect change without full reload
      setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, role: newRole } : s));
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update role" });
    }
    
    setUpdatingId(null);
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredStaff = staffList.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Role Management
          </h2>
          <p className="text-slate-500 mt-1">
            Assign robust RBAC roles to your staff members to control system access.
          </p>
        </div>
        
        {/* Mock Context Indicator */}
        <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold flex items-center gap-2 border border-blue-100">
          <ShieldAlert className="w-4 h-4" />
          Acting as: {CURRENT_SCENARIO.actingUserRole}
        </div>
      </div>

      {/* Global Alerts */}
      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 font-medium animate-in fade-in slide-in-from-top-2",
          message.type === "success" ? "bg-green-50 text-green-700 border-2 border-green-200" : "bg-red-50 text-red-700 border-2 border-red-200"
        )}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Staff List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p>Loading staff directory...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-600">No staff members found.</p>
            <p className="text-sm mt-1">Try adjusting your search or ensure the school has staff.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 font-bold border-b border-slate-100">Employee</th>
                  <th className="p-4 font-bold border-b border-slate-100">Contact ID</th>
                  <th className="p-4 font-bold border-b border-slate-100">Current Role</th>
                  <th className="p-4 font-bold border-b border-slate-100 text-right">Manage Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const isActingUser = false; // Mock - would check if staff.id === currentUser.id
                  const canManage = canManageRole(CURRENT_SCENARIO.actingUserRole, staff.role) && !isActingUser;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {staff.firstName[0]}{staff.lastName?.[0] || ""}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{staff.firstName} {staff.lastName}</div>
                            <div className="text-xs text-slate-500">{staff.email || "No email"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-700">{staff.employeeId}</div>
                        <div className="text-xs text-slate-400">{staff.phone || "No phone"}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-wider">
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {updatingId === staff.id ? (
                          <div className="inline-flex items-center justify-center w-[140px] py-2 text-sm text-primary">
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Updating...
                          </div>
                        ) : (
                          <select
                            disabled={!canManage}
                            value={staff.role}
                            onChange={(e) => handleRoleChange(staff.id, e.target.value)}
                            className={cn(
                              "w-[140px] px-3 py-2 border rounded-lg text-sm font-medium outline-none transition-all",
                              canManage 
                                ? "bg-white border-slate-200 hover:border-primary focus:border-primary cursor-pointer text-slate-700" 
                                : "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                            )}
                            title={!canManage ? "You do not have permission to manage this role" : "Change role"}
                          >
                            {Object.values(ROLES).map(role => {
                              // Only show roles the acting user is allowed to assign
                              const canAssign = canManageRole(CURRENT_SCENARIO.actingUserRole, role);
                              if (!canAssign && staff.role !== role) return null; // Hide roles they can't assign (except current)
                              
                              return (
                                <option key={role} value={role} disabled={!canAssign}>
                                  {role}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
