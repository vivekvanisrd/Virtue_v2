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

  const handleOpenProfile = (studentId: string, name: string) => {
    openTab({
       id: `student-profile-${studentId}`,
       title: name,
       icon: User,
       component: "Students",
       params: { studentId }
    });
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

  const handleFixLeakage = async (studentId: string, structureId: string) => {
    setActiveActionId(studentId);
    const res = await alignStudentToClassTemplate(studentId, structureId);
    if (res.success) {
      setLeakage(prev => prev.filter(s => s.id !== studentId));
      setMessage({ type: "success", text: "Fee structure assigned successfully." });
    }
    setActiveActionId(null);
  };

  return (
    <div className="space-y-12 pb-20">
      {/* 1. Dashboard Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Fee Architect</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 mt-2 italic">Configure standard fee templates and bulk sync across classes</p>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowRegistry(!showRegistry)}
                className="px-6 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200 shadow-inner"
            >
                <Settings2 className="w-4 h-4" /> Component Registry
            </button>
            <button 
                onClick={() => { setEditingStructure(null); setShowForm(true); }}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.05] transition-all flex items-center gap-3"
            >
                <Plus className="w-4 h-4" /> Design New Structure
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
            <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Registry / Master Settings */}
      <AnimatePresence>
        {showRegistry && (
           <motion.div 
             initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
             className="bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden relative group"
           >
              <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                 <Settings2 className="w-32 h-32 text-white" />
              </div>

              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 relative z-10">
                 <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter">Global Component Registry</h3>
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Define standard fee heads for your institution</p>
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. Admission Fee"
                      value={newComponentName}
                      onChange={(e) => setNewComponentName(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none w-48"
                    />
                    <button 
                      onClick={async () => {
                         if (!newComponentName) return;
                         const res = await upsertFeeComponentMaster({ name: newComponentName, type: "CORE", isOneTime: false, isRefundable: false });
                         if (res.success) {
                            setNewComponentName("");
                            fetchData();
                            setMessage({ type: "success", text: "New component registered." });
                         }
                      }}
                      className="bg-primary text-white rounded-xl px-5 py-2 font-black text-[10px] uppercase tracking-widest hover:bg-primary/80 transition-all border border-primary/20"
                    >
                       Register Hook
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
                 {masters.map((m) => (
                    <div key={m.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center group hover:bg-white/10 transition-all">
                       <Zap className="w-4 h-4 text-primary mb-2 opacity-50 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black text-white uppercase tracking-widest text-center">{m.name}</span>
                       <span className="text-[8px] font-bold text-white/30 uppercase mt-1 italic tracking-tighter">{m.type}</span>
                    </div>
                 ))}
                 {masters.length === 0 && <p className="col-span-full text-center text-white/20 text-[10px] font-black uppercase tracking-[0.2em] py-4">No registered components found</p>}
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Fee Structure Form Panel */}
      <AnimatePresence>
        {showForm && (
          <FeeStructureForm 
            initialData={editingStructure}
            onSuccess={() => { setShowForm(false); fetchData(); setMessage({ type: "success", text: "Structure saved successfully." }); }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {/* 3. Revenue Leakage (Action Center) */}
      {leakage.length > 0 && (
        <motion.div 
          layout
          className="bg-rose-50/50 border-2 border-rose-100 rounded-[3rem] p-8 lg:p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 right-12 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg">
               <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-rose-900 tracking-tight italic">Registry Drift Detected</h3>
               <p className="text-[10px] font-black text-rose-700 opacity-60 uppercase tracking-widest mt-1">Students without assigned fee structures</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leakage.map(s => {
              // Suggest a structure based on class
              const suggested = structures.find(st => st.classId === s.academic?.classId);
              return (
                <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-xl shadow-rose-200/10 group flex flex-col justify-between h-full hover:border-rose-300 transition-all">
                   <div className="flex items-center gap-4 mb-6">
                      <div 
                        onClick={() => handleOpenProfile(s.id, `${s.firstName} ${s.lastName}`)}
                        className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center font-black text-rose-300 cursor-pointer group-hover:bg-rose-500 group-hover:text-white transition-all"
                      >
                        {s.firstName[0]}
                      </div>
                      <div>
                        <p onClick={() => handleOpenProfile(s.id, `${s.firstName} ${s.lastName}`)} className="font-black text-slate-900 cursor-pointer hover:text-primary transition-colors">{s.firstName} {s.lastName}</p>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest">{s.academic?.class?.name} • #{s.admissionNumber}</p>
                      </div>
                   </div>

                   {suggested ? (
                     <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Suggested Template</p>
                           <p className="text-xs font-black text-slate-700">{suggested.name}</p>
                           <p className="text-[10px] font-bold text-emerald-600 mt-1">{formatCurrency(suggested.totalAmount)} / Annual</p>
                        </div>
                        <button 
                          disabled={activeActionId === s.id}
                          onClick={() => handleFixLeakage(s.id, suggested.id)}
                          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                          {activeActionId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RefreshCcw className="w-3.5 h-3.5" /> Assign Suggested</>}
                        </button>
                     </div>
                   ) : (
                     <div className="p-4 bg-rose-50 text-center rounded-2xl border border-rose-100 flex flex-col items-center">
                        <Calculator className="w-4 h-4 text-rose-300 mb-2" />
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-tight">No Template Found for {s.academic?.class?.name}</p>
                        <p className="text-[8px] font-medium text-rose-400 opacity-60 mt-1">Create a structure first</p>
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 4. Active Structures List */}
      <div className="space-y-6">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
               <LayoutIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Fee Architecture Templates</h3>
         </div>

         {loading && structures.length === 0 ? (
           <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {structures.map(s => (
               <motion.div 
                 key={s.id}
                 layout
                 className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-xl shadow-slate-200/20 hover:border-primary/20 transition-all flex flex-col justify-between group h-full relative overflow-hidden"
               >
                 <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/5 transition-all" />
                 
                 <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                       <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{s.academicYear?.name}</span>
                       <button onClick={() => { setEditingStructure(s); setShowForm(true); }} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-primary transition-all">
                          <Settings2 className="w-4 h-4" />
                       </button>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-primary transition-colors">{s.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Assigned to: {s.class?.name || "Global"}</p>
                    
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 inline-block mb-8">
                       <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Annual Gross Fee</p>
                       <p className="text-2xl font-black text-emerald-700">{formatCurrency(s.totalAmount)}</p>
                    </div>
                 </div>

                 <button 
                   disabled={activeActionId === s.id}
                   onClick={() => handleSyncClass(s.id, s.name)}
                   className="w-full py-5 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 relative z-10"
                 >
                   {activeActionId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RefreshCcw className="w-4 h-4" /> Sync Entire Class</>}
                 </button>
               </motion.div>
             ))}

             {structures.length === 0 && (
                <div className="col-span-full py-32 border-4 border-dashed border-slate-50 rounded-[4rem] flex flex-col items-center justify-center text-slate-400">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <LayoutIcon className="w-8 h-8 opacity-20" />
                   </div>
                   <p className="text-xs font-black uppercase tracking-widest">No Fee Structures Created Yet</p>
                </div>
              )}
           </div>
         )}
      </div>
    </div>
  );
}
