"use client";

import React, { useState, useEffect } from "react";
import { 
  getFeeComponentMaster, 
  upsertFeeComponentMaster, 
  deleteFeeComponentMasterAction,
  toggleFeeComponentStatusAction
} from "@/lib/actions/fee-actions";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { 
  motion, 
  AnimatePresence 
} from "framer-motion";
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Layout, 
  Zap, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2,
  BookOpen,
  Bus,
  Trophy,
  Users,
  ShieldCheck,
  X,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * FeeMasterHub
 * 
 * Integrated Institutional Fee Registry.
 * Allows Principal/Owner to define standalone fees (Library, Admission, Sports, etc.)
 * with standard pricing.
 */
export function FeeMasterHub() {
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "ANCILLARY" as any,
    amount: 0,
    description: "",
    isOneTime: false,
    isRefundable: false,
    accountCode: "",
    isActive: true
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getFeeComponentMaster();
      if (res.success) {
        setMasters(res.data);
      } else {
        setMessage({ type: "error", text: "Registry Sync Failure: " + res.error });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Runtime Collision: " + err.message });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      amount: Number(item.amount) || 0,
      description: item.description || "",
      isOneTime: !!item.isOneTime,
      isRefundable: !!item.isRefundable,
      accountCode: item.accountCode || "",
      isActive: item.isActive ?? true
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will only work if the fee is not currently assigned to any student or template.`)) return;
    
    const res = await deleteFeeComponentMasterAction(id);
    if (res.success) {
      setMessage({ type: "success", text: "Fee category removed successfully." });
      fetchData();
    } else {
      setMessage({ type: "error", text: res.error });
    }
  };
  
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const res = await toggleFeeComponentStatusAction(id, !currentStatus);
    if (res.success) {
      fetchData();
    } else {
      setMessage({ type: "error", text: res.error });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await upsertFeeComponentMaster({
      id: editingItem?.id,
      ...formData
    });

    if (res.success) {
      setMessage({ type: "success", text: `Fee category ${editingItem ? 'updated' : 'created'} successfully.` });
      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: "", type: "ANCILLARY", amount: 0, description: "", isOneTime: false, isRefundable: false, accountCode: "", isActive: true });
      fetchData();
    } else {
      setMessage({ type: "error", text: res.error });
    }
    setLoading(false);
  };

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("library")) return BookOpen;
    if (n.includes("transport") || n.includes("bus")) return Bus;
    if (n.includes("sports") || n.includes("activity")) return Trophy;
    if (n.includes("admission")) return Users;
    return ShieldCheck;
  };

  return (
    <div className="space-y-10 pb-20">
      {/* 🏛️ HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Institutional Fee Registry</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic flex items-center gap-2">
             <Zap className="w-3 h-3 text-primary animate-pulse" /> Institutional Ancillary & Admission Controls
          </p>
        </div>

        <button 
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          className="px-8 py-5 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus className="w-5 h-5" /> Register New Category
        </button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className={cn("p-5 rounded-[2rem] border-2 flex items-center gap-4 text-[11px] font-black uppercase tracking-tight", 
              message.type === "success" ? "bg-emerald-50 border-emerald-100/50 text-emerald-800" : "bg-rose-50 border-rose-100/50 text-rose-800"
            )}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100">DISMISS</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 REGISTRY GRID */}
      {loading && masters.length === 0 ? (
        <div className="py-40 flex flex-col items-center justify-center opacity-20">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Master Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {masters.map((m) => {
            const Icon = getIcon(m.name);
            return (
              <motion.div 
                key={m.id}
                layout
                className="bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col justify-between group h-full relative overflow-hidden"
              >
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none group-hover:scale-125 duration-700">
                  <Icon className="w-32 h-32" />
                </div>

                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-2xl", 
                      m.type === "ANCILLARY" ? "bg-blue-50 text-blue-500" : 
                      m.type === "CORE" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleToggleActive(m.id, m.isActive)} 
                        title={m.isActive ? "Hide from Admission" : "Show in Admission"}
                        className={cn("p-2 transition-colors", m.isActive ? "text-slate-300 hover:text-primary" : "text-amber-500 hover:text-amber-600")}
                      >
                        {m.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEdit(m)} className="p-2 text-slate-300 hover:text-primary transition-colors"><Settings2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m.id, m.name)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <h4 className="text-xl font-black text-slate-900 tracking-tighter mb-1 line-clamp-1">{m.name}</h4>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">{m.type} CATEGORY</p>
                  
                  {m.description && (
                    <p className="text-[10px] font-medium text-slate-500 mb-6 line-clamp-2 leading-relaxed italic pr-4">
                      "{m.description}"
                    </p>
                  )}

                  <div className="p-5 bg-slate-50 rounded-[2.5rem] border border-slate-100 inline-block w-full mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Price</p>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{formatCurrency(m.amount || 0)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {m.isOneTime && <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase tracking-tight border border-amber-100/50">One-Time Only</span>}
                  {m.isRefundable && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-tight border border-emerald-100/50">Refundable</span>}
                  {!m.isActive && <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-tight border border-slate-200 bg-slate-50">Hidden</span>}
                  <span className="ml-auto text-[8px] font-black text-slate-300 uppercase italic">v3.1</span>
                </div>
              </motion.div>
            );
          })}

          {/* New Fee Ghost Trigger */}
          <button 
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="group border-2 border-dashed border-slate-200 p-8 rounded-[3rem] hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 active:scale-95"
          >
            <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="w-8 h-8 text-slate-300 group-hover:text-primary transition-colors" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors italic">Register Category</p>
          </button>
        </div>
      )}

      {/* 🛠️ EDITOR MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xl rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] border-4 border-white relative overflow-hidden"
            >
              {/* Modal Background Detail */}
              <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none rotate-12">
                <Settings2 className="w-64 h-64" />
              </div>

              <div className="p-10 lg:p-14">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                      {editingItem ? "Refine Mastery" : "Standard Registry"}
                    </h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">Institutional Fee Definition</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fee Category Name</label>
                       <input 
                         required
                         value={formData.name}
                         onChange={(e) => {
                           const val = e.target.value;
                           if (val.toLowerCase().includes("tuition")) {
                             alert("Note: Tuition Fees should be managed in the 'Class Fee Structure' module. This registry is for ancillary items like Transport, Library, etc.");
                           }
                           setFormData({...formData, name: val});
                         }}
                         placeholder="e.g. Admission Fee"
                         className="w-full h-16 px-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-black text-slate-700 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Standard Price (₹)</label>
                       <input 
                         type="number"
                         required
                         value={formData.amount}
                         onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                         placeholder="500"
                         className="w-full h-16 px-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-black text-slate-700 transition-all"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fee Classification</label>
                       <select 
                         value={formData.type}
                         onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                         className="w-full h-16 px-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-black text-slate-700 transition-all appearance-none italic"
                       >
                         <option value="ANCILLARY">ANCILLARY (Standard Upgrade)</option>
                         <option value="CORE">CORE (System Essential)</option>
                         <option value="PENALTY">PENALTY (Governance)</option>
                         <option value="DEPOSIT">DEPOSIT (Security)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Internal Account Code</label>
                       <input 
                         value={formData.accountCode}
                         onChange={(e) => setFormData({...formData, accountCode: e.target.value})}
                         placeholder="ACC-LIB-01"
                         className="w-full h-16 px-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-black text-slate-700 transition-all"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Brief Policy Description</label>
                       <textarea 
                         value={formData.description}
                         onChange={(e) => setFormData({...formData, description: e.target.value})}
                         placeholder="Describe the usage or terms of this fee category..."
                         className="w-full h-32 p-8 rounded-3xl bg-slate-50 border-2 border-slate-50 focus:border-primary/20 focus:bg-white outline-none font-medium text-slate-600 transition-all resize-none italic"
                       />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isOneTime: !formData.isOneTime})}
                      className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center border-2", 
                        formData.isOneTime ? "bg-amber-900 text-white border-amber-900" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50")}
                    >
                      {formData.isOneTime ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 opacity-40" />}
                      Life-Cycle One-Time
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isRefundable: !formData.isRefundable})}
                      className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center border-2", 
                        formData.isRefundable ? "bg-emerald-900 text-white border-emerald-900" : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50")}
                    >
                      {formData.isRefundable ? <CheckCircle2 className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 opacity-40" />}
                      Refundable Deposit
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                      className={cn("px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center border-2", 
                        formData.isActive ? "bg-primary text-white border-primary" : "bg-rose-50 text-rose-500 border-rose-100")}
                    >
                      {formData.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {formData.isActive ? "Active in Admission" : "Hidden from Admission"}
                    </button>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-primary transition-all flex items-center justify-center gap-4 active:scale-95 shadow-2xl shadow-slate-200"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
                      Finalize Registry Entry
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
