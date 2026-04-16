"use client";

import React, { useState } from 'react';
import { DiamondWizard } from '@/components/setup/DiamondWizard';
import { HistorySentinel } from '@/components/setup/HistorySentinel';

/**
 * 🏛️ V12.1 SOVEREIGN SETUP WIZARD (Diamond Protocol)
 * 
 * The exclusive entry point for instutitional initialization.
 * Only accessible to OWNER role in Skeleton state.
 */
export default function SetupPage() {
    const [institutionalPulse, setInstitutionalPulse] = useState<string[]>([]);

    const addPulse = (msg: string) => {
        setInstitutionalPulse(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-[1fr_350px] gap-12 items-start">
                
                {/* Main Wizard Hub */}
                <main className="space-y-8">
                    <header className="space-y-2">
                        <h1 className="text-4xl font-light tracking-tight text-white/90">
                            Institutional <span className="font-semibold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Genesis</span>
                        </h1>
                        <p className="text-neutral-400 max-w-xl text-lg">
                            Build your institution's sovereign foundation. Follow the Diamond Protocol to initialize your campus, timeline, and academic structure.
                        </p>
                    </header>

                    <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-8 lg:p-12 shadow-2xl overflow-hidden relative group">
                        <DiamondWizard onAction={addPulse} />
                    </div>
                </main>

                {/* Live DNA Sentinel Sidebar */}
                <aside className="space-y-6 lg:sticky lg:top-12">
                   <div className="bg-neutral-900/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">Live DNA Sentinel</h3>
                        <div className="space-y-2.5 font-mono text-[11px] h-[300px] overflow-y-auto overflow-x-hidden scrollbar-hide">
                            {institutionalPulse.length === 0 ? (
                                <div className="text-neutral-700 italic">Awaiting genesis events...</div>
                            ) : (
                                institutionalPulse.map((msg, i) => (
                                    <div key={i} className="text-indigo-400/80 animate-in fade-in slide-in-from-left-2 duration-300">
                                        {msg}
                                    </div>
                                ))
                            )}
                        </div>
                   </div>

                   <HistorySentinel onAction={addPulse} />
                </aside>

            </div>
        </div>
    );
}
