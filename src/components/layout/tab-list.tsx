"use client";

import React from "react";
import { useTabs } from "@/context/tab-context";
import { X, AppWindow, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function TabList() {
  const { tabs, activeTabId, setActiveTabId, closeTab, closeAllTabs } = useTabs();
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [warningId, setWarningId] = React.useState<string | null>(null);
  const [confirmingCloseAll, setConfirmingCloseAll] = React.useState(false);
  const [showDiscardModal, setShowDiscardModal] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const handleCloseAttempt = (e: React.MouseEvent, tab: any) => {
    e.stopPropagation();
    
    if (tab.isDirty) {
      setPendingId(tab.id);
      setShowDiscardModal(true);
      setConfirmingId(null);
      setWarningId(null);
      return;
    }

    // Clean tab: direct to confirmation
    setConfirmingId(tab.id);
    setWarningId(null);
  };

  const handleConfirmClose = (id: string) => {
    closeTab(id, true); // Force true because we've already confirmed in UI
    setConfirmingId(null);
  };

  const handleClearWorkspace = () => {
    const cleanTabs = tabs.filter(t => !t.isDirty && t.id !== "overview");
    if (cleanTabs.length === 0) {
      closeAllTabs(true);
      setConfirmingCloseAll(false);
      return;
    }
    setConfirmingCloseAll(true);
  };

  return (
    <div className="flex items-center bg-background/50 backdrop-blur-sm border-b border-border h-12 sticky top-16 z-40">
      <div className="flex-1 flex items-center gap-1.5 px-4 lg:px-8 overflow-x-auto no-scrollbar whitespace-nowrap scroll-smooth h-full">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            const isDashboard = tab.id === "overview";
            const isConfirming = confirmingId === tab.id;
            const isWarning = warningId === tab.id;

            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => {
                  setActiveTabId(tab.id);
                  setConfirmingId(null);
                  setWarningId(null);
                }}
                className={cn(
                  "group relative min-w-[140px] max-w-[220px] h-9 px-4 rounded-t-xl flex items-center justify-between cursor-pointer transition-all border-x border-t",
                  isActive 
                    ? "bg-white border-border text-primary z-10 shadow-sm" 
                    : "bg-muted/50 border-transparent text-foreground opacity-50 hover:bg-muted",
                  tab.isDirty && "border-amber-200 bg-amber-50/40",
                  isConfirming && "bg-rose-50 border-rose-200",
                  isWarning && "bg-amber-100 border-amber-300 animate-shake"
                )}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {tab.isDirty ? (
                    <div className="relative">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <div className="absolute inset-0 bg-amber-400 blur-sm rounded-full opacity-20 animate-pulse" />
                    </div>
                  ) : tab.icon ? (
                    <tab.icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-foreground opacity-50")} />
                  ) : (
                    <AppWindow className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-foreground opacity-50")} />
                  )}
                  <span className={cn(
                    "text-xs font-bold tracking-tight truncate transition-colors",
                    tab.isDirty ? "text-amber-800 font-black" : "",
                    isConfirming ? "text-rose-600" : ""
                  )}>
                    {isConfirming ? "Confirm Close?" : tab.title}
                  </span>
                </div>

                {/* Intelligent Close Button */}
                {!isDashboard && (
                  <div className="flex items-center gap-1">
                    {isConfirming ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConfirmClose(tab.id);
                        }}
                        className="p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleCloseAttempt(e, tab)}
                        className={cn(
                          "p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all",
                          tab.isDirty && "opacity-100 text-amber-500"
                        )}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {isActive && (
                  <motion.div 
                     layoutId="active-tab-indicator"
                     className={cn(
                       "absolute -bottom-[1px] left-0 right-0 h-0.5",
                       tab.isDirty ? "bg-amber-500" : isConfirming ? "bg-rose-500" : "bg-primary"
                     )}
                 />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Close All Button (Custom Guarded Action) */}
      {tabs.length > 1 && (
        <div className="flex items-center px-4 border-l border-border h-full bg-background/20 backdrop-blur-sm">
           <button 
              onClick={() => {
                if (confirmingCloseAll) {
                  closeAllTabs(true);
                  setConfirmingCloseAll(false);
                } else {
                  handleClearWorkspace();
                }
              }}
              onMouseLeave={() => setTimeout(() => setConfirmingCloseAll(false), 3000)}
              className={cn(
                "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border",
                confirmingCloseAll 
                  ? "bg-rose-600 text-white border-rose-700 shadow-inner" 
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100"
              )}
           >
              <Trash2 className="w-3 h-3" />
              <span className="text-[9px] font-black uppercase tracking-wider hidden md:inline">
                {confirmingCloseAll ? "Confirm Reset?" : "Close All"}
              </span>
           </button>
        </div>
      )}
      {/* Discard Confirmation Modal */}
      <AnimatePresence>
        {showDiscardModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiscardModal(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-background border border-border shadow-2xl rounded-3xl p-6 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 mb-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-foreground tracking-tight leading-tight">Discard Unsaved Changes?</h3>
                  <p className="text-xs font-medium text-foreground opacity-60 px-4">
                    The tab <span className="text-amber-600 font-bold">"{tabs.find(t => t.id === pendingId)?.title}"</span> has unsaved data. Closing it will permanently erase your progress.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2 pt-4">
                  <button 
                    onClick={() => {
                      if (pendingId) {
                        closeTab(pendingId, true);
                        setPendingId(null);
                        setShowDiscardModal(false);
                      }
                    }}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200"
                  >
                    Discard & Close Tab
                  </button>
                  <button 
                    onClick={() => setShowDiscardModal(false)}
                    className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Keep Editing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
