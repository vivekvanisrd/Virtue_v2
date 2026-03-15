"use client";
import React from "react";
import { Package } from "lucide-react";

export function GenericModule({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <p className="text-slate-500 font-medium mt-1">{description || `Modern ${title} management module`}</p>
        </div>
      </div>

      <div className="bg-white p-20 rounded-[48px] border border-slate-100 premium-shadow flex flex-col items-center justify-center text-center">
         <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center mb-8 text-primary/40">
            <Package className="w-12 h-12" />
         </div>
         <h3 className="text-2xl font-bold text-slate-800 mb-4 tracking-tight">{title} Module Ready</h3>
         <p className="text-slate-400 max-w-md mx-auto font-medium">
            This module is being modernized for Virtue V2. Data layers for {title} will be connected in Phase 8.
         </p>
         <button className="mt-10 px-8 py-3 bg-slate-50 text-slate-400 rounded-2xl font-bold italic cursor-not-allowed">
            Feature Locked for Rebuild
         </button>
      </div>
    </div>
  );
}
