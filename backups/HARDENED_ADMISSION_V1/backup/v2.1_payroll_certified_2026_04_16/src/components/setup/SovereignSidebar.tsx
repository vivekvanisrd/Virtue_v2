"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  Building, 
  Globe, 
  BookOpen, 
  Zap,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SovereignSidebarProps {
  activeSection: string;
  shortCode: string;
}

/**
 * 🏛️ SOVEREIGN SIDEBAR v3.0 (Developer-Prime)
 * 
 * High-density indigo command rail for the Genesis Factory.
 * Features institutional steps as jump-anchors and the Identity Live-Morph preview.
 */
export const SovereignSidebar: React.FC<SovereignSidebarProps> = ({ 
  activeSection,
  shortCode
}) => {
  const steps = [
    { id: "basic", label: "BASIC IDENTITY", icon: Building },
    { id: "compliance", label: "COMPLIANCE LAYER", icon: Shield },
    { id: "regional", label: "REGIONAL SETTINGS", icon: Globe },
    { id: "academic", label: "ACADEMIC SETUP", icon: BookOpen },
    { id: "finalize", label: "FINALIZE NODE", icon: Zap },
  ];

  return (
    <div className="h-full bg-[#4F46E5] flex flex-col p-10 text-white relative overflow-hidden">
      {/* Background Pulse */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />

      {/* Header Identity */}
      <div className="mb-20 relative z-10">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-xl">
          <Zap className="w-8 h-8 fill-white/20" />
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter leading-none">
          PAVA-EDUX <span className="text-sm font-bold opacity-60 not-italic ml-1">v3.0</span>
        </h1>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.3em] mt-2">Genesis Factory</p>
      </div>

      {/* Zero-Gate Navigation Rail */}
      <div className="flex-1 space-y-10 relative z-10">
        {steps.map((step) => {
          const isActive = activeSection === step.id;
          return (
            <a
              key={step.id}
              href={`#${step.id}`}
              className={cn(
                "flex items-center gap-6 group no-underline transition-all duration-300",
                isActive ? "opacity-100 scale-105" : "opacity-40 hover:opacity-80"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-inner",
                isActive ? "bg-white text-primary" : "bg-white/10"
              )}>
                <step.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-black tracking-widest uppercase">
                {step.label}
              </span>
            </a>
          );
        })}
      </div>

      {/* 🧬 Identity Live-Morph Box */}
      <motion.div 
        layout
        className="mt-auto p-8 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] relative z-10 shadow-2xl"
      >
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-4">
            Tenant Identity Preview
        </div>
        <div className="text-2xl font-black italic tracking-tighter text-white truncate group">
            {shortCode?.toUpperCase() || "???"}-<span className="text-white/40 group-hover:text-white transition-colors uppercase">MAIN</span>
        </div>
      </motion.div>
    </div>
  );
};
