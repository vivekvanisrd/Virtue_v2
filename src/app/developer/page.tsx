"use client";

/**
 * 🏛️ PAVA-EDUX DEVELOPER COMMAND CENTER v4.0
 * Simple · Powerful · Multi-Tenant Safe
 * 
 * Three operations:
 *  1. Provision new School (School + HQ Branch + Owner + AY + CoA + RBAC)
 *  2. Add Branch to existing School (Branch + CoA + optional Principal)
 *  3. Add Owner/Admin to existing School+Branch
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    Building2, Plus, RefreshCcw, ShieldCheck, Users, ChevronDown,
    ChevronUp, Loader2, CheckCircle2, X, AlertCircle, Copy,
    Key, GitBranch, UserPlus, School, Activity, Eye, EyeOff,
    ArrowRight, Lock, Sparkles, Command, ClipboardCheck, LogOut
} from "lucide-react";
import {
    getFullRegistryAction,
    createSchoolAction,
    createBranchAction,
    createOwnerAction,
    checkCodeAvailabilityAction,
    auditTenancyIsolationAction,
    switchSchoolContextAction,
} from "./actions";
import { signOutAction } from "@/lib/actions/auth-native";

// ─── tiny helpers ────────────────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

function Field({
    label, value, onChange, placeholder = "", type = "text", required = false, readOnly = false
}: {
    label: string; value: string; onChange?: (v: string) => void;
    placeholder?: string; type?: string; required?: boolean; readOnly?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>
            <input
                type={type} value={value} readOnly={readOnly}
                onChange={e => onChange?.(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    "w-full px-4 py-3 rounded-xl font-semibold text-sm outline-none transition-all border-2",
                    readOnly
                        ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-white border-slate-100 focus:border-indigo-400 text-slate-800 hover:border-slate-200"
                )}
            />
        </div>
    );
}

function Select({
    label, value, onChange, options, required = false
}: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; required?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                {label} {required && <span className="text-rose-400">*</span>}
            </label>
            <select
                value={value} onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm outline-none transition-all border-2 bg-white border-slate-100 focus:border-indigo-400 text-slate-800 cursor-pointer appearance-none"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function Badge({ text, color }: { text: string; color: "green" | "amber" | "red" | "blue" | "slate" }) {
    const map = {
        green: "bg-emerald-50 text-emerald-700 border-emerald-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
        red: "bg-rose-50 text-rose-700 border-rose-100",
        blue: "bg-indigo-50 text-indigo-700 border-indigo-100",
        slate: "bg-slate-50 text-slate-600 border-slate-100",
    };
    return (
        <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border inline-block", map[color])}>
            {text}
        </span>
    );
}

function ResultCard({ result, onClose }: { result: any; onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const creds = result.credentials || result.data;

    const copyAll = () => {
        const text = `Username: ${creds?.username || "—"}\nPassword: ${creds?.password || "—"}\nNote: ${creds?.note || "—"}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-90 duration-200">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Successfully Provisioned!</h3>
                        <p className="text-xs text-slate-400 font-medium">Save these credentials immediately</p>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-5 space-y-3 font-mono text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Username</span>
                        <span className="text-emerald-400 font-bold">{creds?.username || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Password</span>
                        <span className="text-amber-400 font-bold">{creds?.password || "—"}</span>
                    </div>
                    {creds?.note && (
                        <p className="text-xs text-slate-500 border-t border-white/5 pt-3">{creds.note}</p>
                    )}
                </div>

                <div className="flex gap-3">
                    <button onClick={copyAll} className="flex-1 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        {copied ? <><ClipboardCheck className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Credentials</>}
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-all">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function DeveloperCommandCenter() {
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [activePanel, setActivePanel] = useState<"school" | "branch" | "owner" | "audit" | null>(null);
    const [successResult, setSuccessResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // ── Form states ──────────────────────────────────────────────────────────
    const [schoolForm, setSchoolForm] = useState({
        schoolName: "", schoolCode: "", city: "Sangareddy", phone: "",
        ownerFirstName: "", ownerLastName: "", ownerEmail: "",
        academicYear: "2026-27", academicYearStart: "2026-06-01",
    });
    const [branchForm, setBranchForm] = useState({
        schoolId: "", branchName: "", branchCode: "", city: "", phone: "",
        createAdmin: false, adminFirstName: "", adminLastName: "", adminEmail: "", adminPhone: "",
    });
    const [ownerForm, setOwnerForm] = useState({
        schoolId: "", branchId: "", firstName: "", lastName: "", email: "", phone: "",
        role: "OWNER" as "OWNER" | "PRINCIPAL" | "ACCOUNTANT",
    });
    const [auditSchoolId, setAuditSchoolId] = useState("");
    const [auditResult, setAuditResult] = useState<any>(null);

    // ── Code availability ────────────────────────────────────────────────────
    const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");

    const load = useCallback(async () => {
        setLoading(true);
        const res = await getFullRegistryAction();
        setSchools((res as any).data || []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-suggest schoolCode from schoolName
    useEffect(() => {
        if (schoolForm.schoolName && !schoolForm.schoolCode) {
            const words = schoolForm.schoolName.trim().toUpperCase().split(/\s+/);
            const code = words.length >= 2
                ? words.map(w => w[0]).join("").substring(0, 6)
                : words[0].substring(0, 4);
            setSchoolForm(p => ({ ...p, schoolCode: code }));
        }
    }, [schoolForm.schoolName]);

    // Real-time code availability check
    useEffect(() => {
        const code = activePanel === "school" ? schoolForm.schoolCode : branchForm.branchCode;
        const schoolId = activePanel === "branch" ? branchForm.schoolId : undefined;
        const type = activePanel === "school" ? "school" : "branch";

        if (!code || code.length < 2) { setCodeStatus("idle"); return; }
        setCodeStatus("checking");
        const t = setTimeout(async () => {
            const ok = await checkCodeAvailabilityAction(type, code, schoolId);
            setCodeStatus(ok ? "ok" : "taken");
        }, 400);
        return () => clearTimeout(t);
    }, [schoolForm.schoolCode, branchForm.branchCode, branchForm.schoolId, activePanel]);

    const toggleExpand = (id: string) => {
        const next = new Set(expanded);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpanded(next);
    };

    const resetAndOpen = (panel: typeof activePanel) => {
        setError(null);
        setActivePanel(panel);
        setCodeStatus("idle");
    };

    // ── Submit handlers ──────────────────────────────────────────────────────
    const submitSchool = async () => {
        setError(null); setSubmitting(true);
        try {
            const res = await createSchoolAction(schoolForm);
            if (res.success) {
                setSuccessResult(res);
                setActivePanel(null);
                setSchoolForm({ schoolName: "", schoolCode: "", city: "Sangareddy", phone: "", ownerFirstName: "", ownerLastName: "", ownerEmail: "", academicYear: "2026-27", academicYearStart: "2026-06-01" });
                await load();
            } else { setError(res.error || "Failed"); }
        } catch (e: any) { setError(e.message); }
        setSubmitting(false);
    };

    const submitBranch = async () => {
        setError(null); setSubmitting(true);
        try {
            const res = await createBranchAction({
                ...branchForm,
                createAdmin: branchForm.createAdmin,
            });
            if (res.success) {
                const creds = (res as any).data?.adminResult;
                setSuccessResult(creds ? { credentials: creds } : { credentials: { note: "Branch created. No admin added." } });
                setActivePanel(null);
                setBranchForm({ schoolId: "", branchName: "", branchCode: "", city: "", phone: "", createAdmin: false, adminFirstName: "", adminLastName: "", adminEmail: "", adminPhone: "" });
                await load();
            } else { setError(res.error || "Failed"); }
        } catch (e: any) { setError(e.message); }
        setSubmitting(false);
    };

    const submitOwner = async () => {
        setError(null); setSubmitting(true);
        try {
            const res = await createOwnerAction(ownerForm);
            if (res.success) {
                setSuccessResult(res);
                setActivePanel(null);
                setOwnerForm({ schoolId: "", branchId: "", firstName: "", lastName: "", email: "", phone: "", role: "OWNER" });
                await load();
            } else { setError(res.error || "Failed"); }
        } catch (e: any) { setError(e.message); }
        setSubmitting(false);
    };

    const runAudit = async () => {
        setAuditResult(null); setSubmitting(true);
        try {
            const res = await auditTenancyIsolationAction(auditSchoolId);
            setAuditResult(res);
        } catch (e: any) { setAuditResult({ success: false, error: e.message }); }
        setSubmitting(false);
    };

    const schoolOptions = schools.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }));
    const getBranchesForSchool = (schoolId: string) =>
        schools.find(s => s.id === schoolId)?.branches || [];
    const branchOptions = (branchForm.schoolId ? getBranchesForSchool(branchForm.schoolId) : [])
        .map((b: any) => ({ value: b.id, label: `${b.name} (${b.code})` }));
    const ownerBranchOptions = (ownerForm.schoolId ? getBranchesForSchool(ownerForm.schoolId) : [])
        .map((b: any) => ({ value: b.id, label: `${b.name} (${b.code})` }));

    const codeIndicator = codeStatus === "checking"
        ? <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
        : codeStatus === "ok"
            ? <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Available</span>
            : codeStatus === "taken"
                ? <span className="text-[9px] font-black text-rose-500 flex items-center gap-1"><X className="w-3 h-3" /> Taken</span>
                : null;

    return (
        <div className="min-h-screen bg-[#F6F6F9] flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <Command className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">Developer Command Center</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PaVa-EDUX · Multi-Tenant Infrastructure</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={load} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all" title="Refresh">
                            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </button>
                        <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Tenancy Active</span>
                        </div>
                        <button
                            onClick={async () => {
                                const res = await signOutAction();
                                if (res.success) {
                                    window.location.href = "/login";
                                }
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl border border-rose-100 hover:border-transparent transition-all font-black text-[10px] uppercase tracking-wider"
                            title="Sign Out"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
                {/* Action Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { panel: "school" as const, icon: School, label: "New School", sub: "Provision institution", color: "bg-indigo-600 shadow-indigo-600/20" },
                        { panel: "branch" as const, icon: GitBranch, label: "Add Branch", sub: "New campus unit", color: "bg-violet-600 shadow-violet-600/20" },
                        { panel: "owner" as const, icon: UserPlus, label: "Add Admin", sub: "Owner / Principal", color: "bg-slate-800 shadow-slate-800/20" },
                        { panel: "audit" as const, icon: ShieldCheck, label: "Audit Tenancy", sub: "Check isolation", color: "bg-emerald-600 shadow-emerald-600/20" },
                    ].map(item => (
                        <button key={item.panel} onClick={() => resetAndOpen(item.panel)}
                            className={cn("flex items-center gap-4 px-5 py-4 rounded-2xl text-white font-bold shadow-xl transition-all active:scale-[0.97] hover:opacity-90", item.color)}>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-black">{item.label}</p>
                                <p className="text-[10px] opacity-70 font-medium">{item.sub}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: "Total Schools", value: schools.length, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Total Branches", value: schools.reduce((a, s) => a + (s.branches?.length || 0), 0), icon: GitBranch, color: "text-violet-600", bg: "bg-violet-50" },
                        { label: "Total Owners", value: schools.reduce((a, s) => a + (s.staff?.length || 0), 0), icon: Users, color: "text-slate-700", bg: "bg-slate-100" },
                        { label: "System Status", value: "LIVE", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                <p className={cn("text-3xl font-black mt-1", s.color)}>{s.value}</p>
                            </div>
                            <div className={cn("p-3 rounded-xl", s.bg)}>
                                <s.icon className={cn("w-6 h-6", s.color)} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* School Registry */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600" /> Institution Registry
                            <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-black border border-indigo-100">
                                {schools.length} nodes
                            </span>
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : schools.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                            <School className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="font-black text-slate-400">No schools provisioned yet</p>
                            <p className="text-sm text-slate-300 mt-1">Click "New School" to provision the first institution</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {schools.map(school => (
                                <div key={school.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    {/* School Header */}
                                    <div className="px-6 py-5 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <School className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-lg font-black text-slate-900 truncate">{school.name}</h3>
                                                    <Badge text={school.code} color="blue" />
                                                    <Badge text={school.status || "ACTIVE"} color={school.status === "ACTIVE" ? "green" : "amber"} />
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                                                    <span>{school.branches?.length || 0} branch{school.branches?.length !== 1 ? "es" : ""}</span>
                                                    <span>·</span>
                                                    {school.staff?.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            {school.staff.map((owner: any) => (
                                                                <span key={owner.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600">
                                                                    {owner.firstName} {owner.lastName}
                                                                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", owner.onboardingStatus === "PASSWORD_CHANGE_REQUIRED" ? "bg-amber-400" : "bg-emerald-500")} title={owner.onboardingStatus === "PASSWORD_CHANGE_REQUIRED" ? "Needs Login" : "Active"} />
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-rose-400 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No owner</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => { resetAndOpen("branch"); setBranchForm(p => ({ ...p, schoolId: school.id })); }}
                                                className="px-4 py-2 text-[11px] font-black uppercase tracking-wider bg-violet-50 hover:bg-violet-600 hover:text-white text-violet-600 rounded-xl transition-all border border-violet-100 hover:border-transparent flex items-center gap-1.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Branch
                                            </button>
                                            <button
                                                onClick={() => { resetAndOpen("owner"); setOwnerForm(p => ({ ...p, schoolId: school.id })); }}
                                                className="px-4 py-2 text-[11px] font-black uppercase tracking-wider bg-slate-50 hover:bg-slate-800 hover:text-white text-slate-600 rounded-xl transition-all border border-slate-100 hover:border-transparent flex items-center gap-1.5"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Admin
                                            </button>
                                            <button
                                                onClick={() => toggleExpand(school.id)}
                                                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-all"
                                            >
                                                {expanded.has(school.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Branches Panel */}
                                    {expanded.has(school.id) && (
                                        <div className="border-t border-slate-50 bg-slate-50/50 px-6 py-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <GitBranch className="w-3.5 h-3.5 text-violet-500" /> Campus Branches
                                                </h4>
                                                <button
                                                    onClick={() => { resetAndOpen("audit"); setAuditSchoolId(school.id); }}
                                                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-all"
                                                >
                                                    <ShieldCheck className="w-3 h-3" /> Audit Tenancy
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {(school.branches || []).map((branch: any) => (
                                                    <div key={branch.id} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-black text-slate-800 text-sm truncate">{branch.name}</p>
                                                                    <Badge text={branch.code} color="slate" />
                                                                    {(branch.id.includes("-HQ") || branch.code === "MAIN") && (
                                                                        <Badge text="HQ" color="blue" />
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-400 mt-1 font-medium truncate">{branch.address || "No address"}</p>
                                                            </div>
                                                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", branch.status === "Active" ? "bg-emerald-500" : "bg-amber-400")} />
                                                        </div>
                                                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between flex-wrap gap-2">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">{branch.id}</p>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        const res = await switchSchoolContextAction(school.id, branch.id);
                                                                        if (res.success) {
                                                                            window.location.href = '/dashboard';
                                                                        } else {
                                                                            alert(res.error || "Failed to switch context");
                                                                        }
                                                                    }}
                                                                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-100 transition-all"
                                                                >
                                                                    <Eye className="w-3 h-3" /> Impersonate
                                                                </button>
                                                                <button
                                                                    onClick={() => { resetAndOpen("owner"); setOwnerForm(p => ({ ...p, schoolId: school.id, branchId: branch.id })); }}
                                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1 rounded-lg border border-indigo-100 transition-all"
                                                                >
                                                                    <UserPlus className="w-3 h-3" /> Add Admin
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!school.branches || school.branches.length === 0) && (
                                                    <div className="col-span-3 py-6 text-center text-slate-300 text-sm font-bold">
                                                        No branches yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* ── Slide-over Panels ─────────────────────────────────────────── */}
            {activePanel && (
                <div className="fixed inset-0 z-[200] flex">
                    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setActivePanel(null)} />
                    <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
                        {/* Panel Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl",
                                    activePanel === "school" ? "bg-indigo-50"
                                    : activePanel === "branch" ? "bg-violet-50"
                                    : activePanel === "owner" ? "bg-slate-100"
                                    : "bg-emerald-50"
                                )}>
                                    {activePanel === "school" && <School className="w-5 h-5 text-indigo-600" />}
                                    {activePanel === "branch" && <GitBranch className="w-5 h-5 text-violet-600" />}
                                    {activePanel === "owner" && <UserPlus className="w-5 h-5 text-slate-700" />}
                                    {activePanel === "audit" && <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900">
                                        {activePanel === "school" && "Provision New School"}
                                        {activePanel === "branch" && "Add Branch"}
                                        {activePanel === "owner" && "Add Owner / Admin"}
                                        {activePanel === "audit" && "Tenancy Audit"}
                                    </h2>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {activePanel === "school" && "Full institutional genesis with owner + CoA + RBAC"}
                                        {activePanel === "branch" && "New campus with Chart of Accounts initialization"}
                                        {activePanel === "owner" && "Add privileged user to existing school"}
                                        {activePanel === "audit" && "Verify data isolation per school"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setActivePanel(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 px-8 py-6 space-y-5">
                            {/* Error */}
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm font-semibold">{error}</p>
                                </div>
                            )}

                            {/* ── SCHOOL FORM ──────────────────────────────── */}
                            {activePanel === "school" && (
                                <div className="space-y-5">
                                    <div className="bg-indigo-50 rounded-xl p-4 text-xs text-indigo-700 font-semibold flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        This creates: School → HQ Branch → Owner Staff → Academic Year → Chart of Accounts (7 ledgers) → 15 RBAC roles
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">🏫 School Identity</h3>
                                        <Field label="Full School Name" value={schoolForm.schoolName} onChange={v => setSchoolForm(p => ({ ...p, schoolName: v }))} placeholder="e.g. Virtue International School" required />
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Short Code (Immutable) <span className="text-rose-400">*</span></label>
                                                {codeIndicator}
                                            </div>
                                            <input
                                                value={schoolForm.schoolCode}
                                                onChange={e => setSchoolForm(p => ({ ...p, schoolCode: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                                                placeholder="e.g. VIS"
                                                className={cn("w-full px-4 py-3 rounded-xl font-black text-indigo-600 text-lg outline-none transition-all border-2",
                                                    codeStatus === "taken" ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-white focus:border-indigo-400"
                                                )}
                                            />
                                            <p className="text-[10px] text-slate-400">This becomes the School ID. Cannot be changed after creation.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="City" value={schoolForm.city} onChange={v => setSchoolForm(p => ({ ...p, city: v }))} placeholder="Sangareddy" />
                                            <Field label="Phone" value={schoolForm.phone} onChange={v => setSchoolForm(p => ({ ...p, phone: v }))} placeholder="+91" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">👤 Institution Owner</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="First Name" value={schoolForm.ownerFirstName} onChange={v => setSchoolForm(p => ({ ...p, ownerFirstName: v }))} required />
                                            <Field label="Last Name" value={schoolForm.ownerLastName} onChange={v => setSchoolForm(p => ({ ...p, ownerLastName: v }))} required />
                                        </div>
                                        <Field label="Owner Email" type="email" value={schoolForm.ownerEmail} onChange={v => setSchoolForm(p => ({ ...p, ownerEmail: v }))} placeholder="owner@school.edu" required />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">📅 Academic Year</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Year Label" value={schoolForm.academicYear} onChange={v => setSchoolForm(p => ({ ...p, academicYear: v }))} placeholder="2026-27" required />
                                            <Field label="Start Date" type="date" value={schoolForm.academicYearStart} onChange={v => setSchoolForm(p => ({ ...p, academicYearStart: v }))} required />
                                        </div>
                                    </div>

                                    <div className="pt-2 space-y-3">
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-xs font-semibold">
                                            <Lock className="w-4 h-4 flex-shrink-0" />
                                            Default password: <span className="font-black">InitialKey@PaVa</span> — owner must change on first login.
                                        </div>
                                        <button
                                            onClick={submitSchool}
                                            disabled={submitting || codeStatus === "taken" || !schoolForm.schoolCode || !schoolForm.ownerEmail}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                                        >
                                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</> : <><Sparkles className="w-4 h-4" /> Provision School</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── BRANCH FORM ──────────────────────────────── */}
                            {activePanel === "branch" && (
                                <div className="space-y-5">
                                    <div className="bg-violet-50 rounded-xl p-4 text-xs text-violet-700 font-semibold flex items-start gap-2">
                                        <GitBranch className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        Creates: Branch → 7 Chart of Account ledgers → Audit log. Optionally adds a Branch Principal.
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">🏫 Target School</h3>
                                        <Select label="School" value={branchForm.schoolId} onChange={v => setBranchForm(p => ({ ...p, schoolId: v }))}
                                            options={[{ value: "", label: "— Select School —" }, ...schoolOptions]} required />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">🏢 Branch Details</h3>
                                        <Field label="Branch Name" value={branchForm.branchName} onChange={v => setBranchForm(p => ({ ...p, branchName: v }))} placeholder="e.g. City Campus" required />
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branch Code <span className="text-rose-400">*</span></label>
                                                {codeIndicator}
                                            </div>
                                            <input
                                                value={branchForm.branchCode}
                                                onChange={e => setBranchForm(p => ({ ...p, branchCode: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                                                placeholder="e.g. CITY"
                                                className={cn("w-full px-4 py-3 rounded-xl font-black text-violet-600 text-lg outline-none transition-all border-2",
                                                    codeStatus === "taken" ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-white focus:border-violet-400"
                                                )}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="City" value={branchForm.city} onChange={v => setBranchForm(p => ({ ...p, city: v }))} placeholder="Hyderabad" />
                                            <Field label="Phone" value={branchForm.phone} onChange={v => setBranchForm(p => ({ ...p, phone: v }))} placeholder="+91" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div onClick={() => setBranchForm(p => ({ ...p, createAdmin: !p.createAdmin }))}
                                                className={cn("w-11 h-6 rounded-full transition-all relative flex-shrink-0 cursor-pointer",
                                                    branchForm.createAdmin ? "bg-violet-600" : "bg-slate-200")}>
                                                <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
                                                    branchForm.createAdmin ? "left-5" : "left-0.5")} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-700">Also create Branch Principal</p>
                                                <p className="text-xs text-slate-400">Adds a PRINCIPAL-role admin for this branch</p>
                                            </div>
                                        </label>

                                        {branchForm.createAdmin && (
                                            <div className="pl-4 border-l-2 border-violet-100 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="First Name" value={branchForm.adminFirstName} onChange={v => setBranchForm(p => ({ ...p, adminFirstName: v }))} />
                                                    <Field label="Last Name" value={branchForm.adminLastName} onChange={v => setBranchForm(p => ({ ...p, adminLastName: v }))} />
                                                </div>
                                                <Field label="Admin Email" type="email" value={branchForm.adminEmail} onChange={v => setBranchForm(p => ({ ...p, adminEmail: v }))} placeholder="principal@school.edu" required />
                                                <Field label="Admin Phone" type="tel" value={branchForm.adminPhone} onChange={v => setBranchForm(p => ({ ...p, adminPhone: v.replace(/\s+/g, "") }))} placeholder="+91" required />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={submitBranch}
                                        disabled={
                                            submitting || 
                                            !branchForm.schoolId || 
                                            !branchForm.branchCode || 
                                            !branchForm.branchName || 
                                            codeStatus === "taken" ||
                                            (branchForm.createAdmin && (!branchForm.adminFirstName || !branchForm.adminLastName || !branchForm.adminEmail || !branchForm.adminPhone))
                                        }
                                        className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-600/20 active:scale-[0.98]"
                                    >
                                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><GitBranch className="w-4 h-4" /> Create Branch</>}
                                    </button>
                                </div>
                            )}

                            {/* ── OWNER FORM ──────────────────────────────── */}
                            {activePanel === "owner" && (
                                <div className="space-y-5">
                                    <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-600 font-semibold flex items-start gap-2 border border-slate-100">
                                        <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        Adds a privileged staff member to an existing school+branch. Username and initial password are set to their Phone Number.
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">🏫 Assign To</h3>
                                        <Select label="School" value={ownerForm.schoolId} onChange={v => setOwnerForm(p => ({ ...p, schoolId: v, branchId: "" }))}
                                            options={[{ value: "", label: "— Select School —" }, ...schoolOptions]} required />
                                        {ownerForm.schoolId && (
                                            <Select label="Branch" value={ownerForm.branchId} onChange={v => setOwnerForm(p => ({ ...p, branchId: v }))}
                                                options={[{ value: "", label: "— Select Branch —" }, ...ownerBranchOptions]} required />
                                        )}
                                        <Select label="Role" value={ownerForm.role}
                                            onChange={v => setOwnerForm(p => ({ ...p, role: v as any }))}
                                            options={[
                                                { value: "OWNER", label: "OWNER — Full institution access" },
                                                { value: "PRINCIPAL", label: "PRINCIPAL — Branch head access" },
                                                { value: "ACCOUNTANT", label: "ACCOUNTANT — Finance access" },
                                            ]} required />
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">👤 Person Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="First Name" value={ownerForm.firstName} onChange={v => setOwnerForm(p => ({ ...p, firstName: v }))} required />
                                            <Field label="Last Name" value={ownerForm.lastName} onChange={v => setOwnerForm(p => ({ ...p, lastName: v }))} required />
                                        </div>
                                        <Field label="Email" type="email" value={ownerForm.email} onChange={v => setOwnerForm(p => ({ ...p, email: v }))} required placeholder="admin@school.edu" />
                                        <Field label="Phone" type="tel" value={ownerForm.phone} onChange={v => setOwnerForm(p => ({ ...p, phone: v.replace(/\s+/g, "") }))} required placeholder="+91" />
                                    </div>

                                    <button
                                        onClick={submitOwner}
                                        disabled={submitting || !ownerForm.schoolId || !ownerForm.branchId || !ownerForm.email || !ownerForm.phone}
                                        className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : <><UserPlus className="w-4 h-4" /> Add Admin</>}
                                    </button>
                                </div>
                            )}

                            {/* ── AUDIT FORM ──────────────────────────────── */}
                            {activePanel === "audit" && (
                                <div className="space-y-5">
                                    <div className="bg-emerald-50 rounded-xl p-4 text-xs text-emerald-700 font-semibold flex items-start gap-2">
                                        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        Verifies that a school's data is completely isolated. Counts records and checks for cross-school leakage.
                                    </div>

                                    <Select label="Select School to Audit" value={auditSchoolId}
                                        onChange={v => setAuditSchoolId(v)}
                                        options={[{ value: "", label: "— Select School —" }, ...schoolOptions]} />

                                    <button
                                        onClick={runAudit}
                                        disabled={submitting || !auditSchoolId}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                                    >
                                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Auditing...</> : <><ShieldCheck className="w-4 h-4" /> Run Tenancy Audit</>}
                                    </button>

                                    {auditResult && (
                                        <div className={cn("rounded-xl p-5 space-y-4 border", auditResult.success ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                                            {auditResult.success ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                        <h3 className="font-black text-emerald-800">Tenancy VERIFIED</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {Object.entries(auditResult.audit.ownRecords).map(([k, v]) => (
                                                            <div key={k} className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                                                                <p className="text-2xl font-black text-emerald-700">{v as number}</p>
                                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 capitalize">{k}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-lg p-3">
                                                        {auditResult.audit.isolation}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        Other schools total students (should never appear in this school's queries): <strong>{auditResult.audit.globalStats.totalOtherStudents}</strong>
                                                    </p>
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2 text-rose-700">
                                                    <AlertCircle className="w-5 h-5" />
                                                    <p className="text-sm font-bold">{auditResult.error}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Credential Modal */}
            {successResult && (
                <ResultCard result={successResult} onClose={() => setSuccessResult(null)} />
            )}
        </div>
    );
}
