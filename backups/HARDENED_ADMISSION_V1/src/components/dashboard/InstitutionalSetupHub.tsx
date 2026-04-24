"use client";

import React, { useState } from "react";
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Zap,
  Layout
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createBranchAction } from "@/lib/actions/branch-actions";
import { appointPrincipalAction } from "@/lib/actions/staff-actions";
import { syncAcademicBlueprintAction } from "@/lib/actions/academic-actions";
import { cn } from "@/lib/utils";

/**
 * 🏛️ INSTITUTIONAL SETUP HUB (The Genesis Lab)
 * 
 * Provides a sovereign workflow for owners to initialize campuses 
 * and appoint leadership, satisfying Rule 6.
 */
export function InstitutionalSetupHub() {
    const [step, setStep] = useState(2);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<any>(null);

    // Form States
    const [branchForm, setBranchForm] = useState({
        name: "",
        code: "",
        address: "",
        phone: ""
    });

    const [principalForm, setPrincipalForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
    });

    const [createdBranch, setCreatedBranch] = useState<any>({ 
        id: "VIVES-RCB", 
        name: "Reddy Coloney Branch",
        code: "RCB"
    });

    // Handlers
    async function handleCreateBranch() {
        setLoading(true);
        setError(null);
        try {
            const res = await createBranchAction(branchForm) as any;
            if (res.success) {
                setCreatedBranch(res.data);
                setStep(2);
            } else {
                setError(res.error || "Failed to create campus.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleAppointPrincipal() {
        if (!createdBranch) return;
        setLoading(true);
        setError(null);
        try {
            const res = await appointPrincipalAction({
                ...principalForm,
                branchId: createdBranch.id,
                schoolId: "VIVES" // Institutional Default
            }) as any;
            if (res.success) {
                setStep(3);
            } else {
                setError(res.error || "Failed to appoint Principal.");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleActivateAcademics() {
        setLoading(true);
        setError(null);
        try {
            const res = await syncAcademicBlueprintAction() as any;
            if (res.success) {
                setSuccessData(res.data);
                setStep(4);
            } else {
                setError(res.error || "Failed to activate academics.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto py-8 lg:py-12 space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="space-y-4 text-center lg:text-left">
                <div className="flex items-center gap-3 justify-center lg:justify-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-sm shadow-primary/10">
                        <Layout className="w-6 h-6" />
                    </div>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Institutional Setup <span className="text-primary italic">Hub</span></h1>
                <p className="text-slate-500 font-bold max-w-2xl italic">Initialize your educational empire. Establish campuses, appoint leadership, and activate the Sovereign Pulse.</p>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 relative z-10">
                {[
                    { id: 1, label: "Campus Architect", icon: Building2 },
                    { id: 2, label: "Executive Appointment", icon: UserPlus },
                    { id: 3, label: "Academic Activation", icon: Zap },
                    { id: 4, label: "Governance Review", icon: ShieldCheck }
                ].map((s) => (
                    <div 
                        key={s.id}
                        className={cn(
                            "p-6 rounded-[28px] border transition-all duration-700 relative overflow-hidden backdrop-blur-sm",
                            step === s.id ? "bg-white/80 border-primary/30 shadow-[0_20px_50px_rgba(0,0,0,0.05)] ring-1 ring-primary/10" : 
                            step > s.id ? "bg-emerald-500/5 border-emerald-500/10 opacity-80" : "bg-slate-50/50 border-slate-100 opacity-40 grayscale-[0.5]"
                        )}
                    >
                        {step === s.id && (
                            <motion.div 
                                layoutId="activeStep"
                                className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent pointer-events-none" 
                            />
                        )}
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                                step === s.id ? "bg-primary text-white shadow-primary/20 scale-110" : 
                                step > s.id ? "bg-emerald-500 text-white" : "bg-white text-slate-400 border border-slate-100"
                            )}>
                                {step > s.id ? <CheckCircle2 className="w-5 h-5 shadow-sm" /> : <s.icon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-[0.2em] mb-0.5 transition-colors",
                                    step === s.id ? "text-primary" : "text-slate-400"
                                )}>Phase 0{s.id}</p>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{s.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Area */}
            <div className="relative min-h-[500px]">
                <AnimatePresence mode="wait">
                    {/* STEP 1: BRANCH CREATOR */}
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white border border-slate-100 rounded-[32px] p-8 lg:p-12 shadow-sm relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform pointer-events-none">
                                <Building2 className="w-64 h-64" />
                            </div>

                            <div className="max-w-xl space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-slate-900">Define Your First Campus</h2>
                                    <p className="text-slate-500 font-bold italic text-sm">Every educational wing starts with a unique identity code.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campus Name</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g., North Wing Academy"
                                                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                                value={branchForm.name}
                                                onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity Code</label>
                                            <input 
                                                type="text" 
                                                placeholder="e.g., MAIN"
                                                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                                value={branchForm.code}
                                                onChange={(e) => setBranchForm({...branchForm, code: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Operational Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Full street address..."
                                                className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                                value={branchForm.address}
                                                onChange={(e) => setBranchForm({...branchForm, address: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    
                                    {error && <p className="text-rose-500 text-xs font-black italic">{error}</p>}

                                    <button 
                                        onClick={handleCreateBranch}
                                        disabled={loading || !branchForm.name || !branchForm.code}
                                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:pointer-events-none group"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                Initialize Campus Architect <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: PRINCIPAL APPOINTMENT */}
                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-white border border-slate-100 rounded-[32px] p-8 lg:p-12 shadow-sm relative overflow-hidden group"
                        >
                             <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform pointer-events-none">
                                <UserPlus className="w-64 h-64" />
                            </div>

                            <div className="max-w-xl space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Campus Success: {createdBranch?.name}</p>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900">Appoint Your Principal</h2>
                                    <p className="text-slate-500 font-bold italic text-sm">Assign an executive authority to manage the daily operations of {createdBranch?.name}.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">First Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Principal's First Name"
                                            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                            value={principalForm.firstName}
                                            onChange={(e) => setPrincipalForm({...principalForm, firstName: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Last Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Principal's Last Name"
                                            className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                            value={principalForm.lastName}
                                            onChange={(e) => setPrincipalForm({...principalForm, lastName: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Institutional Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="email" 
                                            placeholder="principal@institution.edu"
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                                            value={principalForm.email}
                                            onChange={(e) => setPrincipalForm({...principalForm, email: e.target.value})}
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-rose-500 text-xs font-black italic">{error}</p>}

                                <div className="flex gap-4">
                                     <button 
                                        onClick={() => setStep(1)}
                                        className="px-8 py-5 border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                     >
                                        Back
                                     </button>
                                     <button 
                                        onClick={handleAppointPrincipal}
                                        disabled={loading || !principalForm.firstName || !principalForm.email}
                                        className="flex-1 py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 group"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                Confirm Appointment <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: ACADEMIC ACTIVATION */}
                    {step === 3 && (
                        <motion.div 
                            key="step3"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border border-slate-100 rounded-[32px] p-8 lg:p-12 shadow-sm relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform pointer-events-none">
                                <Zap className="w-64 h-64 text-primary" />
                            </div>

                            <div className="max-w-xl space-y-8 relative z-10">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 text-primary mb-2">
                                        <ShieldCheck className="w-5 h-5" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Leadership Guard: ACTIVE</p>
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900">Activate Academic Blueprint</h2>
                                    <p className="text-slate-500 font-bold italic text-sm">Provision the standard academic infrastructure (Grades, Sections, and Schedules) for {createdBranch?.name}.</p>
                                </div>

                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activation Package</h4>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 14 Standard Grades (Nursery to 10th)
                                        </li>
                                        <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Default Section Blueprints
                                        </li>
                                        <li className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Institutional Scoping Applied
                                        </li>
                                    </ul>
                                </div>

                                {error && <p className="text-rose-500 text-xs font-black italic">{error}</p>}

                                <button 
                                    onClick={handleActivateAcademics}
                                    disabled={loading}
                                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 group"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            Synchronize Sovereign Pulse <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: SUCCESS & ACTIVATION */}
                    {step === 4 && (
                        <motion.div 
                            key="step4"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-[#0f172a] border border-white/10 rounded-[48px] p-12 lg:p-20 text-center text-white relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.4)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/10 pointer-events-none" />
                            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full animate-pulse" />
                            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                            
                            <div className="max-w-2xl mx-auto space-y-10 relative z-10">
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full group-hover:bg-emerald-400/40 transition-all duration-700" />
                                    <div className="w-28 h-28 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40 relative z-10 backdrop-blur-xl">
                                        <Zap className="w-12 h-12 text-emerald-400 fill-emerald-400 filter drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h2 className="text-4xl lg:text-5xl font-black italic tracking-tighter leading-none">
                                        Institutional Pulse: <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.4)]">ACTIVE</span>
                                    </h2>
                                    <p className="text-slate-300 font-bold text-xl tracking-tight opacity-90 max-w-xl mx-auto">
                                        Congratulations! <span className="text-white italic">{createdBranch?.name}</span> is now provisioned with dedicated leadership.
                                    </p>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-5 text-left backdrop-blur-2xl shadow-inner group transition-all hover:bg-white/[0.08]">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Campus Identity</p>
                                            <p className="text-sm font-black text-primary uppercase italic tracking-wider">{createdBranch?.id}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Appointed Leader</p>
                                            <p className="text-sm font-black text-white tracking-tight">{principalForm.firstName} {principalForm.lastName}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Security Status</p>
                                            <p className="text-sm font-black text-emerald-400 italic uppercase flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4" /> Double-Sentinel Verified
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-6">
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="w-full lg:w-auto px-16 py-6 bg-white text-slate-900 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:scale-[1.05] active:scale-95 transition-all duration-300 relative overflow-hidden group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                        <span className="relative z-10 flex items-center justify-center gap-3">
                                            Unlock Dashboard Systems <ArrowRight className="w-5 h-5" />
                                        </span>
                                    </button>
                                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] italic animate-pulse">
                                        System restart required to propagate tenancy headers
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Health Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8">
                <div className="p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 space-y-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Rule 2.1 Enforcement</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed pr-4">Branch IDs and Staff Codes are deterministically generated based on your Institutional DNA. This prevents cross-tenant data leaks and ensures forensic traceability.</p>
                </div>
                <div className="p-8 rounded-[32px] bg-slate-50/50 border border-slate-100 space-y-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Accounting Node Initialization</h3>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed pr-4">Creating a campus automatically initializes a dedicated Chart of Accounts (Main Cash, Bank, Income). This allows the branch to participate in financial reconciliation immediately upon activation.</p>
                </div>
            </div>
        </div>
    );
}
