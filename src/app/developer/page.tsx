"use client";

/** 
 * 🏁 PaVa-EDUX COMMAND CENTER - GENESIS v3.0
 * CACHE_BUSTER_KEY: 2026-04-07-ELITE-HUB-PHASE2
 * High-Fidelity Institutional Registry with SQL Database Persistence.
 */

import React, { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Building2, Globe, Users, ArrowRight, 
  ShieldCheck, RefreshCcw, ChevronRight, SchoolIcon, X, 
  Loader2, CheckCircle2, MapPin, Zap, 
  ShieldAlert, Edit2, Activity, Settings2, Sparkles,
  Command, ChevronDown, ChevronUp, ExternalLink
} from "./icons";
import { cn } from "@/lib/utils";
import { getRegistryAction, provisionInstitutionalNodeAction, checkCodeAvailabilityAction } from "./actions";

// 🧠 AUTO-SUGGEST ENGINE (School Name -> Code)
// 🧠 ELITE AUTO-SUGGEST ENGINE
const suggestCodes = (name: string, secondary?: string) => {
  if (!name || name.length < 2) return [];
  const words = name.trim().toUpperCase().split(/\s+/);
  const suggestions = new Set<string>();
  
  // 1. Initial letters (VVS / RC)
  if (words.length >= 2) {
    const initials = words.map(w => w[0]).join("").substring(0, 6);
    suggestions.add(initials);
  }
  
  // 2. First word segments (VIVE, VIV / REDD, RED)
  const clean = words[0].replace(/[^A-Z]/g, "");
  if (clean.length >= 4) suggestions.add(clean.substring(0, 4));
  if (clean.length >= 3) suggestions.add(clean.substring(0, 3));
  
  // 3. Last word segments (VANI / COLO)
  if (words.length > 1) {
    const last = words[words.length - 1].replace(/[^A-Z]/g, "");
    if (last.length >= 3) suggestions.add(last.substring(0, 3));
  }

  // 4. City-based suggestions
  if (secondary) {
    const sWords = secondary.trim().toUpperCase().split(/\s+/);
    const sClean = sWords[0].replace(/[^A-Z]/g, "");
    
    // Combination: Name First Letter + City First 3 (R-SAN)
    if (name.length > 0 && sClean.length >= 3) {
      suggestions.add((name[0] + sClean.substring(0, 3)).toUpperCase());
    }
    
    // City alone
    if (sClean.length >= 3) suggestions.add(sClean.substring(0, 3));
    if (sClean.length >= 4) suggestions.add(sClean.substring(0, 4));
    
    // Hybrid: Initials + City (RC-S)
    if (words.length >= 2 && sClean.length >= 1) {
      suggestions.add(words.map(w => w[0]).join("") + sClean[0]);
    }
  }

  return Array.from(suggestions).filter(s => s.length >= 2).slice(0, 6);
};

