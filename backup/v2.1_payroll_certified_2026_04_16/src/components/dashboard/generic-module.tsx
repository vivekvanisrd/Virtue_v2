"use client";
import React from "react";
import { Package } from "lucide-react";

export function GenericModule({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-foreground opacity-60 font-medium mt-1">{description || `Modern ${title} management module`}</p>
        </div>
      </div>

      <div className="bg-background p-20 rounded-[48px] border border-border premium-shadow flex flex-col items-center justify-center text-center">
         <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center mb-8 text-primary/40">
            <Package className="w-12 h-12" />
         </div>
         <h3 className="text-2xl font-bold text-foreground mb-4 tracking-tight">{title} Module Ready</h3>
         <p className="text-foreground opacity-50 max-w-md mx-auto font-medium">
            This module is being modernized for PaVa-EDUX. Data layers for {title} will be connected in Phase 8.
         </p>
         <button className="mt-10 px-8 py-3 bg-muted text-foreground opacity-50 rounded-2xl font-bold italic cursor-not-allowed">
            Feature Locked for Rebuild
         </button>
      </div>
    </div>
  );
}
