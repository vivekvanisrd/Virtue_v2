"use client";

import { useState, useEffect } from "react";
import { 
  getClassesWithStatsAction, 
  upsertClassAction, 
  upsertSectionAction,
  deleteSectionAction,
  assignSectionTeacherAction,
  getAcademicYearsAction,
  createAcademicYearAction,
  toggleAcademicYearLockAction,
  setCurrentAcademicYearAction,
  getFinancialYearsAction
} from "@/lib/actions/academic-actions";
import { getStaffPulseAction } from "@/lib/actions/attendance-v2-actions";
import { 
  Library, 
  Plus, 
  Users, 
  UserCircle, 
  Trash2, 
  Edit3, 
  Layers, 
  GraduationCap,
  LayoutGrid,
  Settings2,
  ChevronRight,
  ShieldAlert,
  Save,
  Loader2,
  Lock,
  Unlock,
  Calendar,
  Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import StudentPromotionWorkspace from "./student-promotion";

// 🏛️ SOVEREIGN UI INLINE: Replacing missing UI components with native Tailwind standards
const Button = ({ children, className, ...props }: any) => (
  <button 
    className={cn("inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", className)} 
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className, ...props }: any) => (
  <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props}>
    {children}
  </div>
);

const Input = ({ className, ...props }: any) => (
  <input 
    className={cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} 
    {...props} 
  />
);