export default function EliteCommandCenter() {
  const [activeTab, setActiveTab] = useState("registry");
  const [schools, setSchools] = useState<any[]>([]); 
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [isAddBranchMode, setIsAddBranchMode] = useState(false);
  
  const [search, setSearch] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);
  const [codeSuggestions, setCodeSuggestions] = useState<string[]>([]);
  const [isCodeAvailable, setIsCodeAvailable] = useState<boolean | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [lastGenesisResult, setLastGenesisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cycles, setCycles] = useState([
    { id: "2526", label: "2025-26", status: "COMPLETED", start: "2025-06-01", end: "2026-03-31" },
    { id: "2627", label: "2026-27", status: "ACTIVE", start: "2026-06-01", end: "2027-03-31" },
  ]);

  const refreshData = async () => {
    const data = await getRegistryAction();
    setSchools(data || []);
  };

  useEffect(() => { refreshData(); }, []);

  const [formData, setFormData] = useState({
    schoolId: "", schoolName: "", schoolCode: "", schoolStatus: "ACTIVE",
    affiliationBoard: "CBSE", affiliationNumber: "",
    country: "INDIA", state: "TELANGANA", 
    currencyCode: "INR", timezone: "Asia/Kolkata",
    academicStartMonth: "APRIL", defaultLanguage: "ENGLISH",
    ownerFullName: "", ownerEmail: "",
    branchName: "Main Campus", branchCode: "MAIN", isMainBranch: true,
    city: "Sangareddy", contactPhone: ""
  });

  useEffect(() => {
    if (!editingSchool && formData.schoolName && !formData.schoolCode) {
      const codes = suggestCodes(formData.schoolName);
      if (codes.length > 0) {
        setFormData(prev => ({ ...prev, schoolCode: codes[0], schoolId: `PaVa-${codes[0]}-HQ` }));
      }
    }
  }, [formData.schoolName, editingSchool]);

  // 🧠 REAL-TIME CODE INTELLIGENCE
  useEffect(() => {
    const isBranchContext = isAddBranchMode || activeStep === 5;
    
    const checkAvailability = async () => {
      const field = isBranchContext ? formData.branchCode : formData.schoolCode;
      if (!field || field.length < 2) {
        setIsCodeAvailable(null);
        return;
      }

      setIsValidatingCode(true);
      const isAvailable = await checkCodeAvailabilityAction(
        isBranchContext ? 'branch' : 'school',
        field,
        isBranchContext ? formData.schoolId : undefined
      );
      setIsCodeAvailable(isAvailable);
      setIsValidatingCode(false);
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.schoolCode, formData.branchCode, isAddBranchMode, activeStep, formData.schoolId]);

  // 🧪 SUGGESTION TRIGGER
  useEffect(() => {
    if (!editingSchool) {
      const isBranchContext = isAddBranchMode || activeStep === 5;
      const name = isBranchContext ? formData.branchName : formData.schoolName;
      const city = isBranchContext ? formData.city : undefined;
      const suggestions = suggestCodes(name, city);
      setCodeSuggestions(suggestions);
    }
  }, [formData.schoolName, formData.branchName, formData.city, isAddBranchMode, activeStep, editingSchool]);

  const toggleModal = (school: any = null, addBranch = false) => {
    setIsAddBranchMode(addBranch);
    if (school) {
        setEditingSchool(school);
        if (addBranch) {
            setFormData({
                ...formData,
                schoolId: school.id,
                schoolCode: school.code,
                branchName: "",
                branchCode: "",
                isMainBranch: false
            });
            setActiveStep(5);
        } else {
            setFormData({
                ...formData,
                ...school,
                schoolName: school.name,
                schoolCode: school.code,
                schoolStatus: school.status,
            });
            setActiveStep(1);
        }
    } else {
        setEditingSchool(null);
        setFormData({
            schoolId: `PaVa-${Math.random().toString(36).substring(7).toUpperCase()}`,
            schoolName: "", schoolCode: "", schoolStatus: "ACTIVE",
            affiliationBoard: "CBSE", affiliationNumber: "",
            country: "INDIA", state: "TELANGANA", 
            currencyCode: "INR", timezone: "Asia/Kolkata",
            academicStartMonth: "APRIL", defaultLanguage: "ENGLISH",
            ownerFullName: "", ownerEmail: "",
            branchName: "Main Campus", branchCode: "MAIN", isMainBranch: true,
            city: "Sangareddy", contactPhone: ""
        });
        setActiveStep(1);
    }
    setIsModalOpen(!isModalOpen);
    setIsSuccess(false);
    setErrorMessage(null);
  };

  const handleCommit = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
        const result = await provisionInstitutionalNodeAction({ ...formData, dryRun }, isAddBranchMode);
        if (result.success) {
            if (dryRun) {
                setLastGenesisResult(result.data);
            } else {
                setIsSuccess(true);
                await refreshData();
                setTimeout(() => {
                    setIsModalOpen(false);
                    setIsSuccess(false);
                }, 2000);
            }
        } else {
            setErrorMessage(result.error || "Failed to commit node to SQL registry.");
        }
    } catch (error: any) {
        console.error("Genesis Failure:", error);
        setErrorMessage(error.message || "A critical network or server error occurred.");
    } finally {
        setLoading(false);
    }
  };

  const toggleExpand = (code: string) => {
    const next = new Set(expandedSchools);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setExpandedSchools(next);
  };

  const filtered = (schools || []).filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex selection:bg-indigo-100 selection:text-indigo-700">
      <aside className="w-[100px] border-r border-slate-200 bg-white flex flex-col items-center py-10 gap-8">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Command className="w-7 h-7" />
        </div>
        <div className="flex flex-col gap-4">
            <SidebarItem icon={Activity} active />
            <SidebarItem icon={ShieldAlert} />
            <SidebarItem icon={Users} />
            <SidebarItem icon={RefreshCcw} />
        </div>
        <div className="mt-auto">
            <SidebarItem icon={Settings2} />
        </div>
      </aside>

      <main className="flex-1 p-10 lg:p-16 space-y-12 overflow-y-auto h-screen relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-100/30 rounded-full blur-[120px] -z-10" />
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-indigo-600 font-bold italic tracking-wider text-[10px] uppercase">
                   <Sparkles className="w-4 h-4" /> PaVa-EDUX COMMAND CENTER
                </div>
                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter leading-none">
                  {activeTab === "registry" ? "Identity Registry" : "Governance Hub"}
                </h1>
                <p className="text-lg text-slate-500 font-medium max-w-xl italic">
                  {activeTab === "registry" ? "Governing Phase 1 multi-tenant node provisioning." : "Governing Phase 2 academic cycles & permission engines."}
                </p>
              </div>

              <div className="flex bg-white p-2 rounded-2xl border border-slate-200 w-fit gap-2 shadow-sm">
                <button onClick={() => setActiveTab("registry")} className={cn("px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all tracking-widest", activeTab === "registry" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" : "text-slate-400 hover:text-slate-900")}>
                  School Registry
                </button>
                <button onClick={() => setActiveTab("governance")} className={cn("px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all tracking-widest", activeTab === "governance" ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" : "text-slate-400 hover:text-slate-900")}>
                  Governance & Cycles
                </button>
              </div>
           </div>

           {activeTab === "registry" && (
             <button onClick={() => toggleModal()} className="px-8 py-5 bg-indigo-600 hover:bg-slate-900 text-white rounded-3xl font-black shadow-2xl shadow-indigo-600/20 flex items-center gap-3 transition-all active:scale-[0.98] group">
                <div className="p-1.5 bg-white/20 rounded-lg group-hover:rotate-90 transition-transform">
                    <Plus className="w-5 h-5" />
                </div>
                Provision New Node
             </button>
           )}
        </header>

        {activeTab === "registry" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard label="Total Schools" value={schools.length.toString()} icon={Building2} color="text-indigo-600" />
              <StatCard label="Phase 1 Active" value="100%" icon={ShieldCheck} color="text-emerald-600" />
              <StatCard label="Global Nodes" value="12" icon={Globe} color="text-blue-600" />
              <StatCard label="System Load" value="Normal" icon={Activity} color="text-amber-500" />
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <Search className="w-6 h-6 text-slate-300 ml-4" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by School Code, ID or Name..." className="flex-1 bg-transparent border-none outline-none font-bold text-lg text-slate-800 placeholder:text-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-10 pb-20">
                {filtered.map((school, i) => (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={school.id} className="bg-white border border-slate-200 rounded-[50px] overflow-hidden shadow-sm hover:shadow-2xl transition-all group">
                        <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-50">
                            <div className="flex items-center gap-8">
                                <div className="w-24 h-24 bg-slate-50 rounded-[35px] flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-all">
                                    <SchoolIcon className="w-12 h-12 text-slate-300 group-hover:text-indigo-600" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">{school.name}</h3>
                                    <div className="flex items-center gap-4">
                                        <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest">{school.code}</span>
                                        <span className={cn("px-3 py-1 rounded-lg font-black text-[10px] uppercase italic tracking-tighter text-white", school.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500")}>{school.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => toggleModal(school)} className="w-14 h-14 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center justify-center transition-all"><Edit2 className="w-6 h-6" /></button>
                                <button onClick={() => toggleExpand(school.code)} className="px-10 py-5 bg-indigo-600 text-white rounded-[25px] font-black text-[12px] uppercase tracking-widest flex items-center gap-4 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                    {expandedSchools.has(school.code) ? <><ChevronUp className="w-5 h-5" /> Hide</> : <><ChevronDown className="w-5 h-5" /> Campuses</>}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedSchools.has(school.code) && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-50/50 p-10 space-y-8 overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xl font-black italic text-slate-400 uppercase flex items-center gap-3"><Zap className="w-5 h-5 text-indigo-600" /> Operational Registry</h4>
                                        <button onClick={() => toggleModal(school, true)} className="px-6 py-3 bg-white border-2 border-indigo-600/10 hover:border-indigo-600 text-indigo-600 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><Plus className="w-4 h-4" /> Add Campus</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {school.branches?.map((branch: any) => (
                                            <div key={branch.id} className="bg-white p-8 rounded-[35px] border border-indigo-600/5 shadow-sm relative group/branch">
                                                {branch.isMainBranch && <div className="absolute top-0 right-8 px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase italic rounded-b-xl shadow-lg">MAIN HQ</div>}
                                                <div className="space-y-4">
                                                    <h5 className="text-2xl font-black italic tracking-tighter">{branch.name}</h5>
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase italic tracking-widest">{branch.code} NODE</p>
                                                    <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-400 font-bold italic"><MapPin className="w-4 h-4" /> {branch.city || "Sangareddy"}</div>
                                                </div>
                                                <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:bg-indigo-600">
                                                    Enter Campus <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <section className="bg-white rounded-[40px] p-10 border border-slate-200 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Academic Cycles</h2>
                <button className="px-6 py-3 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all font-black text-[10px] uppercase flex items-center gap-2"><Plus className="w-4 h-4" /> New Session</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cycles.map(cycle => (
                  <div key={cycle.id} className="p-8 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-indigo-600/30 transition-all">
                    <div className="flex items-center gap-6">
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl italic", cycle.status === "ACTIVE" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500")}>{cycle.label.split("-")[1]}</div>
                      <div><h4 className="text-2xl font-black italic tracking-tighter mb-1">{cycle.label} Session</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cycle.start} to {cycle.end}</p></div>
                    </div>
                    <div className={cn("px-4 py-2 rounded-xl font-black text-[10px] uppercase italic tracking-tighter", cycle.status === "ACTIVE" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>{cycle.status}</div>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-slate-900 rounded-[40px] p-10 text-white space-y-8 shadow-2xl shadow-slate-900/40">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase">Global Permission Matrix</h2>
              <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-white/5"><th className="py-4 text-[10px] font-black uppercase text-white/30 italic">Module</th><th className="py-4 text-[10px] font-black uppercase text-indigo-400 italic">Owner</th><th className="py-4 text-[10px] font-black uppercase text-emerald-400 italic">Principal</th><th className="py-4 text-[10px] font-black uppercase text-slate-400 italic">Staff</th></tr></thead><tbody className="text-sm font-bold"><TableRow label="Financial Waivers" owner={true} principal={true} staff={false} /><TableRow label="Student Deletion" owner={true} principal={false} staff={false} /><TableRow label="Fee Configuration" owner={true} principal={true} staff={false} /><TableRow label="Attendance Access" owner={true} principal={true} staff={true} /></tbody></table></div>
            </section>
          </motion.div>
        )}

        <AnimatePresence>
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => toggleModal()} className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" />
                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="relative w-full max-w-5xl bg-white rounded-[50px] shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto max-h-[90vh]">
                        <div className="md:w-[360px] bg-indigo-600 p-12 text-white flex flex-col justify-between overflow-y-auto">
                            <div>
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md"><ShieldCheck className="w-8 h-8" /></div>
                                <h2 className="text-4xl font-black italic tracking-tighter leading-none mb-4">PAVA-EDUX Factory <span className="text-xs align-top opacity-50 ml-1">v3.0</span></h2>
                                <div className="mt-16 space-y-8 relative">
                                    {[
                                        { s: 1, l: "Basic Identity", i: Building2 },
                                        { s: 2, l: "Compliance Layer", i: ShieldAlert },
                                        { s: 3, l: "Regional Settings", i: Globe },
                                        { s: 4, l: "Academic Setup", i: RefreshCcw },
                                        { s: 5, l: "Finalize Node", i: Zap }
                                    ].map((step, i) => (
                                        <div key={i} className={cn("flex items-center gap-5 transition-all relative z-10", activeStep >= step.s ? "opacity-100" : "opacity-30")}>
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all", activeStep === step.s ? "bg-white text-indigo-600 scale-110" : "bg-indigo-500 text-white")}><step.i className="w-5 h-5" /></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">{step.l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white/10 p-6 rounded-3xl mt-12 backdrop-blur-md border border-white/5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-2 italic">Tenant Identity Preview</p>
                                <p className="text-lg font-black italic tracking-tighter truncate uppercase">{formData.schoolCode || "???"}-{formData.branchCode || "???"}</p>
                            </div>
                        </div>

                        <div className="flex-1 p-12 lg:p-20 overflow-y-auto">
                            {isSuccess ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in duration-500">
                                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100"><CheckCircle2 className="w-12 h-12 text-emerald-600" /></div>
                                    <h3 className="text-4xl font-black italic tracking-tighter uppercase">{isAddBranchMode ? "Campus Created" : "Genesis Confirmed"}</h3>
                                    <p className="text-slate-400 font-bold italic uppercase tracking-widest text-[10px]">Institutional Node Committed to Node FS.</p>
                                </div>
                            ) : (
                                <div className="space-y-12">
                                    {activeStep === 1 && (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                <InputGroup label="Internal Registry ID" placeholder="PaVa-DURGA-HQ" value={formData.schoolId} onChange={v => setFormData({...formData, schoolId: v})} colSpan={2} />
                                                <InputGroup label="Full School Name" placeholder="Durga International" value={formData.schoolName} onChange={v => setFormData({...formData, schoolName: v})} colSpan={2} />
                                                <div className="space-y-3 lg:col-span-1">
                                                    <div className="flex items-center justify-between ml-1">
                                                      <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Short Code (Immutable)</label>
                                                      {isValidatingCode ? (
                                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                                      ) : isCodeAvailable === true ? (
                                                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 className="w-3 h-3" /> Available</span>
                                                      ) : isCodeAvailable === false ? (
                                                        <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 uppercase"><X className="w-3 h-3" /> Taken</span>
                                                      ) : null}
                                                    </div>
                                                    <input readOnly={!!editingSchool} value={formData.schoolCode} onChange={e => setFormData({...formData, schoolCode: e.target.value.toUpperCase()})} className={cn("w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all font-black text-xl text-indigo-600 outline-none placeholder:text-slate-200", editingSchool && "opacity-50 cursor-not-allowed", isCodeAvailable === false && "border-rose-100 bg-rose-50/10")} placeholder="e.g. DURGA" />
                                                    
                                                    {codeSuggestions.length > 0 && !editingSchool && (
                                                      <div className="flex flex-wrap gap-2 pt-2">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mt-1.5 mr-1">Suggestions</span>
                                                        {codeSuggestions.map( sug => (
                                                          <button key={sug} onClick={() => setFormData({...formData, schoolCode: sug, schoolId: `PaVa-${sug}-HQ`})} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[10px] font-black rounded-lg transition-all border border-indigo-100">{sug}</button>
                                                        ))}
                                                      </div>
                                                    )}
                                                </div>
                                                <SelectGroup label="School Status" options={["ACTIVE", "SETUP", "SUSPENDED"]} value={formData.schoolStatus} onChange={v => setFormData({...formData, schoolStatus: v})} />
                                            </div>
                                            <StepButton onNext={() => setActiveStep(2)} />
                                        </div>
                                    )}
                                    {activeStep >= 2 && activeStep <= 4 && (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                {activeStep === 2 && (
                                                    <>
                                                        <SelectGroup label="Affiliation Board" options={["CBSE", "ICSE", "STATE", "IB", "IGCSE", "OTHER"]} value={formData.affiliationBoard} onChange={v => setFormData({...formData, affiliationBoard: v})} colSpan={2} />
                                                        <InputGroup label="Affiliation Number" placeholder="e.g. CBSE-123456" value={formData.affiliationNumber} onChange={v => setFormData({...formData, affiliationNumber: v})} colSpan={2} />
                                                    </>
                                                )}
                                                {activeStep === 3 && (
                                                    <>
                                                        <SelectGroup label="Country" options={["INDIA", "USA", "UAE", "OTHER"]} value={formData.country} onChange={v => setFormData({...formData, country: v})} />
                                                        <InputGroup label="State / Province" placeholder="e.g. TELANGANA" value={formData.state} onChange={v => setFormData({...formData, state: v})} />
                                                        <SelectGroup label="Currency Code" options={["INR", "USD", "AED", "GBP"]} value={formData.currencyCode} onChange={v => setFormData({...formData, currencyCode: v})} />
                                                        <SelectGroup label="Timezone" options={["Asia/Kolkata", "UTC", "America/New_York"]} value={formData.timezone} onChange={v => setFormData({...formData, timezone: v})} />
                                                    </>
                                                )}
                                                {activeStep === 4 && (
                                                    <>
                                                        <SelectGroup label="Academic Start Month" options={["JANUARY", "MARCH", "APRIL", "JUNE", "SEPTEMBER"]} value={formData.academicStartMonth} onChange={v => setFormData({...formData, academicStartMonth: v})} colSpan={2} />
                                                        <SelectGroup label="Default System Language" options={["ENGLISH", "HINDI", "TELUGU", "ARABIC"]} value={formData.defaultLanguage} onChange={v => setFormData({...formData, defaultLanguage: v})} colSpan={2} />
                                                        <InputGroup label="System Owner Email" value={formData.ownerEmail} onChange={v => setFormData({...formData, ownerEmail: v})} colSpan={2}/>
                                                    </>
                                                )}
                                            </div>
                                            <StepButton onBack={() => setActiveStep(activeStep - 1)} onNext={() => setActiveStep(activeStep + 1)} />
                                        </div>
                                    )}
                                    {activeStep === 5 && (
                                        <div className="space-y-10">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                <div className="lg:col-span-2 p-6 bg-slate-50/50 rounded-3xl border border-indigo-600/5 flex items-center justify-between">
                                                   <div>
                                                      <h5 className="font-black italic tracking-tighter text-indigo-600">Operational Unit Node</h5>
                                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAddBranchMode ? "Adding additional campus unit" : "Defining initial master branch"}</p>
                                                   </div>
                                                   <Zap className="w-8 h-8 text-indigo-600 opacity-20" />
                                                </div>
                                                <InputGroup label="Branch Name" value={formData.branchName} onChange={v => setFormData({...formData, branchName: v})} />
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between ml-1">
                                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Code</label>
                                                      {isValidatingCode ? (
                                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                                      ) : isCodeAvailable === true ? (
                                                        <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase"><CheckCircle2 className="w-3 h-3" /> Available</span>
                                                      ) : isCodeAvailable === false ? (
                                                        <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 uppercase"><X className="w-3 h-3" /> Taken</span>
                                                      ) : null}
                                                    </div>
                                                    <input value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value.toUpperCase()})} className={cn("w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all font-black text-xl text-slate-700 outline-none placeholder:text-slate-200", isCodeAvailable === false && "border-rose-100 bg-rose-50/10")} placeholder="e.g. MAIN" />
                                                    
                                                    {codeSuggestions.length > 0 && (
                                                      <div className="flex flex-wrap gap-2 pt-2">
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter mt-1.5 mr-1">Options</span>
                                                        {codeSuggestions.map(sug => (
                                                          <button key={sug} onClick={() => setFormData({...formData, branchCode: sug})} className="px-3 py-1.5 bg-indigo-50 hover:bg-slate-900 hover:text-white text-slate-600 text-[10px] font-black rounded-lg transition-all border border-indigo-100">{sug}</button>
                                                        ))}
                                                      </div>
                                                    )}
                                                </div>
                                                <InputGroup label="Unit City" placeholder="e.g. Sangareddy" value={formData.city} onChange={v => setFormData({...formData, city: v})} />
                                                <InputGroup label="Contact Phone" placeholder="+91" value={formData.contactPhone} onChange={v => setFormData({...formData, contactPhone: v})} />
                                            </div>

                                            {errorMessage && (
                                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[30px] flex items-center gap-4 text-rose-600">
                                                <div className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-600/30">
                                                  <ShieldAlert className="w-5 h-5" />
                                                </div>
                                                <div>
                                                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Commitment Collision</p>
                                                  <p className="text-sm font-black italic tracking-tighter">{errorMessage}</p>
                                                </div>
                                              </motion.div>
                                            )}

                                            <div className="pt-10 flex flex-col gap-4">
                                                <button onClick={handleCommit} disabled={isPending} className="w-full py-6 bg-indigo-600 hover:bg-black text-white rounded-[32px] font-black text-xl italic tracking-tighter transition-all shadow-2xl flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-50">
                                                    {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6 text-amber-300" /> Commit Instance Node</>}
                                                </button>
                                                {!isAddBranchMode && <button onClick={() => setActiveStep(4)} type="button" className="text-[10px] font-black text-slate-400 uppercase text-center hover:text-indigo-600 transition-all">Back to Academic Setup</button>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button onClick={() => toggleModal()} className="absolute top-10 right-10 p-3 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all shadow-sm">
                            <X className="w-6 h-6" />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TableRow({ label, owner, principal, staff }: { label: string, owner: boolean, principal: boolean, staff: boolean }) {
    return (
        <tr className="border-b border-white/5">
            <td className="py-5 text-white/60">{label}</td>
            <td className="py-5"><Check active={owner} color="text-indigo-400" /></td>
            <td className="py-5"><Check active={principal} color="text-emerald-400" /></td>
            <td className="py-5"><Check active={staff} color="text-slate-500" /></td>
        </tr>
    );
}

function Check({ active, color }: { active: boolean, color: string }) {
    return active ? (
        <CheckCircle2 className={cn("w-5 h-5", color)} />
    ) : (
        <X className="w-5 h-5 text-white/10" />
    );
}

function SidebarItem({ icon: Icon, active = false }: { icon: any, active?: boolean }) {
    return <div className={cn("p-4 rounded-2xl transition-all cursor-pointer", active ? "bg-indigo-50 text-indigo-600" : "text-slate-300 hover:bg-slate-50")}><Icon className="w-6 h-6" /></div>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
    return <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-indigo-500/30 transition-all"><div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{label}</p><p className={cn("text-4xl font-black italic tracking-tighter", color)}>{value}</p></div><div className="p-4 bg-slate-50 rounded-3xl group-hover:scale-110 transition-all"><Icon className={cn("w-6 h-6", color)} /></div></div>;
}

function InputGroup({ label, placeholder, value, onChange, colSpan = 1 }: { label: string, placeholder?: string, value: string, onChange: (v: string) => void, colSpan?: number }) {
  return <div className={cn("space-y-2", colSpan === 2 && "lg:col-span-2")}><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all font-bold text-slate-800 outline-none placeholder:text-slate-200" placeholder={placeholder} /></div>;
}

function SelectGroup({ label, options, value, onChange, colSpan = 1 }: { label: string, options: string[], value: string, onChange: (v: string) => void, colSpan?: number }) {
  return <div className={cn("space-y-2", colSpan === 2 && "lg:col-span-2")}><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label><select value={value} onChange={e => onChange(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all font-bold text-slate-800 outline-none appearance-none cursor-pointer">{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div>;
}

function StepButton({ onNext, onBack }: { onNext?: () => void, onBack?: () => void }) {
  return <div className="flex gap-4 pt-10">{onBack && <button type="button" onClick={onBack} className="flex-1 py-4 border-2 border-slate-100 rounded-3xl font-black text-slate-400 text-xs italic uppercase tracking-widest hover:bg-slate-50 transition-all">Back</button>}{onNext && <button type="button" onClick={onNext} className="flex-[2] py-4 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98]">Confirm & Continue<ArrowRight className="w-5 h-5" /></button>}</div>;
}
