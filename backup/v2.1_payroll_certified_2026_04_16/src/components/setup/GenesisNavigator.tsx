"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  isValid: boolean;
  isPending: boolean;
}

interface GenesisNavigatorProps {
  sections: Section[];
  activeSection: string;
  progress: number;
}

/**
 * 🏛️ GENESIS NAVIGATOR (v2.5)
 * 
 * Sticky glassmorphism sidebar for high-fidelity institutional setup.
 * Supports click-to-jump, real-time validation icons, and progress tracking.
 */
export const GenesisNavigator: React.FC<GenesisNavigatorProps> = ({ 
  sections, 
  activeSection, 
  progress 
}) => {
  return (
    <nav className="sticky top-12 space-y-8 w-full max-w-[240px] hidden md:block">
      <div className="relative">
        {/* Progress Bar (Vertical) */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200">
          <motion.div 
            className="absolute top-0 left-0 w-full bg-primary"
            animate={{ height: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>

        <div className="space-y-6 relative">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-4 group cursor-pointer no-underline"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-white z-10",
                  isActive ? "border-primary ring-4 ring-primary/10" : "border-slate-200",
                  section.isValid ? "bg-green-500 border-green-500" : ""
                )}>
                  {section.isValid ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  ) : (
                    <Circle className="w-2 h-2 text-slate-300 fill-slate-300" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className={cn(
                    "block text-sm font-bold tracking-tight transition-colors",
                    isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-800"
                  )}>
                    {section.label}
                  </span>
                  {isActive && (
                    <motion.span 
                      layoutId="active-indicator"
                      className="block text-[10px] font-bold text-primary uppercase tracking-widest"
                    >
                      Current Phase
                    </motion.span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Persistence / Action Card */}
      <div className="p-6 bg-white/40 backdrop-blur-xl border border-white/20 rounded-[24px] shadow-sm">
        <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Readiness</span>
            <span className="text-xl font-bold text-slate-800">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
                className="h-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 60 }}
            />
        </div>
        <p className="text-[10px] text-slate-400 mt-3 italic leading-relaxed">
            Law 6: Tenancy Shield active. Verification pending final deployment trigger.
        </p>
      </div>
    </nav>
  );
};
