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
  Calendar 
} from "lucide-react";
import { 
  getAvailableClasses, 
  getAcademicYears, 
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
 * FeeStructureForm
 * 
 * Specialized form for creating and updating Fee Templates.
 * Manages the relationship between Academics (Class/Year) and Finance (Total Amount).
 */
export function FeeStructureForm({ initialData, onSuccess, onCancel }: FeeStructureFormProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || "",
    classId: initialData?.classId || "",
    academicYearId: initialData?.academicYearId || "",
    totalAmount: initialData?.totalAmount || ""
  });

  const { setTabDirty } = useTabs();

  // --- WORKSPACE GUARD (isDirty) ---
  useEffect(() => {
    const isDirty = formData.name !== (initialData?.name || "") ||
                  formData.classId !== (initialData?.classId || "") ||
                  formData.academicYearId !== (initialData?.academicYearId || "") ||
                  formData.totalAmount !== (initialData?.totalAmount || "");
    
    setTabDirty("fee-manager", isDirty);
    return () => setTabDirty("fee-manager", false);
  }, [formData, initialData, setTabDirty]);

  useEffect(() => {
    async function init() {
      const [clsRes, yrRes] = await Promise.all([
        getAvailableClasses(),
        getAcademicYears()
      ]);
      if (clsRes.success) setClasses(clsRes.data);
      if (yrRes.success) setYears(yrRes.data);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.classId || !formData.academicYearId || !formData.totalAmount) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError(null);
    
    const res = await upsertFeeStructure({
      ...formData,
      totalAmount: Number(formData.totalAmount)
    });

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || "Failed to save fee structure.");
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50"
    >
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group">
          <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            {formData.id ? "Edit Structure Template" : "New Fee Architecture"}
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Setting the Baseline for Academic Dues
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Structure Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Template Name</label>
            <input 
              type="text"
              placeholder="e.g. Grade 10 - Standard Annual Fees"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-primary/20 transition-all outline-none"
            />
          </div>

          {/* Academic Year */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Target session
            </label>
            <select 
              value={formData.academicYearId}
              onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-primary/20 transition-all outline-none appearance-none"
            >
              <option value="">Select Year</option>
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>

          {/* Class Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Layout className="w-3 h-3" /> Grade / Class
            </label>
            <select 
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-primary/20 transition-all outline-none appearance-none"
            >
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Annual Amount (Gross)</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
              <input 
                type="number"
                placeholder="50,000"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-10 pr-6 py-4 font-black text-primary text-xl focus:bg-white focus:border-emerald-200 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0 }}
               className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold text-rose-700"
            >
               <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 pt-4">
           <button 
             type="submit" 
             disabled={loading}
             className="flex-1 bg-slate-900 text-white rounded-2xl py-5 font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
           >
             {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Finalize Structure</>}
           </button>
           <button 
             type="button" 
             onClick={onCancel}
             className="px-8 bg-slate-50 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
           >
             Dismiss
           </button>
        </div>
      </form>
    </motion.div>
  );
}
