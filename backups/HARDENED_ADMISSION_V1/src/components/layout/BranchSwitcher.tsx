"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, Building2, Globe } from "lucide-react";
import { setActiveBranchAction } from "@/lib/actions/tenancy-actions";
import { cn } from "@/lib/utils";

interface Branch {
    id: string;
    name: string;
    code: string;
}

interface BranchSwitcherProps {
    branches: Branch[];
    activeBranchId?: string;
}

export function BranchSwitcher({ branches, activeBranchId }: BranchSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const activeBranch = branches.find(b => b.id === activeBranchId);

    async function handleSwitch(branchId: string) {
        if (branchId === activeBranchId) {
            setIsOpen(false);
            return;
        }

        setIsPending(true);
        const res = await setActiveBranchAction(branchId);
        if (res.success) {
            window.location.reload(); // Refresh the full context
        } else {
            alert("Failed to switch context: " + res.error);
            setIsPending(false);
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending}
                className={cn(
                    "flex items-center gap-3 px-3 py-1.5 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all group",
                    isPending && "opacity-50 cursor-wait"
                )}
            >
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">
                        Campus Selector
                    </p>
                    <p className="text-[11px] font-bold text-slate-700 leading-none">
                        {activeBranch ? activeBranch.name : "Global Registry"}
                    </p>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-300 transition-transform ml-1", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-3 py-2 mb-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Select Branch</p>
                        </div>
                        
                        <button
                            onClick={() => handleSwitch("GLOBAL")}
                            className={cn(
                                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left",
                                activeBranchId === "GLOBAL" || !activeBranchId 
                                    ? "bg-primary/5 text-primary" 
                                    : "hover:bg-slate-50 text-slate-600"
                            )}
                        >
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-bold font-sans">All Branches (Global)</span>
                        </button>

                        <div className="h-px bg-slate-100 my-1 mx-2" />

                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            {branches.map((branch) => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleSwitch(branch.id)}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all text-left group",
                                        activeBranchId === branch.id 
                                            ? "bg-primary/5 text-primary" 
                                            : "hover:bg-slate-50 text-slate-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full transition-all",
                                        activeBranchId === branch.id ? "bg-primary scale-125" : "bg-slate-200 group-hover:bg-slate-400"
                                    )} />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold font-sans">{branch.name}</span>
                                        <span className="text-[9px] font-medium opacity-50 uppercase tracking-tighter">{branch.code}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
