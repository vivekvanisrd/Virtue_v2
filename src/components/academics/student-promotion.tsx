"use client";

import { useState, useEffect } from "react";
import { 
  getAcademicYearsAction,
  getClassesAction,
  getSectionsAction,
  getStudentsForPromotionAction,
  createPromotionBatchAction,
  promoteStudentChunkAction,
  rollbackPromotionBatchAction,
  getPromotionBatchesAction
} from "@/lib/actions/academic-actions";
import { 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  History, 
  Sparkles, 
  GraduationCap, 
  Users, 
  Check, 
  Loader2, 
  Calendar,
  AlertTriangle,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function StudentPromotionWorkspace() {
  // Config/Lists
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Selection Filters
  const [sourceYear, setSourceYear] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [sourceClass, setSourceClass] = useState("");
  const [targetClass, setTargetClass] = useState("");
  
  const [sourceSections, setSourceSections] = useState<any[]>([]);
  const [targetSections, setTargetSections] = useState<any[]>([]);
  const [sourceSection, setSourceSection] = useState("");
  const [targetSection, setTargetSection] = useState("");

  // Roster / State
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [overrideDeclined, setOverrideDeclined] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  // Loaders / Progress
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentProgressText, setCurrentProgressText] = useState("");
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoadingSessions(true);
      const [sessRes, classRes] = await Promise.all([
        getAcademicYearsAction(),
        getClassesAction()
      ]);
      if (sessRes.success) {
        setSessions(sessRes.data);
        // Default current session
        const current = sessRes.data.find((s: any) => s.isCurrent);
        if (current) setSourceYear(current.id);
      }
      if (classRes.success) {
        setClasses(classRes.data);
      }
      setLoadingSessions(false);
      refreshHistory();
    }
    init();
  }, []);

  // Sync Sections on Class Change
  useEffect(() => {
    if (sourceClass) {
      getSectionsAction(sourceClass).then((res) => {
        if (res.success) setSourceSections(res.data);
      });
    } else {
      setSourceSections([]);
    }
    setSourceSection("");
  }, [sourceClass]);

  useEffect(() => {
    if (targetClass) {
      getSectionsAction(targetClass).then((res) => {
        if (res.success) setTargetSections(res.data);
      });
    } else {
      setTargetSections([]);
    }
    setTargetSection("");
  }, [targetClass]);

  // Load Roster
  const handleFetchRoster = async () => {
    if (!sourceYear || !sourceClass) {
      alert("Please select Source Academic Year and Class.");
      return;
    }
    setLoadingRoster(true);
    const res = await getStudentsForPromotionAction(sourceYear, sourceClass, sourceSection || undefined);
    if (res.success) {
      setStudents(res.data);
      // Auto select Confirmed ones, skip Declined by default
      const autoSelected = res.data
        .filter((s: any) => s.consentStatus.toLowerCase() === "confirmed")
        .map((s: any) => s.id);
      setSelectedStudentIds(autoSelected);
    } else {
      alert(res.error || "Failed to load student roster.");
    }
    setLoadingRoster(false);
  };

  const refreshHistory = async () => {
    setLoadingHistory(true);
    const res = await getPromotionBatchesAction();
    if (res.success) {
      setHistory(res.data);
    }
    setLoadingHistory(false);
  };

  const toggleSelectStudent = (id: string, consentStatus: string) => {
    const status = consentStatus.toLowerCase();
    if (status === "declined" && !overrideDeclined) {
      alert("This student has Declined parent consent. Please check 'Override Consent' to allow selecting them.");
      return;
    }

    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      if (status === "pending") {
        const confirmCheck = window.confirm("Warning: This student's consent is still Pending. Proceed anyway?");
        if (!confirmCheck) return;
      }
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const selectable = students.filter(s => 
      s.consentStatus.toLowerCase() !== "declined" || overrideDeclined
    );
    
    if (selectedStudentIds.length === selectable.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(selectable.map((s) => s.id));
    }
  };

  // Execute Batch promotion in Chunks of 50
  const handlePromote = async () => {
    if (selectedStudentIds.length === 0) {
      alert("No students selected for promotion.");
      return;
    }
    if (!targetYear || !targetClass) {
      alert("Please select target Academic Year and Class.");
      return;
    }
    if (sourceYear === targetYear) {
      alert("Source and Target academic sessions cannot be the same.");
      return;
    }

    const sourceClassName = classes.find(c => c.id === sourceClass)?.name || "Source Class";
    const targetClassName = classes.find(c => c.id === targetClass)?.name || "Target Class";

    const confirmRun = window.confirm(
      `Confirm promotion: promoting ${selectedStudentIds.length} students from ${sourceClassName} to ${targetClassName}. Proceed?`
    );
    if (!confirmRun) return;

    setPromoting(true);
    setProgressPercent(0);
    setCurrentProgressText("Initializing promotion batch...");

    // 1. Initialize Promotion Batch
    const batchRes = await createPromotionBatchAction({
      sourceYearId: sourceYear,
      targetYearId: targetYear,
      sourceClassId: sourceClass,
      targetClassId: targetClass
    });

    if (!batchRes.success || !batchRes.batchId) {
      alert(batchRes.error || "Failed to initialize batch transaction.");
      setPromoting(false);
      return;
    }

    const batchId = batchRes.batchId;
    const chunkSize = 50;
    const chunks: string[][] = [];
    
    for (let i = 0; i < selectedStudentIds.length; i += chunkSize) {
      chunks.push(selectedStudentIds.slice(i, i + chunkSize));
    }

    let completedCount = 0;
    let failedChunks = 0;

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      setCurrentProgressText(`Processing chunk ${index + 1} of ${chunks.length}...`);
      
      const chunkRes = await promoteStudentChunkAction({
        studentIds: chunk,
        sourceAcademicYearId: sourceYear,
        targetAcademicYearId: targetYear,
        targetClassId: targetClass,
        targetSectionId: targetSection || undefined,
        batchId
      });

      if (chunkRes.success) {
        completedCount += chunkRes.count || chunk.length;
      } else {
        failedChunks++;
        console.error(`Chunk ${index + 1} failed:`, chunkRes.error);
      }

      const percent = Math.round(((index + 1) / chunks.length) * 100);
      setProgressPercent(percent);
    }

    setPromoting(false);
    setCurrentProgressText("");
    
    if (failedChunks > 0) {
      alert(`Promotion completed with some errors. ${completedCount} students promoted successfully.`);
    } else {
      alert(`Success! ${completedCount} students promoted successfully.`);
    }

    // Reset list and refresh audits
    setStudents([]);
    setSelectedStudentIds([]);
    refreshHistory();
  };

  const handleRollback = async (batchId: string) => {
    const confirmUndo = window.confirm(
      "CAUTION: This will reverse all promotions, billing adjustments, and ledger postings linked to this batch run. Are you sure?"
    );
    if (!confirmUndo) return;

    setRollingBackId(batchId);
    const res = await rollbackPromotionBatchAction(batchId);
    setRollingBackId(null);

    if (res.success) {
      alert("Rollover batch successfully reversed!");
      refreshHistory();
    } else {
      alert(res.error || "Rollback failed.");
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-8 rounded-[36px] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <GraduationCap className="w-64 h-64" />
        </div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full w-fit">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Rollover Center</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Academic Rollover Workspace</h1>
          <p className="text-sm text-slate-300 font-medium max-w-xl">
            Promote student rosters to the next academic cycle. Generates fresh historical records, aligns next-year fee structures, and issues accounting ledger accruals.
          </p>
        </div>
      </div>

      {/* WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: FILTERS & ROSTER */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Promotion Planner
            </h2>
            
            {/* DUAL FILTERS MATRIX */}
            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              
              {/* SOURCE FILTERS */}
              <div className="md:col-span-5 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Source Configuration (Current)</p>
                <div className="grid grid-cols-1 gap-2">
                  <select 
                    value={sourceYear} 
                    onChange={(e) => setSourceYear(e.target.value)}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "(Current)" : ""}</option>)}
                  </select>
                  <select 
                    value={sourceClass} 
                    onChange={(e) => setSourceClass(e.target.value)}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Grade Level</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select 
                    value={sourceSection} 
                    onChange={(e) => setSourceSection(e.target.value)}
                    disabled={!sourceClass}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  >
                    <option value="">All Sections</option>
                    {sourceSections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* ARROW */}
              <div className="md:col-span-1 flex justify-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 rotate-90 md:rotate-0">
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </div>
              </div>

              {/* TARGET FILTERS */}
              <div className="md:col-span-5 space-y-3 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/30">
                <p className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Target Configuration (Destination)</p>
                <div className="grid grid-cols-1 gap-2">
                  <select 
                    value={targetYear} 
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Target Session</option>
                    {sessions.filter(s => s.id !== sourceYear).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select 
                    value={targetClass} 
                    onChange={(e) => setTargetClass(e.target.value)}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Target Grade</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select 
                    value={targetSection} 
                    onChange={(e) => setTargetSection(e.target.value)}
                    disabled={!targetClass}
                    className="w-full h-11 bg-white rounded-xl border border-slate-200 px-3 font-semibold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  >
                    <option value="">All Sections</option>
                    {targetSections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
                  </select>

                </div>
              </div>

            </div>

            {/* ACTION TRIGGERS */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-50">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={overrideDeclined} 
                    onChange={(e) => {
                      setOverrideDeclined(e.target.checked);
                      if (!e.target.checked) {
                        // Clear selected students that are declined
                        const filterDeclined = students
                          .filter((s: any) => s.consentStatus.toLowerCase() === "declined")
                          .map(s => s.id);
                        setSelectedStudentIds(selectedStudentIds.filter(id => !filterDeclined.includes(id)));
                      }
                    }}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="text-xs font-black text-rose-500 uppercase tracking-tight flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Override Consent Blocks
                  </span>
                </label>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={handleFetchRoster}
                  disabled={loadingRoster || !sourceYear || !sourceClass}
                  className="flex-1 sm:flex-initial h-12 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider text-xs rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingRoster ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Roster"}
                </button>
                <button 
                  onClick={handlePromote}
                  disabled={promoting || selectedStudentIds.length === 0 || !targetYear || !targetClass}
                  className="flex-1 sm:flex-initial h-12 px-8 bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-widest text-xs rounded-xl disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  Promote Selected ({selectedStudentIds.length})
                </button>
              </div>
            </div>
          </div>

          {/* PROGRESS TRACKER */}
          <AnimatePresence>
            {promoting && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0 }}
                className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    Executing Bulk Rollover Transaction
                  </p>
                  <span className="text-sm font-black text-primary">{progressPercent}%</span>
                </div>
                
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className="bg-gradient-to-r from-primary to-indigo-600 h-full rounded-full"
                  />
                </div>

                <p className="text-xs font-semibold text-slate-500 italic">{currentProgressText}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ROSTER TABLE CARD */}
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Student Roster</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Enrolled Roster Ready for Selection</p>
              </div>
              {students.length > 0 && (
                <button 
                  onClick={toggleSelectAll}
                  className="h-8 px-4 bg-white hover:bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider rounded-lg border shadow-sm"
                >
                  {selectedStudentIds.length === students.length ? "Deselect All" : "Select All Available"}
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {students.length === 0 ? (
                <div className="p-16 text-center text-slate-400 font-bold italic">
                  Select Source Session & Class and click "Load Roster" to display eligible students.
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-left border-b border-slate-100">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 w-12">Select</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Student Name</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Student Code</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Admission No.</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Consent Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      const consent = student.consentStatus.toLowerCase();
                      
                      return (
                        <tr 
                          key={student.id}
                          className={cn(
                            "hover:bg-slate-50/40 transition-colors cursor-pointer",
                            isSelected && "bg-primary/5 hover:bg-primary/5"
                          )}
                          onClick={() => toggleSelectStudent(student.id, student.consentStatus)}
                        >
                          <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              disabled={consent === "declined" && !overrideDeclined}
                              onChange={() => toggleSelectStudent(student.id, student.consentStatus)}
                              className="rounded text-primary focus:ring-primary w-4 h-4 disabled:opacity-40"
                            />
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-tight">
                            {student.studentCode || "-"}
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-tight">
                            {student.admissionNumber || "-"}
                          </td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit",
                              consent === "confirmed" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                              consent === "declined" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                              "bg-amber-50 text-amber-600 border border-amber-100"
                            )}>
                              {consent === "confirmed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {consent === "declined" && <XCircle className="w-3.5 h-3.5" />}
                              {consent === "pending" && <AlertTriangle className="w-3.5 h-3.5" />}
                              {student.consentStatus}
                            </span>
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

        {/* RIGHT COLUMN: RECENT AUDITS / HISTORY */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <History className="w-6 h-6 text-slate-700" />
                Audit Logs
              </h2>
              <button 
                onClick={refreshHistory}
                disabled={loadingHistory}
                className="h-8 w-8 bg-slate-50 hover:bg-slate-100 rounded-lg border flex items-center justify-center text-slate-500 disabled:opacity-50"
                title="Refresh Audits"
              >
                <Loader2 className={cn("w-4 h-4", loadingHistory && "animate-spin")} />
              </button>
            </div>

            <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium italic text-xs">
                  No previous batch runs recorded for this branch.
                </div>
              ) : (
                history.map((batch) => {
                  const dateStr = new Date(batch.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });
                  const isRolledBack = batch.status === "ROLLED_BACK";
                  
                  return (
                    <div 
                      key={batch.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                        isRolledBack 
                          ? "bg-slate-50/50 border-slate-200/60 opacity-75"
                          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-0.5">
                          <span className={cn(
                            "inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            isRolledBack 
                              ? "bg-slate-100 text-slate-500 border border-slate-200"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          )}>
                            {batch.status}
                          </span>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {dateStr}
                          </p>
                        </div>
                        
                        {!isRolledBack && (
                          <button
                            disabled={rollingBackId === batch.id}
                            onClick={() => handleRollback(batch.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {rollingBackId === batch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            Revert Run
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Source Class</span>
                            <p className="font-bold text-slate-700 mt-0.5">{batch.sourceClassName}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Target Class</span>
                            <p className="font-bold text-primary mt-0.5">{batch.targetClassName}</p>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-slate-50 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Source Session</span>
                            <p className="font-bold text-slate-500 mt-0.5">{batch.sourceYearName}</p>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Target Session</span>
                            <p className="font-bold text-slate-500 mt-0.5">{batch.targetYearName}</p>
                          </div>
                        </div>
                      </div>

                      {/* Small details line */}
                      <p className="text-[9px] font-semibold italic text-slate-400 text-right mt-3">
                        Executed by: {batch.executedBy?.firstName || "System"} {batch.executedBy?.lastName || ""}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
