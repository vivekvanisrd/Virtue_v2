"use client";

import React, { useState, useTransition } from "react";
import { Globe, ChevronDown, Check, X, Search, School } from "lucide-react";
import { cn } from "@/lib/utils";
import { setSchoolContext, clearSchoolContext } from "@/lib/actions/tenant-actions";
import { motion, AnimatePresence } from "framer-motion";

interface School {
  id: string;
  name: string;
}

interface GlobalSchoolSelectorProps {
  schools: School[];
  currentSchoolId: string | null;
  onSelect?: (schoolId: string | null) => void;
}

export default function GlobalSchoolSelector({ schools, currentSchoolId, onSelect }: GlobalSchoolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentSchool = schools.find(s => s.id === currentSchoolId);
  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (schoolId: string | null) => {
    startTransition(async () => {
      if (schoolId) {
        await setSchoolContext(schoolId);
      } else {
        await clearSchoolContext();
      }
      setIsOpen(false);
      if (onSelect) onSelect(schoolId);
    });
  };

  return (
    <div className="relative z-50">
      {/* 🔮 TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2 bg-white border rounded-2xl transition-all active:scale-95 hover:bg-slate-50 shadow-sm hover:shadow-md",
          currentSchoolId ? "border-blue-500/50 ring-1 ring-blue-500/10" : "border-slate-200"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
          currentSchoolId ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
        )}>
          <Globe className={cn("w-4 h-4", isPending && "animate-spin")} />
        </div>
        
        <div className="text-left hidden md:block">
           <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {currentSchoolId ? "Active Context" : "Global Registry"}
           </div>
           <div className="text-xs font-black text-slate-900 max-w-[150px] truncate uppercase tracking-tighter">
             {currentSchool?.name || "All Schools"}
           </div>
        </div>

        <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* 🚀 DROPDOWN PANEL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-3 right-0 w-[300px] bg-white border border-slate-200 rounded-[2rem] shadow-2xl backdrop-blur-xl p-2 overflow-hidden"
          >
            {/* Search bar */}
            <div className="relative mb-2">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
               <input 
                 autoFocus
                 type="text"
                 placeholder="Search registry..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-[11px] text-slate-900 placeholder:text-slate-300 focus:ring-1 focus:ring-blue-100 transition-all font-bold"
               />
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1 p-1">
              {/* Reset Option */}
              <button 
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-2xl transition-all group",
                  !currentSchoolId ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-body transition-colors">
                      <Globe className="w-3.5 h-3.5" />
                   </div>
                   <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-widest">Global View</div>
                      <div className="text-[9px] opacity-40">Access all tenants simultaneously</div>
                   </div>
                </div>
                {!currentSchoolId && <Check className="w-4 h-4 text-blue-500" />}
              </button>

              <div className="h-px bg-slate-100 my-2 mx-3" />

              {filteredSchools.map((school) => (
                <button 
                  key={school.id}
                  onClick={() => handleSelect(school.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl transition-all group text-left",
                    currentSchoolId === school.id ? "bg-blue-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                     <div className={cn(
                       "p-2 rounded-lg transition-colors",
                       currentSchoolId === school.id ? "bg-blue-100/50 text-blue-600" : "bg-slate-100 group-hover:bg-slate-200"
                     )}>
                        <School className="w-3.5 h-3.5" />
                     </div>
                     <div className="text-left overflow-hidden">
                        <div className="text-[10px] font-black uppercase tracking-widest truncate">{school.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono italic uppercase tracking-tighter">{school.id}</div>
                     </div>
                  </div>
                  {currentSchoolId === school.id && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}

              {filteredSchools.length === 0 && (
                <div className="p-8 text-center space-y-2 opacity-30">
                   <X className="w-8 h-8 mx-auto" />
                   <div className="text-[10px] font-black uppercase tracking-[0.2em]">No Matches</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
