"use client";

import React from "react";
import { useUI } from "@/providers/ui-provider";
import { themes } from "@/lib/themes/registry";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Type, Palette, Check, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeCustomizer() {
  const { theme, setTheme, fontScale, setFontScale } = useUI();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-muted hover:bg-muted/80 rounded-xl lg:rounded-2xl transition-all group"
        title="UI Customizer"
      >
        <Settings className={cn("w-5 h-5 text-foreground opacity-50 group-hover:text-primary transition-all", isOpen && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-72 bg-background/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 bg-muted/50 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black text-foreground uppercase tracking-wider">UI Preferences</span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Theme Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-foreground opacity-50 font-black text-[10px] uppercase tracking-widest">
                    <Monitor className="w-3.5 h-3.5" />
                    Color themes
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                          theme.id === t.id 
                            ? "bg-primary/5 border-primary/20 ring-1 ring-primary/10" 
                            : "bg-background border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1">
                            <div 
                              className="w-3 h-3 rounded-full border border-black/10 shadow-inner z-20"
                              style={{ backgroundColor: t.colors["--primary"] }}
                            />
                            <div 
                              className="w-3 h-3 rounded-full border border-black/10 shadow-inner z-10"
                              style={{ backgroundColor: t.colors["--accent"] }}
                            />
                          </div>
                          <span className={cn(
                            "text-foreground opacity-60 font-bold transition-colors"
                          )}>
                            {t.name}
                          </span>
                        </div>
                        {theme.id === t.id && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Scale Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-foreground opacity-50 font-black text-[10px] uppercase tracking-widest">
                    <Type className="w-3.5 h-3.5" />
                    UI Scaling
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-xl border border-border">
                    {[
                      { label: "Compact", scale: 0.9 },
                      { label: "Normal", scale: 1.0 },
                      { label: "Large", scale: 1.15 }
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setFontScale(s.scale)}
                        className={cn(
                          "py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                          fontScale === s.scale 
                            ? "bg-white text-primary shadow-sm border border-slate-100" 
                            : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                    Adjust text size and dashboard density
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                  Virtue V2 • Design Systems
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