export default function AcademicArchitectHub() {
    const [activeTab, setActiveTab] = useState<"structure" | "sessions" | "rollover">("structure");
    const [grades, setGrades] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modals
    const [showGradeModal, setShowGradeModal] = useState(false);
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [pendingGrade, setPendingGrade] = useState({ name: "", level: 0 });
    const [pendingSection, setPendingSection] = useState({ name: "", classTeacherId: "" });
    const [idProbe, setIdProbe] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Assignment States
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [targetSection, setTargetSection] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Academic Sessions State
    const [sessionsList, setSessionsList] = useState<any[]>([]);
    const [financialYears, setFinancialYears] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [pendingSession, setPendingSession] = useState({
        name: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        financialYearId: ""
    });

    useEffect(() => {
        refreshData();
        getStaffPulseAction().then(res => {
            if (res.success) setStaff(res.data);
        });
    }, []);

    useEffect(() => {
        if (activeTab === "sessions") {
            refreshSessions();
        }
    }, [activeTab]);

    const refreshSessions = async () => {
        setLoadingSessions(true);
        const [sessRes, fyRes] = await Promise.all([
            getAcademicYearsAction(),
            getFinancialYearsAction()
        ]);
        if (sessRes.success) setSessionsList(sessRes.data);
        if (fyRes.success) setFinancialYears(fyRes.data);
        setLoadingSessions(false);
    };

    const handleCreateSession = async () => {
        if (!pendingSession.name || !pendingSession.startDate || !pendingSession.endDate) {
            alert("Please fill in session name, start date, and end date.");
            return;
        }
        setIsSaving(true);
        const res = await createAcademicYearAction(pendingSession);
        if (res.success) {
            alert("Academic session created successfully!");
            setShowSessionModal(false);
            setPendingSession({
                name: "",
                startDate: "",
                endDate: "",
                isCurrent: false,
                financialYearId: ""
            });
            refreshSessions();
        } else {
            alert(res.error || "Failed to create academic session.");
        }
        setIsSaving(false);
    };

    const handleToggleSessionLock = async (ayId: string, currentLockState: boolean) => {
        const res = await toggleAcademicYearLockAction(ayId, !currentLockState);
        if (res.success) {
            alert(`Session ${currentLockState ? "Unlocked" : "Locked"} successfully.`);
            refreshSessions();
        } else {
            alert(res.error || "Failed to update lock state.");
        }
    };

    const handleSetCurrentSession = async (ayId: string) => {
        const confirmSwitch = window.confirm("Are you sure you want to make this the current active session?");
        if (!confirmSwitch) return;

        const res = await setCurrentAcademicYearAction(ayId);
        if (res.success) {
            alert("Current active session updated!");
            refreshSessions();
        } else {
            alert(res.error || "Failed to switch active session.");
        }
    };

    const refreshData = async () => {
        setLoading(true);
        setError(null);
        const res = (await getClassesWithStatsAction()) as any;
        if (res.success) {
            setGrades(res.data);
            if (res.identityProbe) setIdProbe(res.identityProbe);
            if (selectedGrade) {
                const updated = res.data.find((g: any) => g.id === selectedGrade.id);
                setSelectedGrade(updated);
            }
        } else {
            setError(res.error);
            alert(`Sovereign Block: ${res.error}`);
        }
        setLoading(false);
    };

    const handleCreateGrade = async () => {
        setIsSaving(true);
        const res = await upsertClassAction(pendingGrade);
        if (res.success) {
            alert("Institutional Expansion: Grade Level Created.");
            setShowGradeModal(false);
            refreshData();
        } else {
            alert(res.error || "Grade creation failed.");
        }
        setIsSaving(false);
    };

    const handleCreateSection = async () => {
        if (!selectedGrade) return;
        setIsSaving(true);
        const res = await upsertSectionAction({
            ...pendingSection,
            classId: selectedGrade.id
        });
        if (res.success) {
            alert("Section Provisioned Successfully.");
            setShowSectionModal(false);
            refreshData();
        } else {
            alert(res.error || "Section provisioning failed.");
        }
        setIsSaving(false);
    };

    const handleDeleteSection = async (sectionId: string) => {
        const res = await deleteSectionAction(sectionId);
        if (res.success) {
            alert("Section Decoupled Successfully.");
            refreshData();
        } else {
            alert(res.error || "Section decoupling failed.");
        }
    };

    const handleAssignTeacher = async (staffId: string) => {
        if (!targetSection) return;
        setIsSaving(true);
        const res = await assignSectionTeacherAction(targetSection.id, staffId);
        if (res.success) {
            alert("Leadership Assigned: Section Teacher successfully linked.");
            setShowStaffModal(false);
            setTargetSection(null);
            refreshData();
        } else {
            alert(res.error || "Assignment failed.");
        }
        setIsSaving(false);
    };

    const filteredStaff = staff.filter(s => 
        (s.firstName + " " + s.lastName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.staffCode || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-[1800px] mx-auto p-4 lg:p-8 space-y-8 min-h-[85vh]">
            
            {/* Sovereign Hub Header / Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6">
                <button
                    onClick={() => setActiveTab("structure")}
                    className={cn(
                        "pb-4 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer",
                        activeTab === "structure" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Structure Architect
                </button>
                <button
                    onClick={() => setActiveTab("sessions")}
                    className={cn(
                        "pb-4 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer",
                        activeTab === "sessions" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Academic Sessions
                </button>
                <button
                    onClick={() => setActiveTab("rollover")}
                    className={cn(
                        "pb-4 font-black uppercase text-xs tracking-wider border-b-2 transition-all cursor-pointer",
                        activeTab === "rollover" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                    )}
                >
                    Student Rollovers
                </button>
            </div>

            {activeTab === "structure" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 🏰 GRADE LEVELS (LEFT COLUMN) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex justify-between items-end px-2">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <GraduationCap className="w-8 h-8 text-primary" />
                                    Grade Inventory
                                </h2>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Sovereign Academic Levels</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    onClick={refreshData}
                                    className="bg-white border text-slate-400 hover:text-primary h-9 w-9 rounded-xl shadow-sm"
                                    title="Force Sync Infrastructure"
                                >
                                    <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
                                </Button>
                                <Button 
                                    onClick={() => setShowGradeModal(true)}
                                    className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                                >
                                    <Plus className="w-5 h-5 mr-1" /> New Grade
                                </Button>
                            </div>
                        </div>

                        {idProbe && (
                            <div className="px-3 py-1 bg-primary/5 border border-primary/10 rounded-full inline-flex items-center gap-2 mx-2">
                                <ShieldAlert className="w-3 h-3 text-primary" />
                                <span className="text-[9px] font-black uppercase text-primary tracking-tighter">Identity Verified: {idProbe.role}</span>
                            </div>
                        )}

                        {error && (
                            <div className="mx-2 p-4 bg-rose-50 border border-rose-100 rounded-3xl space-y-2">
                                <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                                    <ShieldAlert className="w-4 h-4" /> Security Violation
                                </div>
                                <p className="text-xs text-rose-500 font-bold italic">{error}</p>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <div key={i} className="h-20 bg-slate-100 rounded-3xl animate-pulse" />
                                ))
                            ) : grades.map((g) => (
                                <Card 
                                    key={g.id}
                                    onClick={() => setSelectedGrade(g)}
                                    className={cn(
                                        "group p-6 rounded-[32px] cursor-pointer transition-all duration-500 border-2 relative overflow-hidden",
                                        selectedGrade?.id === g.id 
                                        ? "bg-white border-primary shadow-[0_20px_40px_rgba(0,0,0,0.06)]" 
                                        : "bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                selectedGrade?.id === g.id ? "bg-primary text-white" : "bg-white border text-slate-400"
                                            )}>
                                                <Layers className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-lg tracking-tight">{g.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{g.sections.length} Active Sections</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 tracking-tighter">{g._count.academicRecords}</p>
                                            <p className="text-[9px] font-black uppercase text-slate-400">Students</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* ⚙️ SECTION ARCHITECT (RIGHT COLUMN) */}
                    <div className="lg:col-span-8 space-y-6">
                        <AnimatePresence mode="wait">
                            {!selectedGrade ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[48px] h-full flex flex-col items-center justify-center p-20 text-center space-y-4"
                                >
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                                        <Settings2 className="w-10 h-10 text-slate-200" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">No Grade Selected</h3>
                                        <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm italic">Select an academic level from the inventory to manage sections and teachers.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key={selectedGrade.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-between items-center bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                                            <LayoutGrid className="w-48 h-48" />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{selectedGrade.name} <span className="text-primary italic">Architecture</span></h2>
                                            <p className="text-xs font-bold text-slate-400 italic">Managing sections and classroom leadership for the current academic session.</p>
                                        </div>
                                        <Button onClick={() => setShowSectionModal(true)} className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20">
                                            <Plus className="w-5 h-5" /> Provision Section
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {selectedGrade.sections.map((sec: any) => (
                                            <Card key={sec.id} className="p-8 rounded-[36px] bg-white border border-slate-100 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:bg-slate-50/20 group">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white scale-110 shadow-lg mb-4">
                                                        <span className="text-2xl font-black">{sec.name.charAt(0)}</span>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-50 border-none cursor-pointer" onClick={() => handleDeleteSection(sec.id)}>
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="text-2xl font-black text-slate-900 tracking-tight">Section {sec.name}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Class Configuration</p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                                            <p className="text-xl font-black text-slate-900">{sec._count.academicRecords}</p>
                                                            <p className="text-[9px] font-bold uppercase text-slate-400">Total Enrolled</p>
                                                        </div>
                                                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                                            <p className="text-xl font-black text-emerald-600">Active</p>
                                                            <p className="text-[9px] font-bold uppercase text-slate-400">Record Status</p>
                                                        </div>
                                                    </div>

                                                    <div 
                                                        onClick={() => {
                                                            setTargetSection(sec);
                                                            setShowStaffModal(true);
                                                        }}
                                                        className="pt-4 border-t border-slate-50 flex items-center gap-4 cursor-pointer hover:bg-primary/5 p-2 rounded-2xl transition-colors group/teacher"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/teacher:bg-primary group-hover/teacher:text-white transition-colors">
                                                            <UserCircle className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Class Teacher</p>
                                                            <p className="text-sm font-black text-slate-800 tracking-tight italic flex items-center gap-2">
                                                                {sec.classTeacher ? `${sec.classTeacher.firstName} ${sec.classTeacher.lastName}` : "Pending Assignment"}
                                                                <Edit3 className="w-3 h-3 opacity-0 group-hover/teacher:opacity-100 transition-opacity" />
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {activeTab === "sessions" && (
                <div className="space-y-6">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <Calendar className="w-8 h-8 text-primary" />
                                Academic Sessions Manager
                            </h2>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Configure active school years & accounting periods</p>
                        </div>
                        <Button 
                            onClick={() => setShowSessionModal(true)}
                            className="bg-primary hover:bg-primary/90 text-white rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                        >
                            <Plus className="w-5 h-5 mr-1" /> New Session
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loadingSessions ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="h-48 bg-slate-100 rounded-[32px] animate-pulse" />
                            ))
                        ) : sessionsList.map((sess) => {
                            const startStr = new Date(sess.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
                            const endStr = new Date(sess.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
                            
                            return (
                                <Card key={sess.id} className="p-6 rounded-[32px] bg-white border border-slate-100 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between min-h-[200px]">
                                    <div className="space-y-4 w-full">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{sess.name}</h3>
                                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
                                                    Linked FY: {sess.financialYear?.name || "None"}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={cn(
                                                    "inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                    sess.isCurrent 
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                                        : "bg-slate-50 text-slate-500 border-slate-200"
                                                )}>
                                                    {sess.isCurrent ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-50 py-3">
                                            <div>
                                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Start Date</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">{startStr}</p>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">End Date</span>
                                                <p className="font-semibold text-slate-700 mt-0.5">{endStr}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 mt-auto w-full">
                                        <div className="flex gap-2">
                                            {!sess.isCurrent && (
                                                <button
                                                    onClick={() => handleSetCurrentSession(sess.id)}
                                                    className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all border-none cursor-pointer"
                                                >
                                                    Activate
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleToggleSessionLock(sess.id, sess.isLocked)}
                                            className={cn(
                                                "h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors border cursor-pointer",
                                                sess.isLocked 
                                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100"
                                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-100"
                                            )}
                                        >
                                            {sess.isLocked ? (
                                                <>
                                                    <Lock className="w-3.5 h-3.5" /> Locked
                                                </>
                                            ) : (
                                                <>
                                                    <Unlock className="w-3.5 h-3.5" /> Unlocked
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === "rollover" && (
                <StudentPromotionWorkspace />
            )}

            {/* 🎯 MODALS - GRADE */}
            <AnimatePresence>
                {showGradeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowGradeModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
                            <div className="p-10 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">Provision Grade Level</h3>
                                    <p className="text-sm text-slate-500 font-bold italic">Adding a new tier to the institutional curriculum.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Grade Name</label>
                                        <Input value={pendingGrade.name} onChange={(e: any) => setPendingGrade({...pendingGrade, name: e.target.value})} placeholder="e.g. Standard 11" className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Academic Level Rank</label>
                                        <Input type="number" value={pendingGrade.level} onChange={(e: any) => setPendingGrade({...pendingGrade, level: parseInt(e.target.value)})} placeholder="e.g. 11" className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg" />
                                    </div>
                                    <Button onClick={handleCreateGrade} disabled={isSaving} className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-300 border-none cursor-pointer">
                                        {isSaving ? <Loader2 className="animate-spin" /> : "Authorize Institutional Expansion"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* 🎯 MODALS - SECTION */}
                {showSectionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSectionModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
                            <div className="p-10 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 italic">Divide & Conquer</h3>
                                    <p className="text-sm text-slate-500 font-bold">Adding a section to {selectedGrade?.name}.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Section Name</label>
                                        <Input value={pendingSection.name} onChange={(e: any) => setPendingSection({...pendingSection, name: e.target.value})} placeholder="e.g. A" className="h-14 rounded-2xl bg-slate-50 border-none font-black text-xl uppercase tracking-widest" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Assign Class Teacher</label>
                                        <select 
                                            className="w-full h-14 rounded-2xl bg-slate-50 border-none font-black px-4 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-slate-700"
                                            onChange={(e) => setPendingSection({...pendingSection, classTeacherId: e.target.value})}
                                        >
                                            <option value="">Select Staff Member</option>
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
                                        </select>
                                    </div>
                                    <Button onClick={handleCreateSection} disabled={isSaving} className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 border-none cursor-pointer">
                                        {isSaving ? <Loader2 className="animate-spin" /> : "Confirm Section Deployment"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {/* 🎯 MODALS - SESSION */}
                {showSessionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSessionModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[48px] overflow-hidden shadow-2xl">
                            <div className="p-10 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900">Provision Academic Session</h3>
                                    <p className="text-sm text-slate-500 font-bold italic">Adding a new academic cycle for billing and student cohorts.</p>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Session Name</label>
                                        <Input value={pendingSession.name} onChange={(e: any) => setPendingSession({...pendingSession, name: e.target.value})} placeholder="e.g. 2026-27" className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Start Date</label>
                                            <Input type="date" value={pendingSession.startDate} onChange={(e: any) => setPendingSession({...pendingSession, startDate: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-sm px-4" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">End Date</label>
                                            <Input type="date" value={pendingSession.endDate} onChange={(e: any) => setPendingSession({...pendingSession, endDate: e.target.value})} className="h-14 rounded-2xl bg-slate-50 border-none font-black text-sm px-4" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Link Financial Year</label>
                                        <select 
                                            value={pendingSession.financialYearId}
                                            onChange={(e: any) => setPendingSession({...pendingSession, financialYearId: e.target.value})}
                                            className="w-full h-14 rounded-2xl bg-slate-50 border-none font-black px-4 outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-slate-700"
                                        >
                                            <option value="">No Financial Year</option>
                                            {financialYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 px-2">
                                        <input 
                                            type="checkbox"
                                            checked={pendingSession.isCurrent}
                                            onChange={(e: any) => setPendingSession({...pendingSession, isCurrent: e.target.checked})}
                                            className="rounded text-primary focus:ring-primary w-4 h-4"
                                        />
                                        <span className="text-xs font-bold text-slate-600">Activate session immediately</span>
                                    </div>
                                    <Button onClick={handleCreateSession} disabled={isSaving} className="w-full h-16 bg-slate-900 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-300 border-none cursor-pointer">
                                        {isSaving ? <Loader2 className="animate-spin" /> : "Deploy Session"}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {/* 🏰 STAFF SELECTION MODAL (Sovereign Leadership Portal) */}
                {showStaffModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStaffModal(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[48px] overflow-hidden shadow-2xl">
                            <div className="bg-slate-900 p-8 text-white relative">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Users className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-black tracking-tighter italic">Leadership Portal</h3>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Assign Class Teacher to {targetSection?.name}</p>
                                </div>
                                <div className="mt-8 relative z-10">
                                    <div className="relative">
                                        <Input 
                                            value={searchQuery}
                                            onChange={(e: any) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name or staff code..." 
                                            className="bg-white/10 border-white/10 text-white placeholder:text-white/30 h-14 rounded-2xl px-12"
                                        />
                                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                    </div>
                                </div>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                {filteredStaff.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-bold italic">
                                        No staff members found matching "{searchQuery}"
                                    </div>
                                ) : filteredStaff.map((s: any) => (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleAssignTeacher(s.id)}
                                        className="flex items-center justify-between p-4 rounded-3xl hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer transition-all group/staff"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover/staff:bg-primary group-hover/staff:text-white transition-colors">
                                                <UserCircle className="w-7 h-7" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 tracking-tight">{s.firstName} {s.lastName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.staffCode || "No Code"} • {s.department?.name || "General Staff"}</p>
                                            </div>
                                        </div>
                                        <Button className="bg-slate-900/5 text-slate-600 group-hover/staff:bg-primary group-hover/staff:text-white rounded-xl font-black text-[10px] uppercase tracking-widest px-4 border-none cursor-pointer">
                                            Select
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <Button onClick={() => setShowStaffModal(false)} variant="ghost" className="font-black text-xs uppercase tracking-widest text-slate-400 border-none cursor-pointer">
                                    Cancel Selection
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
