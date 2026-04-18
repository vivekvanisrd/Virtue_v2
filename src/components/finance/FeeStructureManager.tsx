"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  Settings2, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Loader2,
  Trash2, 
  History as HistoryIcon, 
  Layout as LayoutIcon, 
  Calculator,
  User
} from "lucide-react";
import { 
  getFeeStructures, 
  applyFeeStructureToClass, 
  alignStudentToClassTemplate,
  getFeeComponentMaster,
  upsertFeeComponentMaster
} from "@/lib/actions/fee-actions";
import { getRevenueLeakageReport } from "@/lib/actions/finance-actions";
import { FeeStructureForm } from "./FeeStructureForm";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTabs } from "@/context/tab-context";

/**
 * FeeStructureManager
 * 
 * The Administrative Command Center for Fee Configuration.
 * Manages global templates and bulk student assignments.
 */
export function FeeStructureManager() {
  const { openTab } = useTabs();
  const [structures, setStructures] = useState<any[]>([]);
  const [leakage, setLeakage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<any | null>(null);
  const [showRegistry, setShowRegistry] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [masters, setMasters] = useState<any[]>([]);
  const [newComponentName, setNewComponentName] = useState("");
  
  // 🏢 VIEW ENGINE STATE
  const [viewMode, setViewMode] = useState<"grid" | "list" | "detail">("grid");
  const [showArchived, setShowArchived] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [structRes, leakRes, mstRes] = await Promise.all([
      getFeeStructures(),
      getRevenueLeakageReport(),
      getFeeComponentMaster()
    ]);
    if (structRes.success) setStructures(structRes.data);
    if (leakRes.success) setLeakage(leakRes.data);
    if (mstRes.success) setMasters(mstRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleArchive = async (id: string) => {
    const { toggleFeeStructureActiveAction } = await import("@/lib/actions/fee-actions");
    const res = await toggleFeeStructureActiveAction(id);
    if (res.success) {
      setMessage({ type: "success", text: `Structure ${res.isActive ? 'enabled' : 'disabled'}.` });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will permanently remove the structure if unused, or ARCHIVE it if any student history exists.")) return;
    const { deleteFeeStructureAction } = await import("@/lib/actions/fee-actions");
    const res = await deleteFeeStructureAction(id);
    if (res.success) {
      setMessage({ type: "success", text: res.message });
      fetchData();
    } else {
      setMessage({ type: "error", text: res.error });
    }
  };

  const handleSyncClass = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to SYNCHRONIZE all students in this class to the '${name}' template? This will update their dues.`)) return;
    
    setActiveActionId(id);
    const res = await applyFeeStructureToClass(id);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Class fees synchronized." });
      fetchData();
    } else {
      setMessage({ type: "error", text: res.error || "Sync failed." });
    }
    setActiveActionId(null);
  };

  const filteredStructures = structures.filter(s => showArchived ? true : s.isActive !== false);

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Fee Architect</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic flex items-center gap-2">
             <LayoutIcon className="w-3 h-3" /> Institutional Template Management & Bulk Sync
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* VIEW SWITCHER */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
               <button 
                 onClick={() => setViewMode("grid")}
                 className={cn("p-2.5 rounded-xl transition-all", viewMode === "grid" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                 <LayoutIcon className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode("list")}
                 className={cn("p-2.5 rounded-xl transition-all", viewMode === "list" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                 <TrendingUp className="w-4 h-4 rotate-90" />
               </button>
               <button 
                 onClick={() => setViewMode("detail")}
                 className={cn("p-2.5 rounded-xl transition-all", viewMode === "detail" ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600")}
               >
                 <Settings2 className="w-4 h-4" />
               </button>
            </div>

            <button 
                onClick={() => setShowArchived(!showArchived)}
                className={cn("px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-2 flex items-center border", 
                  showArchived ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50")}
            >
                <HistoryIcon className="w-4 h-4" /> {showArchived ? "Hide Archived" : "Show All"}
            </button>

            <button 
                onClick={() => setShowRegistry(!showRegistry)}
                className="px-6 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
            >
                <Plus className="w-4 h-4" /> Registry
            </button>
            <button 
                onClick={() => { setEditingStructure(null); setShowForm(true); }}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center gap-3"
            >
                <Zap className="w-4 h-4 animate-pulse" /> Design New
            </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className={cn("p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold", 
              message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100 font-black">CLOSE</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN VIEW ENGINE */}
      <AnimatePresence mode="wait">
         {showForm ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
               <FeeStructureForm 
                 initialData={editingStructure}
                 onSuccess={() => { setShowForm(false); fetchData(); setMessage({ type: "success", text: "Structure saved successfully." }); }}
                 onCancel={() => setShowForm(false)}
               />
            </motion.div>
         ) : (
            <div className="space-y-12">
               {loading ? (
                  <div className="py-40 flex flex-col items-center justify-center opacity-20">
                     <Loader2 className="w-12 h-12 animate-spin mb-4" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Registry...</p>
                  </div>
               ) : (
                  <>
                     {/* 🏙️ LIST VIEW (HIGH DENSITY) */}
                     {viewMode === "list" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
                           <table className="w-full border-separate border-spacing-y-3">
                              <thead>
                                 <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                                    <th className="px-8 py-2">Template & Description</th>
                                    <th className="px-6 py-2">Assignment Scope</th>
                                    <th className="px-6 py-2">Base Annual</th>
                                    <th className="px-6 py-2">Status</th>
                                    <th className="px-6 py-2 text-right">Operations</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {filteredStructures.map(s => (
                                    <tr key={s.id} className={cn("group transition-all hover:scale-[1.005]", s.isActive === false && "opacity-50 grayscale")}>
                                       <td className="bg-white border-y border-l border-slate-100 rounded-l-[2rem] px-8 py-6">
                                          <p className="font-black text-slate-900 group-hover:text-primary transition-colors">{s.name}</p>
                                          <p className="text-[9px] font-medium text-slate-400 mt-0.5 line-clamp-1 italic">{s.description || "No metadata note"}</p>
                                       </td>
                                       <td className="bg-white border-y border-slate-100 px-6 py-6">
                                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-tight text-slate-500">{s.class?.name || "Global"}</span>
                                       </td>
                                       <td className="bg-white border-y border-slate-100 px-6 py-6">
                                          <p className="text-sm font-black text-emerald-600">{formatCurrency(s.totalAmount)}</p>
                                       </td>
                                       <td className="bg-white border-y border-slate-100 px-6 py-6">
                                          <div className="flex items-center gap-2">
                                             <div className={cn("w-2 h-2 rounded-full", s.isActive !== false ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                                             <span className="text-[9px] font-black uppercase tracking-widest">{s.isActive !== false ? "Active" : "Archived"}</span>
                                          </div>
                                       </td>
                                       <td className="bg-white border-y border-r border-slate-100 rounded-r-[2rem] px-6 py-6 text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                             <button onClick={() => { setEditingStructure(s); setShowForm(true); }} className="p-2 text-slate-400 hover:text-primary"><LayoutIcon className="w-4 h-4" /></button>
                                             <button onClick={() => handleToggleArchive(s.id)} className="p-2 text-slate-400 hover:text-amber-500"><HistoryIcon className="w-4 h-4" /></button>
                                             <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </motion.div>
                     )}

                     {/* 🖼️ GRID VIEW (DEFAULT) */}
                     {viewMode === "grid" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {filteredStructures.map(s => (
                              <motion.div 
                                 key={s.id} layout
                                 className={cn("bg-white p-8 rounded-[3rem] border-2 shadow-xl hover:shadow-primary/5 transition-all flex flex-col justify-between group h-full relative overflow-hidden", 
                                   s.isActive !== false ? "border-slate-50 hover:border-primary/20" : "border-slate-100 grayscale opacity-70"
                                 )}
                              >
                                 <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{s.academicYear?.name}</span>
                                       <div className="flex gap-2">
                                          <button onClick={() => { setEditingStructure(s); setShowForm(true); }} className="p-2 text-slate-300 hover:text-primary transition-all"><Settings2 className="w-4 h-4" /></button>
                                          <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                       </div>
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1 group-hover:text-primary transition-colors">{s.name}</h4>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4 italic">{s.description || "Class Template"}</p>
                                    
                                    <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 inline-block mb-8">
                                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Annual Baseline</p>
                                       <p className="text-3xl font-black text-emerald-700 tracking-tighter italic">{formatCurrency(s.totalAmount)}</p>
                                    </div>
                                 </div>

                                 <div className="space-y-3 relative z-10">
                                    <button 
                                      onClick={() => handleSyncClass(s.id, s.name)}
                                      className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-slate-200"
                                    >
                                       <RefreshCcw className="w-4 h-4" /> Global Class Sync
                                    </button>
                                    <button 
                                       onClick={() => handleToggleArchive(s.id)}
                                       className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                       <HistoryIcon className="w-3 h-3" /> {s.isActive !== false ? "Deactivate Hook" : "Restore System Hook"}
                                    </button>
                                 </div>
                              </motion.div>
                           ))}
                        </div>
                     )}

                     {/* 🔍 DETAIL VIEW (DEEP ANALYTICS) */}
                     {viewMode === "detail" && (
                        <div className="space-y-10">
                           {filteredStructures.map(s => (
                              <div key={s.id} className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 flex flex-col lg:flex-row gap-12">
                                 <div className="lg:w-1/3 space-y-6">
                                    <div>
                                       <h4 className="text-3xl font-black text-slate-900 tracking-tighter italic">{s.name}</h4>
                                       <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-2">{s.academicYear?.name} • {s.class?.name}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Component Stack</p>
                                       <div className="space-y-3">
                                          {s.components?.map((c: any) => (
                                             <div key={c.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-600">{c.masterComponent?.name}</span>
                                                <span className="text-[10px] font-black text-emerald-600">{formatCurrency(c.amount)}</span>
                                             </div>
                                          ))}
                                          <div className="pt-2 border-t border-slate-200 flex justify-between font-black">
                                             <span className="text-[11px] text-slate-900">GROSS TOTAL</span>
                                             <span className="text-[11px] text-primary">{formatCurrency(s.totalAmount)}</span>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex-1 space-y-6">
                                    <div className="flex items-center justify-between">
                                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Notes & Instructions</p>
                                       <div className="flex gap-2">
                                          <button onClick={() => handleDelete(s.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                                          <button onClick={() => handleToggleArchive(s.id)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">{s.isActive !== false ? "Disable" : "Enable"}</button>
                                       </div>
                                    </div>
                                    <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100 italic">
                                       <p className="text-sm font-medium text-emerald-800 leading-relaxed">
                                          "{s.description || 'This structure serves as the primary financial baseline for the academic session. No promotional metadata currently assigned.'}"
                                       </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                          <p className="text-2xl font-black text-slate-900">{s.students?.length || 0}</p>
                                          <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Managed Students</p>
                                       </div>
                                       <div className="bg-primary text-white p-6 rounded-[2rem] flex flex-col justify-between">
                                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status Oversight</p>
                                          <p className="text-[11px] font-black uppercase italic tracking-widest">{s.isActive !== false ? "SECURED IN REGISTRY" : "ARCHIVED / DISABLED"}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </>
               )}
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
