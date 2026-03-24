"use client";

import React from "react";
import { useTabs } from "@/context/tab-context";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function TabList() {
  const { tabs, activeTabId, setActiveTabId, closeTab } = useTabs();

  return (
    <div className="flex items-center gap-1.5 px-4 lg:px-8 bg-background/50 backdrop-blur-sm border-b border-border overflow-x-auto no-scrollbar h-12 whitespace-nowrap scroll-smooth">
      <AnimatePresence mode="popLayout">
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          return (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "group relative min-w-[140px] max-w-[220px] h-9 px-4 rounded-t-xl flex items-center justify-between cursor-pointer transition-all border-x border-t",
                isActive 
                  ? "bg-white border-border text-primary z-10" 
                  : "bg-muted/50 border-transparent text-foreground opacity-50 hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <tab.icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-foreground opacity-50")} />
                <span className="text-xs font-bold tracking-tight truncate">{tab.title}</span>
              </div>

              {/* Only show close button if there's more than one tab */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Active indicator bar */}
              {isActive && (
                <motion.div 
                   layoutId="active-tab-indicator"
                   className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
