"use client";

/**
 * 🏛️ VIRTUE UNIFIED DEVELOPER COMMAND CENTER
 * Multi-Tenant Core Diagnostics, Administration & Audit Explorer
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Building2, Plus, RefreshCcw, ShieldCheck, Users, ChevronDown,
    ChevronUp, Loader2, CheckCircle2, X, AlertCircle, Copy,
    Key, GitBranch, UserPlus, School, Activity, Eye, EyeOff,
    ArrowRight, Lock, Sparkles, Command, ClipboardCheck, LogOut,
    Terminal, Globe, BookOpen, Database, Cpu, HardDrive, Server,
    Search, AlertTriangle
} from "lucide-react";
import {
    getFullRegistryAction,
    createSchoolAction,
    createBranchAction,
    createOwnerAction,
    checkCodeAvailabilityAction,
    auditTenancyIsolationAction,
    switchSchoolContextAction,
    searchStaffUsersAction,
    resetUserPasswordAction,
} from "./actions";
import {
    getDatabaseHealth,
    executeFullIDAudit,
    getActivityLogsAction
} from "@/lib/actions/dev-actions";
import { signOutAction } from "@/lib/actions/auth-native";

// ─── Utility classes ─────────────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
}

// ─── Form Inputs ─────────────────────────────────────────────────────────────
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
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm outline-none transition-all border-2 bg-white border-slate-100 focus:border-indigo-400 text-slate-800 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%237a8c9a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.65rem_auto] bg-[right_1rem_center] bg-no-repeat"
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

// ─── MASTER COMPONENT ────────────────────────────────────────────────────────
export default function DeveloperCommandCenter() {
    // Tab State
    const [activeTab, setActiveTab] = useState<"monitoring" | "admin" | "resets" | "audits" | "logs" | "specs">("monitoring");

    // General States
    const [schools, setSchools] = useState<any[]>([]);
    const [loadingRegistry, setLoadingRegistry] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [activePanel, setActivePanel] = useState<"school" | "branch" | "owner" | null>(null);
    const [successResult, setSuccessResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Monitoring Stats
    const [stats, setStats] = useState<any>(null);
    const [system, setSystem] = useState<any>(null);
    const [isLoadingHealth, setIsLoadingHealth] = useState(true);
    const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
        "[SYSTEM] Virtue Runtime v2.0.5 started",
        "[AUTH] Next.js Session Middleware active",
        "[DB] Connected to Supabase Pooler (Port 6543)",
        "[DEV] Unified Command Dashboard ready for operations"
    ]);

    // Password reset panel states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [customPassword, setCustomPassword] = useState("");
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [passwordVisible, setPasswordVisible] = useState(false);

    // Provision Form states
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

    // Audits & Tenancy states
    const [auditSchoolId, setAuditSchoolId] = useState("");
    const [auditResult, setAuditResult] = useState<any>(null);
    const [idAuditResults, setIdAuditResults] = useState<any>(null);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);

    // Activity Logs Explorer states
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [filterAction, setFilterAction] = useState<string>("");
    const [filterSearch, setFilterSearch] = useState<string>("");
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Code availability check indicator
    const [codeStatus, setCodeStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");

    const addDiagLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setDiagnosticLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
    };

    // ─── Data Fetching ───────────────────────────────────────────────────────
    const loadRegistry = useCallback(async () => {
        setLoadingRegistry(true);
        addDiagLog(`[REGISTRY] Loading global tenants...`);
        const res = await getFullRegistryAction();
        if (res.success) {
            setSchools(res.data || []);
            addDiagLog(`[REGISTRY] Loaded ${res.data?.length || 0} schools successfully.`);
        } else {
            addDiagLog(`[ERROR] Failed to load registry: ${res.error}`);
        }
        setLoadingRegistry(false);
    }, []);

    const loadHealth = useCallback(async () => {
        setIsLoadingHealth(true);
        addDiagLog(`[HEALTH] Fetching DB and system diagnostic statistics...`);
        const res = await getDatabaseHealth();
        if (res.success && res.stats) {
            setStats(res.stats);
            setSystem(res.system);
            addDiagLog(`[HEALTH] Database is responsive. Stats updated.`);
        } else {
            addDiagLog(`[ERROR] Database check failed: ${res.error}`);
        }
        setIsLoadingHealth(false);
    }, []);

    const loadLogs = useCallback(async () => {
        setLoadingLogs(true);
        addDiagLog(`[LOGS] Fetching Activity logs stream...`);
        const res = await getActivityLogsAction({
            actionType: filterAction || undefined,
            search: filterSearch || undefined
        });
        if (res.success) {
            setActivityLogs(res.logs || []);
            if (res.actionTypes) setActionTypes(res.actionTypes);
            addDiagLog(`[LOGS] Stream updated: ${res.logs?.length || 0} events loaded.`);
        } else {
            addDiagLog(`[ERROR] Activity log query failed: ${res.error}`);
        }
        setLoadingLogs(false);
    }, [filterAction, filterSearch]);

    useEffect(() => {
        loadRegistry();
        loadHealth();
    }, [loadRegistry, loadHealth]);

    useEffect(() => {
        if (activeTab === "logs") {
            loadLogs();
        }
    }, [activeTab, loadLogs]);

    // Auto-suggest schoolCode
    useEffect(() => {
        if (schoolForm.schoolName && !schoolForm.schoolCode) {
            const words = schoolForm.schoolName.trim().toUpperCase().split(/\s+/);
            const code = words.length >= 2
                ? words.map(w => w[0]).join("").substring(0, 6)
                : words[0].substring(0, 4);
            setSchoolForm(p => ({ ...p, schoolCode: code }));
        }
    }, [schoolForm.schoolName]);

    // Code availability check
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

    // ─── Actions Execution ───────────────────────────────────────────────────
    const submitSchool = async () => {
        setError(null); setSubmitting(true);
        addDiagLog(`[ACTION] Provisioning school node ${schoolForm.schoolCode}...`);
        try {
            const res = await createSchoolAction(schoolForm);
            if (res.success) {
                setSuccessResult(res);
                setActivePanel(null);
                setSchoolForm({ schoolName: "", schoolCode: "", city: "Sangareddy", phone: "", ownerFirstName: "", ownerLastName: "", ownerEmail: "", academicYear: "2026-27", academicYearStart: "2026-06-01" });
                addDiagLog(`[SUCCESS] School provisioned!`);
                await loadRegistry();
                await loadHealth();
            } else { 
                setError(res.error || "Failed"); 
                addDiagLog(`[ERROR] Provisioning failed: ${res.error}`);
            }
        } catch (e: any) { 
            setError(e.message); 
            addDiagLog(`[ERROR] ${e.message}`);
        }
        setSubmitting(false);
    };

    const submitBranch = async () => {
        setError(null); setSubmitting(true);
        addDiagLog(`[ACTION] Provisioning branch ${branchForm.branchCode} for school ${branchForm.schoolId}...`);
        try {
            const res = await createBranchAction({
                ...branchForm,
                createAdmin: branchForm.createAdmin,
            });
            if (res.success) {
                const creds = (res as any).data?.adminResult;
                setSuccessResult(creds ? { credentials: creds } : { credentials: { note: "Branch created. No admin credentials." } });
                setActivePanel(null);
                setBranchForm({ schoolId: "", branchName: "", branchCode: "", city: "", phone: "", createAdmin: false, adminFirstName: "", adminLastName: "", adminEmail: "", adminPhone: "" });
                addDiagLog(`[SUCCESS] Branch created.`);
                await loadRegistry();
                await loadHealth();
            } else { 
                setError(res.error || "Failed"); 
                addDiagLog(`[ERROR] Branch provisioning failed: ${res.error}`);
            }
        } catch (e: any) { 
            setError(e.message); 
            addDiagLog(`[ERROR] ${e.message}`);
        }
        setSubmitting(false);
    };

    const submitOwner = async () => {
        setError(null); setSubmitting(true);
        addDiagLog(`[ACTION] Creating admin account ${ownerForm.email}...`);
        try {
            const res = await createOwnerAction(ownerForm);
            if (res.success) {
                setSuccessResult(res);
                setActivePanel(null);
                setOwnerForm({ schoolId: "", branchId: "", firstName: "", lastName: "", email: "", phone: "", role: "OWNER" });
                addDiagLog(`[SUCCESS] Admin user provisioned.`);
                await loadRegistry();
                await loadHealth();
            } else { 
                setError(res.error || "Failed"); 
                addDiagLog(`[ERROR] User creation failed: ${res.error}`);
            }
        } catch (e: any) { 
            setError(e.message); 
            addDiagLog(`[ERROR] ${e.message}`);
        }
        setSubmitting(false);
    };

    const handleSearchStaff = async () => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setError("Search query must be at least 2 characters.");
            return;
        }
        setError(null);
        setSearchLoading(true);
        addDiagLog(`[SEARCH] Querying directory for "${searchQuery}"...`);
        try {
            const res = await searchStaffUsersAction(searchQuery);
            if (res.success) {
                setSearchResults(res.data || []);
                addDiagLog(`[SUCCESS] Found ${res.data?.length || 0} matches.`);
                if (res.data?.length === 0) setError("No users found matching query.");
            } else {
                setError(res.error || "Search failed");
            }
        } catch (e: any) {
            setError(e.message);
        }
        setSearchLoading(false);
    };

    const handleResetPassword = async () => {
        if (!selectedUser) return;
        setError(null);
        setSubmitting(true);
        addDiagLog(`[ACTION] Resetting password for user ID ${selectedUser.id}...`);
        try {
            const res = await resetUserPasswordAction(
                selectedUser.id,
                autoGenerate ? undefined : customPassword
            );
            if (res.success) {
                setSuccessResult(res);
                setSelectedUser(null);
                setSearchQuery("");
                setSearchResults([]);
                addDiagLog(`[SUCCESS] Password updated successfully.`);
            } else {
                setError(res.error || "Reset failed");
                addDiagLog(`[ERROR] Reset failed: ${res.error}`);
            }
        } catch (e: any) {
            setError(e.message);
        }
        setSubmitting(false);
    };

    const runAudit = async () => {
        setAuditResult(null); setSubmitting(true);
        addDiagLog(`[AUDIT] Running tenancy isolation check for ${auditSchoolId}...`);
        try {
            const res = await auditTenancyIsolationAction(auditSchoolId);
            setAuditResult(res);
            addDiagLog(`[COMPLETE] Tenancy isolation verified.`);
        } catch (e: any) { 
            setAuditResult({ success: false, error: e.message }); 
            addDiagLog(`[ERROR] Tenancy isolation audit crashed.`);
        }
        setSubmitting(false);
    };

    const runIDSpecAudit = async () => {
        setIsLoadingAudit(true);
        setIdAuditResults(null);
        addDiagLog(`[AUDIT] Launching recursive ID specification audit...`);
        try {
            const res = await executeFullIDAudit();
            if (res.success) {
                setIdAuditResults(res.summary);
                addDiagLog(`[COMPLETE] ID spec check completed. Found ${res.summary.totalIssues} compliance failures.`);
            } else {
                addDiagLog(`[ERROR] Spec compliance audit failed.`);
            }
        } catch (e: any) {
            addDiagLog(`[ERROR] ${e.message}`);
        }
        setIsLoadingAudit(false);
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
        <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-blue-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200/60 sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-[1700px] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <Terminal className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Virtual command core</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Core Developer Command Suite · Multi-Tenant</p>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-3">
                        <nav className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-xl">
                            {[
                                { id: "monitoring", label: "Monitoring", icon: Activity },
                                { id: "admin", label: "Administration", icon: Globe },
                                { id: "resets", label: "Resets & Passwords", icon: Key },
                                { id: "audits", label: "Audits & Tenancy", icon: ShieldCheck },
                                { id: "logs", label: "Activity Logs", icon: Terminal },
                                { id: "specs", label: "Specs", icon: BookOpen },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        activeTab === tab.id
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <button onClick={loadRegistry} className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={async () => {
                                const res = await signOutAction();
                                if (res.success) {
                                    window.location.href = "/login";
                                }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl border border-rose-100 hover:border-transparent transition-all font-black text-[10px] uppercase tracking-wider shadow-sm"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Core Workspace Grid */}
            <main className="max-w-[1700px] mx-auto px-6 py-8 w-full flex-grow flex flex-col xl:flex-row gap-6 relative">
                
                {/* Active tab content container */}
                <div className="flex-1 space-y-6 min-w-0">
                    
                    {/* ── MONITORING TAB ──────────────────────────────────── */}
                    {activeTab === "monitoring" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Active Tenants", value: stats?.schools, icon: Building2, color: "text-blue-600", bg: "bg-blue-50/50 border-blue-100" },
                                    { label: "Total Branches", value: stats?.branches, icon: GitBranch, color: "text-indigo-600", bg: "bg-indigo-50/50 border-indigo-100" },
                                    { label: "Total Identities", value: stats?.staff, icon: Users, color: "text-slate-700", bg: "bg-slate-100 border-slate-200/50" },
                                    { label: "Registry Size", value: stats?.students, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50/50 border-emerald-100" },
                                ].map((item, i) => (
                                    <div key={i} className={cn("bg-white border rounded-[1.5rem] p-5 flex items-center justify-between shadow-sm", item.bg)}>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                                            <p className={cn("text-3xl font-black mt-1 tracking-tighter", item.color)}>
                                                {isLoadingHealth ? "---" : (item.value || 0).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white border rounded-xl shadow-inner shrink-0">
                                            <item.icon className={cn("w-6 h-6", item.color)} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Schema trace density table */}
                            <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <Database className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Database Schema Densities</span>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active Database Trace counts</p>
                                        </div>
                                    </div>
                                    <button onClick={loadHealth} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-100 transition-colors">
                                        <RefreshCcw className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px] border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                                <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Model Name</th>
                                                <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Record Count</th>
                                                <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Gating Compliance</th>
                                                <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em] text-right">Tracing Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[
                                                { name: "AcademicYear", count: stats?.years, status: "System-Locked", color: "blue" },
                                                { name: "Branch", count: stats?.branches, status: "Isolated Tenant", color: "indigo" },
                                                { name: "ActivityLog", count: stats?.audits, status: "Ledger Immutable", color: "emerald" },
                                                { name: "Student", count: stats?.students, status: "Indexed & Tenant Gated", color: "slate" },
                                            ].map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-all">
                                                    <td className="p-4 font-bold text-slate-700 flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        {row.name}
                                                    </td>
                                                    <td className="p-4 font-black text-slate-900 text-sm">
                                                        {isLoadingHealth ? "..." : (row.count || 0)}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100", `bg-${row.color}-50 text-${row.color}-600`)}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right text-slate-400 font-black uppercase tracking-widest text-[9px]">
                                                        Online
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Node specs */}
                            <div className="p-6 bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/30 space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                                    <Server className="w-4 h-4 text-blue-500" /> Runtime Spec Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                                        <span className="text-slate-500 font-bold uppercase">Node Engine</span>
                                        <span className="font-black text-slate-800">{system?.nodeVersion || "Node.js v20"}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                                        <span className="text-slate-500 font-bold uppercase">Host Platform</span>
                                        <span className="font-black text-slate-800">{system?.platform || "Linux/Vercel Server"}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                                        <span className="text-slate-500 font-bold uppercase">Process Heap</span>
                                        <span className="font-black text-slate-800">{system?.memoryUsage || "---"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ADMINISTRATION / REGISTRY TAB ──────────────────── */}
                    {activeTab === "admin" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Management Actions bar */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={() => resetAndOpen("school")} className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                                    <School className="w-4 h-4" /> Provision New School
                                </button>
                                <button onClick={() => resetAndOpen("branch")} className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                                    <GitBranch className="w-4 h-4" /> Add campus Branch
                                </button>
                                <button onClick={() => resetAndOpen("owner")} className="px-5 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 flex items-center gap-2 transition-all active:scale-[0.98]">
                                    <UserPlus className="w-4 h-4" /> Register Admin User
                                </button>
                            </div>

                            {/* Main registry list */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                                        <Building2 className="w-5 h-5 text-blue-600" /> Active School nodes
                                        <span className="ml-2 text-[10px] bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-lg font-black">
                                            {schools.length} registered
                                        </span>
                                    </h2>
                                </div>

                                {loadingRegistry ? (
                                    <div className="bg-white rounded-3xl py-20 border flex justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : schools.length === 0 ? (
                                    <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 py-20 text-center">
                                        <School className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                        <p className="font-black text-slate-500">No schools registered</p>
                                        <p className="text-xs text-slate-400 mt-1">Start by provisioning a new school node above.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {schools.map((school) => (
                                            <div key={school.id} className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden transition-all hover:border-slate-300">
                                                {/* School node header row */}
                                                <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs shrink-0 shadow-inner">
                                                            {school.code.substring(0, 2)}
                                                        </div>
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h3 className="text-base font-black text-slate-900 tracking-tight">{school.name}</h3>
                                                                <Badge text={school.code} color="blue" />
                                                                <Badge text={school.status || "ACTIVE"} color={school.status === "ACTIVE" ? "green" : "amber"} />
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 font-medium">
                                                                <span>{school.branches?.length || 0} campus branch{school.branches?.length !== 1 ? "es" : ""}</span>
                                                                <span>·</span>
                                                                {school.staff?.length > 0 ? (
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <Users className="w-3.5 h-3.5" />
                                                                        {school.staff.map((owner: any) => (
                                                                            <span key={owner.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600">
                                                                                {owner.firstName} {owner.lastName}
                                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", owner.onboardingStatus === "PASSWORD_CHANGE_REQUIRED" ? "bg-amber-400" : "bg-emerald-500")} />
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-rose-500 font-bold">No owner registered</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                        <button
                                                            onClick={() => { resetAndOpen("branch"); setBranchForm(p => ({ ...p, schoolId: school.id })); }}
                                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl transition-all flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Branch
                                                        </button>
                                                        <button
                                                            onClick={() => { resetAndOpen("owner"); setOwnerForm(p => ({ ...p, schoolId: school.id })); }}
                                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-200 hover:bg-slate-900 hover:text-white text-slate-600 rounded-xl transition-all flex items-center gap-1"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" /> Admin
                                                        </button>
                                                        <button
                                                            onClick={() => toggleExpand(school.id)}
                                                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 transition-all"
                                                        >
                                                            {expanded.has(school.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanding Campus details */}
                                                {expanded.has(school.id) && (
                                                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-5">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                                <GitBranch className="w-3.5 h-3.5 text-indigo-500" /> Campus Branches
                                                            </h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {(school.branches || []).map((branch: any) => (
                                                                <div key={branch.id} className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between">
                                                                    <div>
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <p className="font-black text-slate-800 text-sm truncate">{branch.name}</p>
                                                                                    <Badge text={branch.code} color="slate" />
                                                                                </div>
                                                                                <p className="text-xs text-slate-400 mt-1 font-medium truncate">{branch.address || "No address"}</p>
                                                                            </div>
                                                                            <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5", branch.status === "Active" ? "bg-emerald-500" : "bg-amber-400")} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                                                        <span className="text-[9px] font-mono text-slate-300 font-bold uppercase">{branch.id}</span>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const res = await switchSchoolContextAction(school.id, branch.id);
                                                                                if (res.success) {
                                                                                    window.location.href = '/dashboard';
                                                                                } else {
                                                                                    alert(res.error || "Failed to switch context");
                                                                                }
                                                                            }}
                                                                            className="text-[10px] font-black text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-transparent flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl transition-all"
                                                                        >
                                                                            <Eye className="w-3 h-3" /> Impersonate
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {(!school.branches || school.branches.length === 0) && (
                                                                <div className="col-span-full py-6 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                                                                    No branches created.
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
                        </div>
                    )}

                    {/* ── PASSWORDS & RESETS TAB ─────────────────────────── */}
                    {activeTab === "resets" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40">
                                <div className="max-w-xl space-y-6">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                                            <Key className="w-5 h-5 text-rose-500" /> Account password resets
                                        </h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Configure & Reset password for any system identity</p>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700">
                                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                            <p className="text-sm font-semibold">{error}</p>
                                        </div>
                                    )}

                                    {!selectedUser ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search User Account</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={searchQuery}
                                                        onChange={e => setSearchQuery(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && handleSearchStaff()}
                                                        placeholder="Enter Name, Username, Email, Phone, or Code"
                                                        className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm outline-none border-2 bg-white border-slate-100 focus:border-rose-400 text-slate-800"
                                                    />
                                                    <button
                                                        onClick={handleSearchStaff}
                                                        disabled={searchLoading || searchQuery.trim().length < 2}
                                                        className="px-6 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                                                    >
                                                        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Results */}
                                            {searchResults.length > 0 && (
                                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                    {searchResults.map((user) => (
                                                        <div
                                                            key={user.id}
                                                            onClick={() => setSelectedUser(user)}
                                                            className="p-4 rounded-xl border-2 border-slate-100 hover:border-rose-400 bg-white hover:bg-rose-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-bold text-sm text-slate-800">{user.firstName} {user.lastName}</span>
                                                                    <span className="text-[9px] font-black bg-slate-100 border text-slate-500 px-1.5 py-0.5 rounded">{user.role}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 mt-1">
                                                                    {user.school?.name} · {user.branch?.name}
                                                                </p>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 text-rose-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="p-4 rounded-2xl bg-slate-50 border relative">
                                                <button onClick={() => setSelectedUser(null)} className="absolute top-3 right-3 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 px-2 py-1 bg-white border rounded">
                                                    Change
                                                </button>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Selected target</p>
                                                <div className="mt-2 text-xs">
                                                    <h4 className="font-bold text-sm">{selectedUser.firstName} {selectedUser.lastName}</h4>
                                                    <p className="text-slate-400 mt-0.5 font-mono">{selectedUser.staffCode} ({selectedUser.role})</p>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={autoGenerate} onChange={() => setAutoGenerate(!autoGenerate)} className="w-4 h-4 accent-rose-600" />
                                                    <div className="text-xs">
                                                        <p className="font-bold text-slate-700">Auto-generate password</p>
                                                        <p className="text-slate-400">Cryptographically secure temporary credentials</p>
                                                    </div>
                                                </label>

                                                {!autoGenerate && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black uppercase text-slate-400">Custom Temporary Password</label>
                                                        <input
                                                            type="text"
                                                            value={customPassword}
                                                            onChange={e => setCustomPassword(e.target.value)}
                                                            className="w-full px-4 py-3 rounded-xl border font-semibold text-sm outline-none"
                                                            placeholder="Min 6 characters"
                                                        />
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleResetPassword}
                                                    disabled={submitting || (!autoGenerate && customPassword.length < 6)}
                                                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-[0.98]"
                                                >
                                                    {submitting ? "Resetting..." : "Confirm & Reset Password"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── AUDITS & TENANCY TAB ───────────────────────────── */}
                    {activeTab === "audits" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Recursive ID spec scan */}
                            <div className="p-8 bg-white border border-slate-200/60 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                                </div>
                                <div className="max-w-md">
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Identity Compliance Auditor</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Verifies that all entity IDs strictly conform to the global V1 specification.</p>
                                </div>
                                <button
                                    onClick={runIDSpecAudit}
                                    disabled={isLoadingAudit}
                                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95"
                                >
                                    {isLoadingAudit ? "Auditing..." : "Initialize ID Spec Audit"}
                                </button>
                            </div>

                            {idAuditResults && (
                                <div className="space-y-4">
                                    <div className={cn("p-4 rounded-xl border flex items-center justify-between text-xs font-black uppercase tracking-widest",
                                        idAuditResults.totalIssues === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-rose-50 border-rose-200 text-rose-600"
                                    )}>
                                        <span>Compliance Status: {idAuditResults.totalIssues === 0 ? "RELIANT" : "CONFLICTS DETECTED"}</span>
                                        <span className="text-xl">{idAuditResults.totalIssues} issues</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-white border p-5 rounded-2xl">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Student ID Faults</p>
                                            {idAuditResults.details?.students?.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic font-medium">None detected.</p>
                                            ) : (
                                                idAuditResults.details?.students?.map((err: string, i: number) => (
                                                    <p key={i} className="text-[10px] text-rose-500 font-mono">{err}</p>
                                                ))
                                            )}
                                        </div>
                                        <div className="bg-white border p-5 rounded-2xl">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Staff ID Faults</p>
                                            {idAuditResults.details?.staff?.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic font-medium">None detected.</p>
                                            ) : (
                                                idAuditResults.details?.staff?.map((err: string, i: number) => (
                                                    <p key={i} className="text-[10px] text-rose-500 font-mono">{err}</p>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cross-tenant database audit */}
                            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 space-y-6">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase">Cross-Tenant Isolation Auditor</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-check database record isolation layers per school</p>
                                </div>

                                <div className="max-w-md space-y-4">
                                    <Select label="School context to verify" value={auditSchoolId} onChange={v => setAuditSchoolId(v)} options={[{ value: "", label: "— Choose School —" }, ...schoolOptions]} />
                                    <button
                                        onClick={runAudit}
                                        disabled={submitting || !auditSchoolId}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                                    >
                                        {submitting ? "Running Audit..." : "Execute Tenancy Check"}
                                    </button>
                                </div>

                                {auditResult && (
                                    <div className={cn("p-5 border rounded-2xl max-w-lg", auditResult.success ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50 border-rose-100")}>
                                        {auditResult.success ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-emerald-800">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                    <span className="font-black text-xs uppercase tracking-wider">Isolation Secure</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-center">
                                                    {Object.entries(auditResult.audit.ownRecords).map(([k, v]) => (
                                                        <div key={k} className="bg-white rounded-xl border p-3">
                                                            <p className="text-xl font-black text-emerald-700">{v as number}</p>
                                                            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{k}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium italic">
                                                    Interceptor: {auditResult.audit.isolation}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                    Foreign Student registry count: {auditResult.audit.globalStats.totalOtherStudents}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs font-semibold text-rose-600">{auditResult.error}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── ACTIVITY LOGS TAB ──────────────────────────────── */}
                    {activeTab === "logs" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            {/* Filter panel */}
                            <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl w-full md:w-80">
                                        <Search className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search logs (Details, User, ID)..."
                                            value={filterSearch}
                                            onChange={e => setFilterSearch(e.target.value)}
                                            className="bg-transparent border-none outline-none text-xs w-full font-medium"
                                        />
                                    </div>

                                    <select
                                        value={filterAction}
                                        onChange={e => setFilterAction(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 outline-none w-full md:w-56"
                                    >
                                        <option value="">All Actions</option>
                                        {actionTypes.map((act) => (
                                            <option key={act} value={act}>{act}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={loadLogs}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2"
                                >
                                    <RefreshCcw className={cn("w-3.5 h-3.5", loadingLogs && "animate-spin")} />
                                    Refresh Logs
                                </button>
                            </div>

                            {/* Logs table */}
                            <div className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/40">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <Terminal className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-widest text-slate-900">Platform Activity Logs</span>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Live Audit Trail</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {loadingLogs ? (
                                        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Fetching logs...</p>
                                        </div>
                                    ) : activityLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                                            <AlertTriangle className="w-8 h-8 mb-3 opacity-50 text-amber-500" />
                                            <p className="text-xs font-bold uppercase tracking-widest">No matching activity logs found.</p>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                                    <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Action / Event</th>
                                                    <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Entity</th>
                                                    <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Actor</th>
                                                    <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em]">Details / Description</th>
                                                    <th className="p-4 text-slate-400 font-black uppercase tracking-[0.2em] text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activityLogs.map((log) => {
                                                    const isSensitive = log.action.includes("RESET") || log.action.includes("PURGE") || log.action.includes("DELETE");
                                                    const isGenesis = log.action.includes("GENESIS") || log.action.includes("INITIALIZATION");
                                                    return (
                                                        <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                                                            <td className="p-4">
                                                                <span className={cn(
                                                                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                                    isSensitive ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                                    isGenesis ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                                    "bg-blue-50 text-blue-600 border-blue-100"
                                                                )}>
                                                                    {log.action}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 font-mono text-[9px] text-slate-500">
                                                                <div className="font-bold text-slate-700">{log.entityType}</div>
                                                                <div className="opacity-60">{log.entityId}</div>
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-700">
                                                                {log.userId}
                                                            </td>
                                                            <td className="p-4 text-slate-500 font-medium max-w-[300px] truncate" title={log.details}>
                                                                {log.details || "-"}
                                                            </td>
                                                            <td className="p-4 text-right text-slate-400 font-black uppercase tracking-widest text-[9px]">
                                                                {new Date(log.createdAt).toLocaleString("en-IN", {
                                                                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
                                                                })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ARCHITECTURE / SPECS TAB ───────────────────────── */}
                    {activeTab === "specs" && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-white border border-slate-200/60 rounded-3xl space-y-4 shadow-sm">
                                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Identity Schema V1.0
                                    </h3>
                                    <div className="space-y-4 text-xs text-slate-500 font-semibold leading-relaxed">
                                        <p>Global ID structures ensure tenancy containment and complete portability across infrastructure nodes.</p>
                                        <div className="p-4 bg-slate-50 border rounded-xl font-mono text-[10px] space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Student ID:</span>
                                                <span className="text-emerald-600 font-bold">SCH-BR-STU-YYYY-XXXX</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Staff ID:</span>
                                                <span className="text-indigo-600 font-bold">SCH-USR-ROLE-XXXX</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Branch ID:</span>
                                                <span className="text-blue-600 font-bold">SCH-BR-CODE</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-slate-200/60 rounded-3xl space-y-4 shadow-sm">
                                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                        <HardDrive className="w-4 h-4" /> Global Sequencing Logic
                                    </h3>
                                    <div className="space-y-4 text-xs text-slate-500 font-semibold leading-relaxed">
                                        <p>Enforces sequentially generated staff code structures (e.g. `VIVES-SNB-PRIN-0001`) atomically in the registry database to prevent collision.</p>
                                        <div className="p-4 bg-slate-50 border rounded-xl font-mono text-[10px] space-y-2 text-center text-slate-600">
                                            Prisma Transactions + Atomic Tenant Sequence Counters
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 📟 DEEP TRACE DIAGNOSTICS TERMINAL (Sidebar for technical context) */}
                <div className="w-full xl:w-80 shrink-0 space-y-6">
                    <div className="bg-[#080808] border border-white/10 rounded-[2rem] overflow-hidden flex flex-col h-[550px] shadow-2xl sticky top-24">
                        <div className="p-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.3em]">DEEP TRACE</span>
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                            </div>
                        </div>
                        <div className="p-5 flex-grow overflow-y-auto space-y-2 font-mono custom-scrollbar bg-black/40">
                            {diagnosticLogs.map((log, i) => (
                                <div key={i} className={cn(
                                    "text-[10px] leading-relaxed transition-all",
                                    log.includes('[ERROR]') ? "text-rose-400" :
                                    log.includes('[SUCCESS]') ? "text-emerald-400" :
                                    log.includes('[SYSTEM]') ? "text-blue-400 font-bold" : "text-neutral-500"
                                )}>
                                    <span className="opacity-20 mr-2 text-[8px]">{diagnosticLogs.length - i}</span>
                                    <span className="text-neutral-700 mr-2 opacity-50 select-none">›</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                        <div className="p-3 bg-black/60 border-t border-white/5 text-center">
                            <span className="text-[8px] font-black text-neutral-700 uppercase tracking-widest italic">Secure Diagnostics Tunnel</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Slide-over Provisioning Drawers */}
            {activePanel && (
                <div className="fixed inset-0 z-[200] flex animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setActivePanel(null)} />
                    <div className="relative ml-auto w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-250">
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-xl",
                                    activePanel === "school" ? "bg-blue-50 text-blue-600"
                                    : activePanel === "branch" ? "bg-indigo-50 text-indigo-600"
                                    : "bg-slate-100 text-slate-700"
                                )}>
                                    {activePanel === "school" && <School className="w-5 h-5" />}
                                    {activePanel === "branch" && <GitBranch className="w-5 h-5" />}
                                    {activePanel === "owner" && <UserPlus className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                                        {activePanel === "school" && "Provision School"}
                                        {activePanel === "branch" && "Provision Branch"}
                                        {activePanel === "owner" && "Register Admin Account"}
                                    </h2>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {activePanel === "school" && "Genesis initialization sequence"}
                                        {activePanel === "branch" && "Add physical campus registry"}
                                        {activePanel === "owner" && "Bind privileged user to school"}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setActivePanel(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body Form */}
                        <div className="flex-grow px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p className="text-xs font-bold leading-relaxed">{error}</p>
                                </div>
                            )}

                            {/* SCHOOL FORM */}
                            {activePanel === "school" && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[10px] text-blue-700 font-bold uppercase tracking-wider leading-relaxed flex items-start gap-2">
                                        <Sparkles className="w-4 h-4 shrink-0" />
                                        <span>Instantiates School node + Main HQ Branch + Owner Staff Account + Academic Year + Chart of Accounts</span>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">🏫 School Metadata</h4>
                                        <Field label="School Name" value={schoolForm.schoolName} onChange={v => setSchoolForm(p => ({ ...p, schoolName: v }))} placeholder="Virtue Academy" required />
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unique Code (Immutable) *</label>
                                                {codeIndicator}
                                            </div>
                                            <input
                                                value={schoolForm.schoolCode}
                                                onChange={e => setSchoolForm(p => ({ ...p, schoolCode: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                                                placeholder="VIS"
                                                className="w-full px-4 py-3 rounded-xl font-black text-indigo-600 text-lg outline-none border-2 bg-white border-slate-100 focus:border-indigo-400"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="City" value={schoolForm.city} onChange={v => setSchoolForm(p => ({ ...p, city: v }))} />
                                            <Field label="Phone" value={schoolForm.phone} onChange={v => setSchoolForm(p => ({ ...p, phone: v }))} />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">👤 Owner / Founder credentials</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="First Name" value={schoolForm.ownerFirstName} onChange={v => setSchoolForm(p => ({ ...p, ownerFirstName: v }))} required />
                                            <Field label="Last Name" value={schoolForm.ownerLastName} onChange={v => setSchoolForm(p => ({ ...p, ownerLastName: v }))} required />
                                        </div>
                                        <Field label="Email Address" type="email" value={schoolForm.ownerEmail} onChange={v => setSchoolForm(p => ({ ...p, ownerEmail: v }))} required />
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">📅 Academic Calendar</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Year Tag" value={schoolForm.academicYear} onChange={v => setSchoolForm(p => ({ ...p, academicYear: v }))} placeholder="2026-27" required />
                                            <Field label="Start Date" type="date" value={schoolForm.academicYearStart} onChange={v => setSchoolForm(p => ({ ...p, academicYearStart: v }))} required />
                                        </div>
                                    </div>

                                    <button
                                        onClick={submitSchool}
                                        disabled={submitting || !schoolForm.schoolName || !schoolForm.schoolCode || !schoolForm.ownerEmail}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        {submitting ? "Provisioning..." : "Provision Node"}
                                    </button>
                                </div>
                            )}

                            {/* BRANCH FORM */}
                            {activePanel === "branch" && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">🏫 School Context</h4>
                                        <Select label="School Node" value={branchForm.schoolId} onChange={v => setBranchForm(p => ({ ...p, schoolId: v }))} options={[{ value: "", label: "— Choose School —" }, ...schoolOptions]} required />
                                    </div>

                                    {branchForm.schoolId && (
                                        <div className="space-y-6 animate-in slide-in-from-top-4 duration-250">
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">🏢 Branch Profile</h4>
                                                <Field label="Branch Name" value={branchForm.branchName} onChange={v => setBranchForm(p => ({ ...p, branchName: v }))} placeholder="West Campus" required />
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branch Code *</label>
                                                        {codeIndicator}
                                                    </div>
                                                    <input
                                                        value={branchForm.branchCode}
                                                        onChange={e => setBranchForm(p => ({ ...p, branchCode: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                                                        placeholder="WEST"
                                                        className="w-full px-4 py-3 rounded-xl font-black text-indigo-600 text-lg outline-none border-2 bg-white border-slate-100 focus:border-indigo-400"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="City" value={branchForm.city} onChange={v => setBranchForm(p => ({ ...p, city: v }))} />
                                                    <Field label="Phone" value={branchForm.phone} onChange={v => setBranchForm(p => ({ ...p, phone: v }))} />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input type="checkbox" checked={branchForm.createAdmin} onChange={() => setBranchForm(p => ({ ...p, createAdmin: !branchForm.createAdmin }))} className="w-4 h-4 accent-indigo-600" />
                                                    <div className="text-xs">
                                                        <p className="font-bold text-slate-700">Provision Principal Staff Account</p>
                                                        <p className="text-slate-400">Creates an administrator credentials set mapped to this branch</p>
                                                    </div>
                                                </label>

                                                {branchForm.createAdmin && (
                                                    <div className="space-y-4 border-l-2 border-indigo-200 pl-4 py-1 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <Field label="First Name" value={branchForm.adminFirstName || ""} onChange={v => setBranchForm(p => ({ ...p, adminFirstName: v }))} required />
                                                            <Field label="Last Name" value={branchForm.adminLastName || ""} onChange={v => setBranchForm(p => ({ ...p, adminLastName: v }))} required />
                                                        </div>
                                                        <Field label="Email" type="email" value={branchForm.adminEmail || ""} onChange={v => setBranchForm(p => ({ ...p, adminEmail: v }))} required />
                                                        <Field label="Phone Number" type="tel" value={branchForm.adminPhone || ""} onChange={v => setBranchForm(p => ({ ...p, adminPhone: v.replace(/\s+/g, "") }))} required placeholder="+91" />
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={submitBranch}
                                                disabled={submitting || !branchForm.branchName || !branchForm.branchCode || (branchForm.createAdmin && (!branchForm.adminEmail || !branchForm.adminPhone))}
                                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                                            >
                                                {submitting ? "Provisioning..." : "Provision Branch"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* OWNER FORM */}
                            {activePanel === "owner" && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">🏫 Scope & Role</h4>
                                        <Select label="School Node" value={ownerForm.schoolId} onChange={v => { setOwnerForm(p => ({ ...p, schoolId: v, branchId: "" })); }} options={[{ value: "", label: "— Choose School —" }, ...schoolOptions]} required />
                                        
                                        {ownerForm.schoolId && (
                                            <Select label="Campus Branch" value={ownerForm.branchId} onChange={v => setOwnerForm(p => ({ ...p, branchId: v }))} options={[{ value: "", label: "— Choose Branch —" }, ...ownerBranchOptions]} required />
                                        )}

                                        <Select
                                            label="System Role"
                                            value={ownerForm.role}
                                            onChange={v => setOwnerForm(p => ({ ...p, role: v as any }))}
                                            options={[
                                                { value: "OWNER", label: "OWNER — Full School administrative node access" },
                                                { value: "PRINCIPAL", label: "PRINCIPAL — Branch-level scope access" },
                                                { value: "ACCOUNTANT", label: "ACCOUNTANT — Financial module access only" }
                                            ]}
                                            required
                                        />
                                    </div>

                                    {ownerForm.schoolId && ownerForm.branchId && (
                                        <div className="space-y-4 animate-in slide-in-from-top-4 duration-250">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2">👤 Admin Details</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Field label="First Name" value={ownerForm.firstName} onChange={v => setOwnerForm(p => ({ ...p, firstName: v }))} required />
                                                <Field label="Last Name" value={ownerForm.lastName} onChange={v => setOwnerForm(p => ({ ...p, lastName: v }))} required />
                                            </div>
                                            <Field label="Email Address" type="email" value={ownerForm.email} onChange={v => setOwnerForm(p => ({ ...p, email: v }))} required />
                                            <Field label="Phone Number" type="tel" value={ownerForm.phone} onChange={v => setOwnerForm(p => ({ ...p, phone: v.replace(/\s+/g, "") }))} required placeholder="+91" />

                                            <button
                                                onClick={submitOwner}
                                                disabled={submitting || !ownerForm.firstName || !ownerForm.lastName || !ownerForm.email || !ownerForm.phone}
                                                className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98]"
                                            >
                                                {submitting ? "Registering..." : "Register User"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Successful Provision Credentials Modal */}
            {successResult && (
                <ResultCard result={successResult} onClose={() => setSuccessResult(null)} />
            )}
        </div>
    );
}
