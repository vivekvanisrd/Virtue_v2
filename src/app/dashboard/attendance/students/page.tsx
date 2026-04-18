"use client";

import VelocityAttendanceRunner from "@/components/attendance/VelocityAttendanceRunner";
import { Zap, ShieldCheck } from "lucide-react";

/**
 * 🎓 STUDENT ATTENDANCE HUB (v1.2)
 * 
 * The command center for the "Velocity Run" attendance engine.
 */
export default function StudentAttendancePage() {
    return (
        <div className="min-h-screen bg-zinc-950/20">
            {/* 🛠️ Context Header */}
            <div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Velocity Run</h1>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                Sovereign Institutional Guard 2026
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="py-8">
                <VelocityAttendanceRunner />
            </main>
        </div>
    );
}
