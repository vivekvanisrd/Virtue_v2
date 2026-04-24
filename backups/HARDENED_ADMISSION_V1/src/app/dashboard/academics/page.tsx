"use client";

import AcademicArchitectHub from "@/components/academics/AcademicArchitectHub";
import { GraduationCap, ShieldCheck } from "lucide-react";

/**
 * 🎓 ACADEMIC ARCHITECT HUB (v1.0)
 * 
 * The mission control for institutional grade levels, sections, 
 * and classroom leadership.
 */
export default function AcademicArchitectPage() {
    return (
        <div className="min-h-screen bg-slate-50/30">
            {/* 🏰 Global Context Header */}
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto px-8 h-24 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200 scale-105">
                            <GraduationCap className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Academic Architect</h1>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-primary" />
                                Sovereign Governance Engine
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="py-8">
                <AcademicArchitectHub />
            </main>
        </div>
    );
}
