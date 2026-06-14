"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Search,
  RefreshCcw,
  Zap,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Trash2,
  Lock,
  Landmark,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  uploadBankStatementAction,
  getBankStatementsAction,
  getStatementEntriesAction,
  runAutoReconciliationAction,
  confirmMatchAction,
  bulkConfirmAutoMatchedAction,
  ignoreEntryAction,
  getReconciliationSummaryAction,
  deleteStatementAction
} from "@/lib/actions/bank-reconciliation-actions";

type ToastState = { type: "loading" | "success" | "error"; message: string } | null;

export function BankReconciliation() {
  const [view, setView] = useState<"LIST" | "UPLOAD" | "RECONCILE">("LIST");
  const [toast, setToast] = useState<ToastState>(null);
  
  // List State
  const [statements, setStatements] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Upload State
  const [selectedBank, setSelectedBank] = useState<"AXIS" | "HDFC" | "BOB">("AXIS");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reconcile State
  const [activeStmt, setActiveStmt] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [filterMode, setFilterMode] = useState<"ALL" | "UNMATCHED" | "AUTO_MATCHED" | "CONFIRMED" | "IGNORED">("UNMATCHED");
  const [searchQuery, setSearchQuery] = useState("");

  const loadStatements = async () => {
    setLoadingList(true);
    const res = await getBankStatementsAction();
    if (res.success) setStatements(res.data);
    setLoadingList(false);
  };

  useEffect(() => {
    if (view === "LIST") loadStatements();
  }, [view]);

  const loadReconciliation = async (id: string) => {
    setLoadingEntries(true);
    const [entriesRes, summaryRes] = await Promise.all([
      getStatementEntriesAction(id),
      getReconciliationSummaryAction(id)
    ]);
    
    if (entriesRes.success) {
      setEntries(entriesRes.data);
      setActiveStmt(entriesRes.statement);
    }
    if (summaryRes.success) {
      setSummary(summaryRes.summary);
    }
    setLoadingEntries(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setToast({ type: "loading", message: `Parsing ${selectedBank} statement...` });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const res = await uploadBankStatementAction({
          fileName: file.name,
          bankName: selectedBank,
          fileBase64: base64,
          fileType: file.name.endsWith(".pdf") ? "pdf" : "excel"
        });

        if (res.success) {
          setToast({ type: "success", message: `Parsed ${res.entryCount} transactions successfully.` });
          setFile(null);
          await loadReconciliation(res.statementId);
          setView("RECONCILE");
        } else {
          setToast({ type: "error", message: res.error || "Upload failed" });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setToast({ type: "error", message: e.message || "Failed to read file" });
      setIsUploading(false);
    }
  };

  const handleAutoReconcile = async () => {
    if (!activeStmt) return;
    setToast({ type: "loading", message: "Running Sovereign Auto-Match Engine..." });
    const res = await runAutoReconciliationAction(activeStmt.id);
    
    if (res.success) {
      setToast({ type: "success", message: `Auto-matched ${res.autoMatchedCount} entries. Ignored ${res.internalTransferCount} internal transfers.` });
      loadReconciliation(activeStmt.id);
    } else {
      setToast({ type: "error", message: res.error || "Auto-match failed" });
    }
  };

  const handleConfirm = async (entryId: string) => {
    const res = await confirmMatchAction({ entryId });
    if (res.success) loadReconciliation(activeStmt.id);
  };

  const handleIgnore = async (entryId: string) => {
    const res = await ignoreEntryAction(entryId);
    if (res.success) loadReconciliation(activeStmt.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this statement? This will remove all unmatched entries.")) return;
    const res = await deleteStatementAction(id);
    if (res.success) {
      setToast({ type: "success", message: "Statement deleted" });
      loadStatements();
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filterMode !== "ALL" && e.matchStatus !== filterMode) return false;
    if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-700">
      {/* 🏛️ HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Bank <span className="text-indigo-600 italic">Reconciliation.</span>
            </h2>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ledger-to-Bank Verification Engine</p>
        </div>

        {view !== "UPLOAD" && (
          <button 
            onClick={() => setView(view === "LIST" ? "UPLOAD" : "LIST")}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            {view === "LIST" ? <><Upload className="w-4 h-4" /> Import Statement</> : <><ArrowRight className="w-4 h-4 rotate-180" /> Back to Dashboard</>}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {view === "LIST" && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingList ? (
                   <div className="col-span-full py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : statements.length === 0 ? (
                   <div className="col-span-full py-20 flex flex-col items-center gap-4 text-slate-300">
                      <Landmark className="w-16 h-16 grayscale opacity-20" />
                      <p className="text-xs font-black uppercase tracking-widest">No statements uploaded</p>
                      <button
                        onClick={() => setView("UPLOAD")}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2 mt-4"
                      >
                         <Upload className="w-4 h-4" /> Import Statement
                      </button>
                   </div>
                ) : statements.map((stmt) => (
                  <div key={stmt.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                             stmt.bankName === "AXIS" ? "bg-rose-600 shadow-rose-500/30" :
                             stmt.bankName === "HDFC" ? "bg-blue-800 shadow-blue-500/30" :
                             "bg-orange-500 shadow-orange-500/30"
                           )}>
                              <Landmark className="w-6 h-6" />
                           </div>
                           <div>
                              <h4 className="text-lg font-black text-slate-900 tracking-tight">{stmt.bankName}</h4>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">A/C {stmt.accountNo || "Unknown"}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleDelete(stmt.id)} className="p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="mb-6">
                        <h5 className="text-2xl font-black text-slate-900">{new Date(stmt.year, stmt.month - 1).toLocaleString('default', { month: 'long' })} {stmt.year}</h5>
                        <div className="flex items-center gap-4 mt-2">
                           <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Credits</p>
                              <p className="text-sm font-black text-emerald-600">₹{Math.round(stmt.totalCredits || 0).toLocaleString()}</p>
                           </div>
                           <div className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Debits</p>
                              <p className="text-sm font-black text-rose-600">₹{Math.round(stmt.totalDebits || 0).toLocaleString()}</p>
                           </div>
                        </div>
                     </div>

                     <div className="mt-auto pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</p>
                           <p className="text-[10px] font-black text-indigo-600">{stmt.matchedCount} / {stmt.totalCount} Confirmed</p>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                           <div 
                             className="h-full bg-indigo-500 rounded-full" 
                             style={{ width: `${stmt.totalCount > 0 ? (stmt.matchedCount / stmt.totalCount) * 100 : 0}%` }} 
                           />
                        </div>
                        
                        <button 
                          onClick={() => {
                             setActiveStmt(stmt);
                             loadReconciliation(stmt.id);
                             setView("RECONCILE");
                          }}
                          className="w-full py-3 bg-slate-50 hover:bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                           Open Workspace
                        </button>
                     </div>
                  </div>
                ))}
             </div>
          </motion.div>
        )}

        {view === "UPLOAD" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 flex items-center justify-center p-6">
             <div className="w-full max-w-2xl bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8">
                   <Upload className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Upload Statement</h3>
                <p className="text-sm font-medium text-slate-400 mb-10 max-w-md">Securely import your bank's Excel or PDF statement to automatically reconcile ledger entries.</p>

                <div className="grid grid-cols-3 gap-4 w-full mb-8">
                   {["AXIS", "HDFC", "BOB"].map((bank) => (
                      <div 
                        key={bank}
                        onClick={() => setSelectedBank(bank as any)}
                        className={cn(
                           "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                           selectedBank === bank 
                              ? "border-indigo-500 bg-indigo-50/50 shadow-md scale-105" 
                              : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                         <Landmark className={cn("w-6 h-6 mx-auto mb-2", selectedBank === bank ? "text-indigo-600" : "text-slate-400")} />
                         <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{bank}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                            {bank === "BOB" ? "PDF Only" : "Excel Only"}
                         </p>
                      </div>
                   ))}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept={selectedBank === "BOB" ? ".pdf" : ".xlsx,.xls"}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />

                {file ? (
                   <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                         <div className="text-left">
                            <p className="text-sm font-bold text-slate-900">{file.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{(file.size / 1024).toFixed(1)} KB</p>
                         </div>
                      </div>
                      <button onClick={() => setFile(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-all"><X className="w-4 h-4" /></button>
                   </div>
                ) : (
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all mb-8"
                   >
                      Browse Files or Drag & Drop
                   </button>
                )}

                <div className="flex items-center gap-4 w-full">
                   <button onClick={() => setView("LIST")} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Cancel</button>
                   <button 
                     disabled={!file || isUploading}
                     onClick={handleUpload}
                     className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"
                   >
                      {isUploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Processing</> : <><Zap className="w-4 h-4" /> Start Engine</>}
                   </button>
                </div>
             </div>
          </motion.div>
        )}

        {view === "RECONCILE" && activeStmt && summary && (
          <motion.div key="reconcile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col gap-6">
             {/* Stats Strip */}
             <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Entries", val: summary.totalEntries, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Unmatched", val: summary.unmatched, color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Auto Matched", val: summary.autoMatched, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Confirmed", val: summary.confirmed, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Ignored", val: summary.ignored, color: "text-slate-500", bg: "bg-slate-100" }
                ].map((s, i) => (
                   <div key={i} className={cn("p-4 rounded-2xl border border-slate-200 shadow-sm", s.bg)}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
                      <p className={cn("text-2xl font-black", s.color)}>{s.val}</p>
                   </div>
                ))}
             </div>

             {/* Workspace Toolbar */}
             <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                   <div className="flex bg-slate-100 p-1 rounded-xl">
                      {["ALL", "UNMATCHED", "AUTO_MATCHED", "CONFIRMED", "IGNORED"].map(mode => (
                         <button 
                           key={mode} 
                           onClick={() => setFilterMode(mode as any)}
                           className={cn(
                             "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                             filterMode === mode ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                           )}
                         >
                           {mode.replace("_", " ")}
                         </button>
                      ))}
                   </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                   <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full md:w-64">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input 
                         type="text" 
                         placeholder="Search narration..." 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="bg-transparent border-none outline-none text-xs w-full font-medium"
                      />
                   </div>

                   <button 
                     onClick={handleAutoReconcile}
                     className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
                   >
                      <Zap className="w-4 h-4" /> Run Auto-Match
                   </button>
                   <button 
                     onClick={() => setView("LIST")}
                     className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                   >
                      <X className="w-4 h-4" />
                   </button>
                </div>
             </div>

             {/* Data Grid */}
             <div className="flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                   <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                         <tr>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Date</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Narration & Ref</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Debit (Out)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Credit (In)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">Status</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {loadingEntries ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />Loading...</td></tr>
                         ) : filteredEntries.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-medium">No entries found for current filter.</td></tr>
                         ) : filteredEntries.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-6 py-4 align-top">
                                  <p className="text-xs font-black text-slate-900">{new Date(row.txnDate).toLocaleDateString('en-IN')}</p>
                               </td>
                               <td className="px-6 py-4 max-w-[300px]">
                                  <p className="text-xs font-medium text-slate-700 truncate" title={row.description}>{row.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                     {row.reference && <span className="text-[9px] font-bold text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">Ref: {row.reference}</span>}
                                     <span className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                        row.category === "FEE_COLLECTION" ? "bg-emerald-50 text-emerald-600" :
                                        row.category === "SALARY" ? "bg-rose-50 text-rose-600" :
                                        row.category === "INTERNAL_TRANSFER" ? "bg-slate-100 text-slate-500" :
                                        "bg-amber-50 text-amber-600"
                                     )}>{row.category.replace("_", " ")}</span>
                                  </div>
                                  {row.notes && (
                                     <p className="text-[9px] font-bold text-indigo-500 mt-1 italic">{row.notes}</p>
                                  )}
                               </td>
                               <td className="px-6 py-4 align-top">
                                  {row.debit ? <p className="text-sm font-black text-rose-600">-₹{Number(row.debit).toLocaleString('en-IN')}</p> : <span className="text-slate-300">-</span>}
                               </td>
                               <td className="px-6 py-4 align-top">
                                  {row.credit ? <p className="text-sm font-black text-emerald-600">+₹{Number(row.credit).toLocaleString('en-IN')}</p> : <span className="text-slate-300">-</span>}
                               </td>
                               <td className="px-6 py-4 align-top">
                                  <div className={cn(
                                     "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                     row.matchStatus === "UNMATCHED" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                     row.matchStatus === "AUTO_MATCHED" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                     row.matchStatus === "CONFIRMED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                     "bg-slate-100 text-slate-500 border border-slate-200"
                                  )}>
                                     {row.matchStatus === "CONFIRMED" ? <CheckCircle2 className="w-3 h-3" /> :
                                      row.matchStatus === "AUTO_MATCHED" ? <Zap className="w-3 h-3" /> :
                                      row.matchStatus === "IGNORED" ? <EyeOff className="w-3 h-3" /> :
                                      <AlertCircle className="w-3 h-3" />}
                                     {row.matchStatus.replace("_", " ")}
                                  </div>
                               </td>
                               <td className="px-6 py-4 align-top text-right">
                                  {row.matchStatus === "UNMATCHED" || row.matchStatus === "AUTO_MATCHED" ? (
                                     <div className="flex items-center justify-end gap-2">
                                        <button 
                                          onClick={() => handleIgnore(row.id)}
                                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                          title="Ignore/Skip"
                                        >
                                           <EyeOff className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => handleConfirm(row.id)}
                                          className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                                          title="Confirm Match"
                                        >
                                           <CheckCircle2 className="w-5 h-5" />
                                        </button>
                                     </div>
                                  ) : (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locked</span>
                                  )}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 right-10 z-[100] min-w-[320px]">
            <div className={cn(
              "p-5 rounded-[2rem] border shadow-2xl backdrop-blur-md flex items-start gap-4",
              toast.type === "success" ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-50" :
              toast.type === "error" ? "bg-rose-950/90 border-rose-500/30 text-rose-50" :
              "bg-slate-900/95 border-slate-700/50 text-white"
            )}>
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "loading" ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> :
                 toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
                 <AlertCircle className="w-5 h-5 text-rose-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-1">System Notification</p>
                <p className="text-sm font-bold leading-tight">{toast.message}</p>
              </div>
              <button onClick={() => setToast(null)} className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-all"><X className="w-4 h-4 opacity-50" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
