"use client";

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Tags, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Settings,
  ShieldAlert
} from "lucide-react";
import { 
  getDepartments, 
  createDepartment, 
  deleteDepartment,
  getStaffCategories,
  createStaffCategory,
  deleteStaffCategory,
  seedDefaultsIfEmpty
} from "@/lib/actions/staff-config-actions";
import { useTenant } from "@/context/tenant-context";
import { cn } from "@/lib/utils";

export function InstitutionalConfigManager() {
  const { schoolId, userRole } = useTenant();
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [newDept, setNewDept] = useState("");
  const [newCat, setNewCat] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<{type: 'dept' | 'cat' | 'seed' | null}>({ type: null });
  const [error, setError] = useState<string | null>(null);

  const canManage = userRole === "OWNER" || userRole === "DEVELOPER" || userRole === "PRINCIPAL";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [deptRes, catRes] = await Promise.all([
      getDepartments(schoolId),
      getStaffCategories(schoolId)
    ]);
    
    if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
    if (catRes.success && catRes.data) setCategories(catRes.data);
    setLoading(false);
  };

  const handleAddDept = async () => {
    if (!newDept.trim()) return;
    setIsSubmitting({ type: 'dept' });
    const res = await createDepartment(schoolId, newDept.trim());
    if (res.success) {
      setNewDept("");
      loadData();
    } else {
      setError(res.error);
    }
    setIsSubmitting({ type: null });
  };

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    setIsSubmitting({ type: 'cat' });
    const res = await createStaffCategory(schoolId, newCat.trim());
    if (res.success) {
      setNewCat("");
      loadData();
    } else {
      setError(res.error);
    }
    setIsSubmitting({ type: null });
  };

  const handleDelete = async (type: 'dept' | 'cat', id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type === 'dept' ? 'department' : 'category'}?`)) return;
    const res = type === 'dept' ? await deleteDepartment(id) : await deleteStaffCategory(id);
    if (res.success) {
      loadData();
    } else {
      setError(res.error);
    }
  };

  const handleSeed = async () => {
    setIsSubmitting({ type: 'seed' });
    const res = await seedDefaultsIfEmpty(schoolId);
    if (res.success) {
      loadData();
    }
    setIsSubmitting({ type: null });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Constructing Master Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 🛡️ SECURITY BANNER */}
      {!canManage && (
         <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
               <h3 className="text-amber-900 font-black text-lg">Read-Only Configuration</h3>
               <p className="text-amber-700/70 text-sm font-medium">Only institutional leadership can modify global departments and role categories.</p>
            </div>
         </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- DEPARTMENTS SECTION --- */}
        <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6 flex flex-col">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800">Departments</h3>
                   <p className="text-xs text-slate-400 font-medium">Define institutional subdivisions</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-tighter">
                {departments.length} Active
              </span>
           </div>

           {canManage && (
             <div className="flex gap-2">
                <input 
                  value={newDept}
                  onChange={e => setNewDept(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium"
                  placeholder="e.g. Science Dept, IT Support"
                />
                <button 
                  onClick={handleAddDept}
                  disabled={isSubmitting.type === 'dept' || !newDept.trim()}
                  className="w-12 h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting.type === 'dept' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
             </div>
           )}

           <div className="flex-1 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {departments.length === 0 ? (
                <div className="text-center py-12 opacity-30">
                  <p className="text-sm font-bold italic">No departments listed.</p>
                </div>
              ) : (
                departments.map(dept => (
                  <div key={dept.id} className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/20 hover:bg-white transition-all hover:shadow-md">
                     <span className="text-sm font-bold text-slate-700">{dept.name}</span>
                     {canManage && (
                       <button 
                         onClick={() => handleDelete('dept', dept.id)}
                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                ))
              )}
           </div>
        </section>

        {/* --- ROLE CATEGORIES SECTION --- */}
        <section className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6 flex flex-col">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Tags className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 tracking-tight">Role Nature</h3>
                   <p className="text-xs text-slate-400 font-medium">Categorize staff types</p>
                </div>
              </div>
              <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-tighter">
                {categories.length} Active
              </span>
           </div>

           {canManage && (
             <div className="flex gap-2">
                <input 
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium"
                  placeholder="e.g. Academic Lead, Security"
                />
                <button 
                  onClick={handleAddCat}
                  disabled={isSubmitting.type === 'cat' || !newCat.trim()}
                  className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting.type === 'cat' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                </button>
             </div>
           )}

           <div className="flex-1 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {categories.length === 0 ? (
                <div className="text-center py-12 opacity-30">
                  <p className="text-sm font-bold italic">No role categories listed.</p>
                </div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} className="group flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-emerald-500/20 hover:bg-white transition-all hover:shadow-md">
                     <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                     {canManage && (
                       <button 
                         onClick={() => handleDelete('cat', cat.id)}
                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     )}
                  </div>
                ))
              )}
           </div>
        </section>

      </div>

      {/* --- PRE-SEEDER TOOL --- */}
      {canManage && departments.length === 0 && categories.length === 0 && (
        <div className="bg-slate-900 rounded-[48px] p-12 text-center text-white relative overflow-hidden shadow-2xl">
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent pointer-events-none" />
           <div className="relative z-10 max-w-lg mx-auto space-y-6">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto border border-indigo-500/30">
                <Settings className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-3xl font-black italic tracking-tighter">Genesis Initialization Required</h2>
                 <p className="text-slate-400 font-bold text-sm">Your institutional master lists are empty. Would you like to auto-seed with standard educational industry defaults?</p>
              </div>
              <button 
                onClick={handleSeed}
                disabled={isSubmitting.type === 'seed'}
                className="px-10 py-5 bg-white text-slate-900 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
              >
                {isSubmitting.type === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Import Global Defaults</>}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
