"use client";

import React, { useState } from "react";
import { HelpCircle, ArrowRight, Sparkles } from "lucide-react";

interface ActionTooltipProps {
  children: React.ReactNode;
  title: string;
  description: string;
  whatHappensNext: string;
  position?: "top" | "bottom" | "left" | "right";
  badgeText?: string;
  className?: string;
}

export function ActionTooltip({
  children,
  title,
  description,
  whatHappensNext,
  position = "top",
  badgeText = "System Guidance",
  className = ""
}: ActionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case "bottom":
        return "top-full mt-2 left-1/2 -translate-x-1/2";
      case "left":
        return "right-full mr-2 top-1/2 -translate-y-1/2";
      case "right":
        return "left-full ml-2 top-1/2 -translate-y-1/2";
      case "top":
      default:
        return "bottom-full mb-2 left-1/2 -translate-x-1/2";
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case "bottom":
        return "-top-1.5 left-1/2 -translate-x-1/2 border-t-0 border-r border-b border-l-0 border-slate-800 bg-slate-900";
      case "left":
        return "-right-1.5 top-1/2 -translate-y-1/2 border-t border-r border-b-0 border-l-0 border-slate-800 bg-slate-900";
      case "right":
        return "-left-1.5 top-1/2 -translate-y-1/2 border-t-0 border-r-0 border-b border-l border-slate-800 bg-slate-900";
      case "top":
      default:
        return "-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-r border-b border-l-0 border-slate-800 bg-slate-900";
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div 
          className={`absolute z-[9999] w-72 p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${getPositionClasses()}`}
        >
          {/* Arrow */}
          <div className={`absolute w-3 h-3 rotate-45 ${getArrowClasses()}`} />

          {/* Tooltip Content */}
          <div className="space-y-2 text-left relative z-10">
            {/* Header Badge & Title */}
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
              <span className="text-[7px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                {badgeText}
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Title & Description */}
            <div>
              <h5 className="text-xs font-black text-white tracking-tight leading-snug">{title}</h5>
              <p className="text-[10px] text-slate-300 font-medium leading-relaxed mt-0.5">{description}</p>
            </div>

            {/* What Will Happen Next */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-start gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 block">
                    What Will Happen Next:
                  </span>
                  <p className="text-[9.5px] font-semibold text-emerald-200 leading-tight mt-0.5">
                    {whatHappensNext}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
