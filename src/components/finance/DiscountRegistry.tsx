"use client";

import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Edit3,
  X,
  ShieldCheck,
  Percent,
  Banknote
} from "lucide-react";
import { 
  getDiscountTypesAction, 
  upsertDiscountTypeAction, 
  toggleDiscountTypeStatusAction 
} from "@/lib/actions/finance-actions";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/fee-utils";

export function DiscountRegistry() {
  const [discountTypes, setDiscountTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    percentage: "",
    type: "FIXED" as "FIXED" | "PERCENT"
  });

  const loadRegistry = async () => {
    setLoading(true);
    const res = await getDiscountTypesAction();
    if (res.success) setDiscountTypes(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await upsertDiscountTypeAction({
      id: editingId || undefined,
      name: formData.name,
      description: formData.description,
      amount: formData.type === "FIXED" ? Number(formData.amount) : undefined,
      percentage: formData.type === "PERCENT" ? Number(formData.percentage) : undefined,
    });

    if (res.success) {
      setShowAddModal(false);
      setEditingId(null);
      setFormData({ name: "", description: "", amount: "", percentage: "", type: "FIXED" });
      loadRegistry();
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleDiscountTypeStatusAction(id, !currentStatus);
    if (res.success) loadRegistry();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Institutional Discount Registry</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">
            Predefined logic for authorized fee concessions
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", description: "", amount: "", percentage: "", type: "FIXED" });
            setShowAddModal(true);
          }}
          className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" /> Define New Discount
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[2.5rem] animate-pulse" />
          ))
        ) : discountTypes.length === 0 ? (
          <div className="col-span-full py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-6 shadow-sm"><Zap className="w-8 h-8" /></div>
             <h3 className="text-xl font-black text-slate-900 mb-1">No Disounts Registered</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start by defining your institutional scholarship rules</p>
          </div>
        ) : (
          discountTypes.map((dt) => (
            <div key={dt.id} className={cn("bg-white p-8 rounded-[2.5rem] border-2 transition-all relative group", dt.isActive ? "border-slate-50 hover:border-slate-100 hover:shadow-xl" : "border-slate-50 opacity-60")}>
               <div className="flex items-center justify-between mb-6">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", dt.percentage ? "bg-violet-50 text-violet-500" : "bg-emerald-50 text-emerald-500")}>
                     {dt.percentage ? <Percent className="w-6 h-6" /> : <Banknote className="w-6 h-6" />}
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={() => {
                           setEditingId(dt.id);
                           setFormData({
                              name: dt.name,
                              description: dt.description || "",
                              amount: dt.amount?.toString() || "",
                              percentage: dt.percentage?.toString() || "",
                              type: dt.percentage ? "PERCENT" : "FIXED"
                           });
                           setShowAddModal(true);
                        }}
                        className="w-8 h-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
                     >
                        <Edit3 className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleToggle(dt.id, dt.isActive)} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", dt.isActive ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500")}>
                        {dt.isActive ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                     </button>
                  </div>
               </div>

               <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-2">{dt.name}</h4>
               <p className="text-xs font-medium text-slate-400 line-clamp-2 mb-6 h-8">{dt.description || "No description provided."}</p>

               <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Value Applied</p>
                     <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                        {dt.percentage ? `${dt.percentage}%` : formatCurrency(dt.amount)}
                     </p>
                  </div>
                  <div className={cn("px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest", dt.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                     {dt.isActive ? "Active Policy" : "Deactivated"}
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* 🏛️ ADD / EDIT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20"><ShieldCheck className="w-6 h-6" /></div>
                    <div>
                       <h3 className="text-2xl font-black tracking-tight text-slate-900">{editingId ? "Update Policy" : "New Discount Policy"}</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sovereign Financial Rule Definition</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Policy Name</label>
                    <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Merit Scholarship" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-slate-900 transition-all" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Calculation Type</label>
                       <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-slate-900 transition-all">
                          <option value="FIXED">Fixed Amount (₹)</option>
                          <option value="PERCENT">Percentage (%)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Value</label>
                       <input required type="number" step="any" value={formData.type === "FIXED" ? formData.amount : formData.percentage} onChange={e => setFormData({ ...formData, [formData.type === "FIXED" ? "amount" : "percentage"]: e.target.value })} placeholder="0.00" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-slate-900 transition-all" />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Who is eligible for this discount?" className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:border-slate-900 transition-all min-h-[100px]" />
                 </div>

                 <button disabled={saving} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 mt-4">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingId ? "Update Policy" : "Deploy Policy")}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
