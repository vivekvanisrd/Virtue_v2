"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Layout, 
  Calendar,
  Settings,
  ArrowRight,
  Info
} from "lucide-react";
import { 
  getAvailableClasses, 
  getAcademicYears, 
  getFeeComponentMaster,
  upsertFeeComponentMaster,
  upsertFeeStructure 
} from "@/lib/actions/fee-actions";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTabs } from "@/context/tab-context";

interface FeeStructureFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * FeeStructureForm (Modular 2026-27 Version)
 * 
 * Upgraded to support 'Component-Based' architecture where each fee
 * (Tuition, Admission, Sports etc) is a distinct entity.
 */
export function FeeStructureForm({ initialData, onSuccess, onCancel }: FeeStructureFormProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || "",
    classId: initialData?.classId || "",
    academicYearId: initialData?.academicYearId || "",
    components: initialData?.components?.map((c: any) => ({
      componentId: c.componentId,
      amount: Number(c.amount) || 0,
      scheduleType: c.scheduleType || "TERM"
    })) || []
  });

  const { setTabDirty } = useTabs();

  // --- WORKSPACE GUARD (isDirty) ---
  useEffect(() => {
    const isDirty = formData.name !== (initialData?.name || "") ||
                  formData.classId !== (initialData?.classId || "") ||
                  formData.academicYearId !== (initialData?.academicYearId || "") ||
                  formData.components.length !== (initialData?.components?.length || 0);
    
    setTabDirty("fee-manager", isDirty);
    return () => setTabDirty("fee-manager", false);
  }, [formData, initialData, setTabDirty]);

  useEffect(() => {
    async function init() {
      const [clsRes, yrRes, mstRes] = await Promise.all([
        getAvailableClasses(),
        getAcademicYears(),
        getFeeComponentMaster()
      ]);
      if (clsRes.success) setClasses(clsRes.data);
      if (yrRes.success) setYears(yrRes.data);
      if (mstRes.success) setMasters(mstRes.data);
    }
    init();
  }, []);

  const totalAmount = formData.components.reduce((sum: number, c: { amount: number }) => sum + Number(c.amount || 0), 0);

  const addComponent = () => {
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { componentId: "", amount: 0, scheduleType: "TERM" }]
    }));
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i: number) => i !== index)
    }));
  };

  const updateComponent = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((c, i: number) => i === index ? { ...c, ...updates } : c)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId || !formData.academicYearId) {
      setError("Please complete the basic template information.");
      return;
    }
    if (formData.components.length === 0) {
      setError("Please add at least one fee component (e.g. Tuition).");
      return;
    }
    if (formData.components.some((c: { componentId: string; amount: number }) => !c.componentId || c.amount <= 0)) {
      setError("Please ensure all components have a type and a positive amount.");
      return;
    }

    setLoading(true);
    setError(null);
    
    const res = await upsertFeeStructure(formData);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || "Failed to finalize fee architecture.");
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
    >
      {/* Decorative Accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-bg opacity-20" />

      <div className="flex flex-col lg:flex-row justify-between items-start gap-8 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group border border-primary/20 shadow-inner">
            <Zap className="w-7 h-7 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">
              {formData.id ? "Edit Structure Template" : "New Fee Architecture"}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 italic">
              Hardening the Baseline for 2026-27 Academic Dues
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border-2 border-slate-100 px-8 py-5 rounded-3xl flex flex-col items-end">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Annual Template Gross</p>
           <p className="text-3xl font-black text-primary tracking-tighter italic">₹ {totalAmount.toLocaleString()}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Section 1: Template Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 ring-1 ring-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
            <input 
              type="text"
              placeholder="e.g. Grade 10 - Standard 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-primary" /> Select session
            </label>
            <select 
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">Year</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Layout className="w-3 h-3 text-primary" /> Grade / Class
            </label>
            <select 
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-4 focus:ring-primary/5 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="">Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Section 2: Modular Components Builder */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-6">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                   <Settings className="w-4 h-4" />
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight italic">Fee Component Assembly</h4>
             </div>
             <button 
                type="button"
                onClick={addComponent}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all border border-primary/10"
             >
                <Plus className="w-3 h-3" /> Add Charge Hook
             </button>
          </div>

          <AnimatePresence initial={false}>
            {formData.components.map((comp, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="grid grid-cols-12 gap-3 items-end p-4 bg-white border border-slate-100 rounded-3xl hover:border-primary/30 transition-all group"
              >
                <div className="col-span-4 space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Component Head</label>
                   <select 
                     value={comp.componentId}
                     onChange={(e) => updateComponent(idx, { componentId: e.target.value })}
                     className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs"
                   >
                     <option value="">Select Fee</option>
                     {masters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                </div>

                <div className="col-span-3 space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Schedule</label>
                   <select 
                     value={comp.scheduleType}
                     onChange={(e) => updateComponent(idx, { scheduleType: e.target.value })}
                     className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs text-slate-500"
                   >
                     <option value="ONE_TIME">One-Time (Session Start)</option>
                     <option value="TERM">Term-wise (Waterfall)</option>
                     <option value="MONTHLY">Monthly Billing</option>
                   </select>
                </div>

                <div className="col-span-4 space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Amount</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₹</span>
                      <input 
                        type="number"
                        value={comp.amount}
                        onChange={(e) => updateComponent(idx, { amount: e.target.value })}
                        className="w-full h-12 pl-8 pr-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-primary text-sm"
                      />
                   </div>
                </div>

                <div className="col-span-1 pb-1">
                   <button 
                     type="button" 
                     onClick={() => removeComponent(idx)}
                     className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {formData.components.length === 0 && (
             <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
                <Info className="w-6 h-6 mb-2 opacity-30" />
                <p className="text-[10px] font-black uppercase tracking-widest">No components added to this template</p>
             </div>
          )}
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex items-center gap-3 text-xs font-bold text-rose-700">
             <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </motion.div>
        )}

        <div className="flex gap-4 pt-4">
           <button 
             type="submit" 
             disabled={loading}
             className="flex-1 bg-slate-900 text-white rounded-3xl py-6 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Hard-Lock Template Structure</>}
           </button>
           <button 
             type="button" 
             onClick={onCancel}
             className="px-8 bg-slate-50 text-slate-400 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
           >
             Dismiss
           </button>
        </div>
      </form>
    </motion.div>
  );
}
