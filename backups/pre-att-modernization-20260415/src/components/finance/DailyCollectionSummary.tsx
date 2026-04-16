"use client";

import React, { useState, useEffect } from "react";
import { getDailyCollectionSummary } from "@/lib/actions/finance-actions";
import { 
  Banknote, 
  QrCode, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/fee-utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function DailyCollectionSummary() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    const result = await getDailyCollectionSummary();
    if (result.success) setData(result.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading && !data) {
    return (
      <div className="h-48 bg-muted/30 rounded-3xl animate-pulse flex items-center justify-center border border-border shadow-sm">
        <RefreshCcw className="w-6 h-6 text-foreground opacity-20 animate-spin" />
      </div>
    );
  }

  const modes = [
    { label: "Cash Intake", value: data?.Cash || 0, icon: Banknote, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "UPI Digital", value: data?.UPI || 0, icon: QrCode, color: "text-violet-500", bg: "bg-violet-50" },
    { label: "Cheque/Cards", value: data?.Cheque || 0, icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] border border-border shadow-xl shadow-slate-100/50 overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
      
      <div className="p-8 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground">Intake Summary</h3>
            <p className="text-[10px] font-black text-foreground opacity-40 uppercase tracking-widest leading-none">Accountant's Daily Register</p>
          </div>
        </div>
        
        <button 
          onClick={fetchSummary}
          className="p-2 hover:bg-muted rounded-xl transition-all active:rotate-180 duration-500"
        >
          <RefreshCcw className="w-4 h-4 text-foreground opacity-40" />
        </button>
      </div>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode, i) => (
            <div key={i} className={cn("p-6 rounded-3xl border border-border/50 space-y-4", mode.bg)}>
               <div className="flex items-center justify-between">
                 <div className={cn("p-2 rounded-xl bg-white shadow-sm border border-border/20", mode.color)}>
                   <mode.icon className="w-4 h-4" />
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{mode.label.split(' ')[1]}</span>
               </div>
               <div>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">{mode.label}</p>
                  <p className="text-xl font-black text-foreground">{formatCurrency(mode.value)}</p>
               </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-dashed border-border grid grid-cols-2 items-end">
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <Clock className="w-3.5 h-3.5 text-primary" />
                 <span className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Collections Recorded: <span className="text-foreground opacity-100">{data?.count || 0}</span></span>
              </div>
              <div className="flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                 <span className="text-[10px] font-black text-foreground opacity-50 uppercase tracking-widest">Audited for FY 2023-24</span>
              </div>
           </div>
           
           <div className="text-right">
              <p className="text-[10px] font-black text-foreground opacity-40 uppercase tracking-widest mb-1">Total Daily Intake</p>
              <h2 className="text-3xl font-black tracking-tighter text-foreground leading-none">
                 {formatCurrency(data?.total || 0)}
              </h2>
           </div>
        </div>
      </div>
    </motion.div>
  );
}
