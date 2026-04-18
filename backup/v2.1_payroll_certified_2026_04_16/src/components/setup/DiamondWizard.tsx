"use client";

import React, { useState } from 'react';
import { createPhysicalBranchAction, linkAcademicYearAction, importTemplateAction } from '@/lib/actions/setup-actions';
import { Check, Loader2, Warehouse, CalendarRange, Library, ShieldCheck, ChevronRight, X } from 'lucide-react';

interface DiamondWizardProps {
    onAction: (msg: string) => void;
}

type Step = 'BRANCH' | 'YEAR' | 'REGSITRY' | 'FINISH';

export function DiamondWizard({ onAction }: DiamondWizardProps) {
    const [step, setStep] = useState<Step>('BRANCH');
    const [loading, setLoading] = useState(false);
    
    // State for Step 1: Branch
    const [branchData, setBranchData] = useState({ name: '', code: '', address: '' });
    
    // State for Step 2: Year
    const [yearData, setYearData] = useState({ label: '2026-27', startDate: '2026-06-01', endDate: '2027-03-31' });

    const nextStep = (s: Step) => {
        setStep(s);
        window.scrollTo(0, 0);
    };

    const handleCreateBranch = async () => {
        if (!branchData.name || !branchData.code) return;
        setLoading(true);
        onAction(`Initiating Branch Genesis: ${branchData.code}`);
        const res = await createPhysicalBranchAction(branchData);
        if (res.success) {
            onAction(`DNA Anchor Set: ${res.branchId}`);
            nextStep('YEAR');
        } else {
            onAction(`ERROR: ${res.error}`);
        }
        setLoading(false);
    };

    const handleLinkYear = async () => {
        setLoading(true);
        onAction(`Calibrating Temporal Chain: ${yearData.label}`);
        const res = await linkAcademicYearAction(yearData);
        if (res.success) {
            onAction(`Timeline Locked: ${res.ayId}`);
            nextStep('REGSITRY');
        } else {
            onAction(`ERROR: ${res.error}`);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-12">
            {/* Horizontal Progress Map */}
            <div className="flex items-center justify-between max-w-2xl mx-auto">
                {[
                    { id: 'BRANCH', icon: Warehouse, label: 'Campus' },
                    { id: 'YEAR', icon: CalendarRange, label: 'Timeline' },
                    { id: 'REGSITRY', icon: Library, label: 'Library' },
                    { id: 'FINISH', icon: ShieldCheck, label: 'Seal' },
                ].map((item, i) => (
                    <React.Fragment key={item.id}>
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${
                                step === item.id ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.4)] text-white scale-110' : 
                                'bg-neutral-800 border-white/5 text-neutral-500'
                            }`}>
                                <item.icon size={20} />
                            </div>
                            <span className={`text-[10px] uppercase tracking-widest font-bold ${step === item.id ? 'text-indigo-400' : 'text-neutral-600'}`}>
                                {item.label}
                            </span>
                        </div>
                        {i < 3 && <div className="h-px flex-1 bg-neutral-800 mx-4" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Campus Discovery */}
            {step === 'BRANCH' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-medium">Identify Your First Campus</h2>
                        <p className="text-neutral-400 text-sm">Every institution needs its first operational anchor.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Branch Name</label>
                            <input 
                                className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                placeholder="e.g. Main Campus"
                                value={branchData.name}
                                onChange={e => setBranchData({...branchData, name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Unique Code</label>
                            <input 
                                className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                placeholder="e.g. MAIN or NORTH"
                                value={branchData.code}
                                onChange={e => setBranchData({...branchData, code: e.target.value.toUpperCase()})}
                            />
                        </div>
                        <div className="space-y-4 md:col-span-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Location Address</label>
                            <textarea 
                                className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors h-24"
                                placeholder="Provide the physical address of this campus"
                                value={branchData.address}
                                onChange={e => setBranchData({...branchData, address: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex justify-center pt-8">
                        <button 
                            onClick={handleCreateBranch}
                            disabled={loading || !branchData.name || !branchData.code}
                            className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-neutral-200 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <ChevronRight size={20} />}
                            Initialize Campus
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Temporal Calibration */}
            {step === 'YEAR' && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-medium">Temporal Chain Calibration</h2>
                        <p className="text-neutral-400 text-sm">Lock in the academic timeline for this new campus.</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-6 bg-neutral-900/40 p-8 rounded-3xl border border-white/5">
                        <div className="space-y-4">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Session Year</label>
                            <input 
                                className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                value={yearData.label}
                                onChange={e => setYearData({...yearData, label: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-4">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">Start Date</label>
                                <input 
                                    type="date"
                                    className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    value={yearData.startDate}
                                    onChange={e => setYearData({...yearData, startDate: e.target.value})}
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500">End Date</label>
                                <input 
                                    type="date"
                                    className="w-full bg-neutral-900 border border-white/5 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 transition-colors"
                                    value={yearData.endDate}
                                    onChange={e => setYearData({...yearData, endDate: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                            onClick={handleLinkYear}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                            Lock Institutional Timeline
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Library Integration */}
            {step === 'REGSITRY' && (
                <div className="space-y-8 animate-in fade-in duration-700">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-medium">Virtue Template Registry</h2>
                        <p className="text-neutral-400 text-sm">Selective import of standard institutional structures.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        <TemplateCard 
                            title="Indian K-12 Hierarchy"
                            desc="Nursery to Grade 10 with auto-sections. Optimized for CBSE/ICSE patterns."
                            icon={Library}
                            onImport={() => nextStep('FINISH')}
                            onAction={onAction}
                            fileName="k12-india.json"
                        />
                         <TemplateCard 
                            title="Standard School Finance"
                            desc="Standardized Indian chart of accounts (Tuition, Transport, Asset, Expense)."
                            icon={ShieldCheck}
                            onImport={() => nextStep('FINISH')}
                            onAction={onAction}
                            fileName="accounting-standard.json"
                        />
                    </div>
                    
                    <div className="text-center">
                        <button onClick={() => nextStep('FINISH')} className="text-neutral-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                            Build My Own (Skip Library)
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Final Seal */}
            {step === 'FINISH' && (
                <div className="text-center space-y-8 py-12 animate-in fade-in duration-1000">
                    <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                        <ShieldCheck size={48} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-4xl font-light">Institutional <span className="font-semibold text-green-400">Locked</span></h2>
                        <p className="text-neutral-400">The Diamond Protocol has been successfully executed.</p>
                    </div>
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="bg-white text-black px-12 py-4 rounded-3xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                        Enter Dashboard
                    </button>
                </div>
            )}
        </div>
    );
}

function TemplateCard({ title, desc, icon: Icon, onImport, onAction, fileName }: any) {
    const [loading, setLoading] = useState(false);
    const [previewing, setPreviewing] = useState(false);

    const handleImport = async () => {
        setLoading(true);
        onAction(`IMPORT START: ${fileName}`);
        const res = await importTemplateAction({ templateFile: fileName });
        if (res.success) {
            onAction(`SUCCESS: ${res.createdCount} entities born with Batch ID ${res.batchId}`);
            onImport();
        } else {
            onAction(`ERROR: ${res.error}`);
        }
        setLoading(false);
    };

    const handlePreview = async () => {
        setLoading(true);
        onAction(`DRY RUN: Initializing ${fileName} preview...`);
        const res = await importTemplateAction({ templateFile: fileName, isDryRun: true });
        if (res.success) {
            onAction(`PREVIEW READY: ${res.preview?.length} items identified.`);
            setPreviewing(true);
        }
        setLoading(false);
    };

    return (
        <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 space-y-6 hover:border-indigo-500/20 transition-all group">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-lg">{title}</h4>
                    <p className="text-neutral-500 text-xs leading-relaxed">{desc}</p>
                </div>
            </div>

            {previewing ? (
                 <div className="bg-black/40 rounded-2xl p-4 space-y-4 border border-indigo-500/10">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-neutral-500">
                        <span>Dry Run Preview</span>
                        <X size={14} className="cursor-pointer" onClick={() => setPreviewing(false)} />
                    </div>
                    <p className="text-xs text-neutral-300">This import will create approximately <span className="text-indigo-400 font-bold">11-15 structural records</span> linked to your DNA. Proceed?</p>
                    <div className="flex gap-3">
                        <button onClick={handleImport} className="flex-1 bg-indigo-600 py-2 rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors">Apply Template</button>
                        <button onClick={() => setPreviewing(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-white/5 hover:bg-white/5 transition-colors">Cancel</button>
                    </div>
                 </div>
            ) : (
                <div className="flex gap-3 py-2">
                    <button 
                         onClick={handlePreview}
                         className="flex-1 bg-white/5 text-xs font-bold uppercase tracking-wider py-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors"
                    >
                         Preview Anatomy
                    </button>
                    <button 
                        onClick={handleImport}
                        className="p-5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"
                    >
                        <Library size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
