"use client";

import React, { useEffect, useState } from "react";
import { Shield, Plus, CheckCircle2, AlertCircle, Loader2, Key, Users, Settings2, Trash2 } from "lucide-react";
import { getCustomRoles, createCustomRole, deleteCustomRole } from "@/lib/actions/role-definition-actions";
import { useTenant } from "@/context/tenant-context";
import { cn } from "@/lib/utils";

const PERMISSION_GROUPS = [
  {
    category: "Administration",
    permissions: [
      { id: "MANAGE_STAFF", label: "Manage Staff", desc: "Can onboard and edit staff profiles" },
      { id: "MANAGE_STUDENTS", label: "Manage Students", desc: "Can admit and edit students" },
      { id: "VIEW_STUDENTS", label: "View Students", desc: "Read-only access to student directory" },
    ]
  },
  {
    category: "Academic",
    permissions: [
      { id: "MANAGE_ACADEMICS", label: "Manage Academics", desc: "Can edit classes, sections, exams" },
      { id: "VIEW_ACADEMICS", label: "View Academics", desc: "Read-only access to academics" },
      { id: "MANAGE_ATTENDANCE", label: "Manage Attendance", desc: "Can mark and edit attendance" },
    ]
  },
  {
    category: "Financial",
    permissions: [
      { id: "MANAGE_FINANCE", label: "Manage Finance", desc: "Can collect fees and edit structures" },
      { id: "VIEW_FINANCE", label: "View Finance", desc: "Read-only access to ledgers" },
    ]
  },
  {
    category: "System",
    permissions: [
      { id: "ALL_ACCESS", label: "Super Admin", desc: "Full unrestricted access" },
      { id: "BASIC_ACCESS", label: "Basic Access", desc: "Standard portal login access" },
    ]
  }
];

export function RoleDefinitionManager() {
  const { schoolId, userRole } = useTenant();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    const res = await getCustomRoles(schoolId);
    if (res.success && res.data) {
      setRoles(res.data);
    }
    setLoading(false);
  };

  const togglePermission = (id: string) => {
    setSelectedPerms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setFormError("");
    if (!newRoleName.trim()) {
      setFormError("Role name is required.");
      return;
    }
    if (selectedPerms.length === 0) {
      setFormError("At least one permission must be selected.");
      return;
    }

    setIsSubmitting(true);
    const res = await createCustomRole({
      schoolId,
      name: newRoleName,
      description: newRoleDesc,
      permissions: selectedPerms
    });

    if (res.success) {
      setIsCreating(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setSelectedPerms([]);
      loadRoles();
    } else {
      setFormError(res.error || "Failed to create role");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this custom role? Staff assigned to this role must be reassigned first.")) return;
    
    // Optimistic or loading state could be added here
    const res = await deleteCustomRole(roleId, schoolId);
    if (res.success) {
      loadRoles();
    } else {
      alert(res.error);
    }
  };

  const canManageRoles = ["DEVELOPER", "PLATFORM_ADMIN", "OWNER", "PRINCIPAL"].includes(userRole as string);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-indigo-500" />
            Role Definitions
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Configure foundational security roles and permission capabilities.</p>
        </div>
        {canManageRoles && !isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Custom Role
          </button>
        )}
      </div>

      {/* Creation Form */}
      {isCreating && (
        <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" /> Designer Role
              </h3>
              <button onClick={() => setIsCreating(false)} className="text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider">Cancel</button>
            </div>

            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block">Role Name</label>
                   <input 
                     value={newRoleName}
                     onChange={e => setNewRoleName(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500" 
                     placeholder="e.g. Registrar, Transport Head" 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block">Description</label>
                   <textarea 
                     value={newRoleDesc}
                     onChange={e => setNewRoleDesc(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none" 
                     placeholder="Role responsibilities..." 
                     rows={3}
                   />
                 </div>
              </div>

              <div>
                 <label className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 block">Permission Matrix</label>
                 <div className="bg-black/20 rounded-xl p-4 h-64 overflow-y-auto custom-scrollbar border border-white/5 space-y-6">
                    {PERMISSION_GROUPS.map((group, idx) => (
                       <div key={idx} className="space-y-3">
                          <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-1">{group.category}</h4>
                          <div className="grid gap-2">
                             {group.permissions.map(p => (
                                <label key={p.id} className={cn(
                                   "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                   selectedPerms.includes(p.id) ? "bg-indigo-500/20 border-indigo-500/50" : "bg-white/5 border-transparent hover:bg-white/10"
                                )}>
                                   <input 
                                     type="checkbox" 
                                     className="mt-1 flex-shrink-0"
                                     checked={selectedPerms.includes(p.id)}
                                     onChange={() => togglePermission(p.id)}
                                   />
                                   <div>
                                      <p className={cn("text-sm font-bold", selectedPerms.includes(p.id) ? "text-indigo-100" : "text-white/80")}>{p.label}</p>
                                      <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{p.desc}</p>
                                   </div>
                                </label>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
               <button 
                 onClick={handleCreate}
                 disabled={isSubmitting}
                 className="flex items-center gap-2 px-8 py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-black rounded-xl transition-all shadow-xl active:scale-95 disabled:opacity-50"
               >
                 {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4" /> Finalize Role</>}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Role List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading ? (
           <div className="col-span-full py-12 flex justify-center">
             <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
           </div>
         ) : roles.length === 0 ? (
           <div className="col-span-full py-12 text-center text-slate-400 font-medium">
             No roles generated. Please refresh to trigger auto-seed.
           </div>
         ) : roles.map((role) => (
           <div key={role.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                    <div className={cn(
                       "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                       role.isSystem ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                       <Key className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="font-bold text-slate-800">{role.name}</h3>
                       <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-0.5",
                          role.isSystem ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
                       )}>
                          {role.isSystem ? "System Standard" : "Custom Profile"}
                       </span>
                    </div>
                 </div>
                 
                 {!role.isSystem && canManageRoles && (
                    <button 
                      onClick={() => handleDelete(role.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Delete Role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 )}
              </div>
              
              <p className="text-xs text-slate-500 mb-6 flex-1 line-clamp-2 leading-relaxed">
                 {role.description || "No specific operational description provided for this role profile."}
              </p>
              
              <div className="border-t border-slate-100 pt-4 mt-auto">
                 <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                       role.permissions.slice(0, 3).map((perm: string) => (
                         <span key={perm} className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                           {perm.replace(/_/g, ' ')}
                         </span>
                       ))
                    ) : (
                       <span className="text-[10px] font-bold text-slate-400 italic">No specific permissions</span>
                    )}
                    {Array.isArray(role.permissions) && role.permissions.length > 3 && (
                       <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                         +{role.permissions.length - 3} more
                       </span>
                    )}
                 </div>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
}
