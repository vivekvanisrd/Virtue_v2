"use client";

import React, { useState, useMemo } from "react";
import { 
  GraduationCap, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  FileText,
  Calculator,
  Search,
  LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { submitBulkResultsAction } from "@/lib/actions/academic-actions";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string;
}

interface MarksEntryGridProps {
  students: Student[];
  examTypeId: string;
  subjectId: string;
  subjectName: string;
  totalMarks?: number;
  passMarks?: number;
}

export function MarksEntryGrid({ 
  students, 
  examTypeId, 
  subjectId, 
  subjectName,
  totalMarks = 100,
  passMarks = 33
}: MarksEntryGridProps) {
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const stats = useMemo(() => {
    const values = Object.values(marks);
    const passed = values.filter(v => v >= passMarks).length;
    const failed = values.filter(v => v < passMarks).length;
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    
    return { passed, failed, average: average.toFixed(1) };
  }, [marks, passMarks]);

  const handleUpdateMark = (studentId: string, val: string) => {
    const num = parseFloat(val) || 0;
    if (num > totalMarks) return;
    setMarks(prev => ({ ...prev, [studentId]: num }));
  };

  const handleSync = async () => {
    setIsSyncing(true);
    const records = students.map(s => ({
       studentId: s.id,
       examTypeId,
       subjectId,
       marksObtained: marks[s.id] || 0,
       totalMarks,
       passMarks,
       remarks: remarks[s.id] || ""
    }));

    const result = await submitBulkResultsAction(records);
    if (result.success) {
       alert(`Academic Success! ${result.count} Student Marks Synced to Ledger.`);
       setShowSummary(true);
    } else {
       alert("Sync Failure: " + result.error);
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ─── Header Console ─── */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 group hover:rotate-6 transition-transform cursor-pointer">
                  <GraduationCap className="w-10 h-10" />
               </div>
               <div>
                  <h2 className="text-4xl font-black tracking-tighter italic uppercase underline decoration-blue-500/20 underline-offset-8">Examination Console</h2>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em] font-mono mt-4">Subject: {subjectName} (Max: {totalMarks})</p>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[9px] font-black uppercase opacity-30 tracking-widest mb-1">Class Potential</p>
                  <p className="text-2xl font-black tracking-tighter text-blue-400">{stats.average}% <span className="text-[10px] opacity-40 italic font-medium">Avg</span></p>
               </div>
               <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="px-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 disabled:opacity-50"
               >
                  {isSyncing ? "Syncing Logic..." : <><Save className="w-4 h-4" /> Sync Results</>}
               </button>
            </div>
         </div>
         
         <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      </div>

      {/* ─── Statistics HUD ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm group hover:border-emerald-200 transition-colors">
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Passing Class Ratio</p>
            <div className="flex items-end justify-between">
               <h3 className="text-4xl font-black text-emerald-600">{stats.passed}</h3>
               <p className="text-[10px] font-bold text-emerald-900/60 pb-1 italic">Students Cleared</p>
            </div>
         </div>
         <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm group hover:border-rose-200 transition-colors">
            <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-4">Improvement Needed</p>
            <div className="flex items-end justify-between">
               <h3 className="text-4xl font-black text-rose-600">{stats.failed}</h3>
               <p className="text-[10px] font-bold text-rose-900/60 pb-1 italic">Below Passing Line</p>
            </div>
         </div>
         <div className="p-8 bg-blue-50 border border-blue-100 rounded-[2.5rem] flex flex-col justify-between shadow-sm group hover:bg-blue-100 transition-all">
            <p className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest mb-4 font-mono underline underline-offset-4 decoration-blue-500/20">Accounting Logic</p>
            <div className="flex flex-col gap-2">
               <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest w-fit shadow-lg shadow-blue-500/20">Auto-Grading Enabled</span>
               <p className="text-[10px] font-bold text-blue-900/60 mt-2 uppercase tracking-tight">Syncs directly with Parent Portal</p>
            </div>
         </div>
      </div>

      {/* ─── Results Entry Matrix ─── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-100/50">
         <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/10">
            <div>
               <h3 className="text-xl font-black tracking-tighter">Student Score Matrix</h3>
               <p className="text-xs font-medium opacity-40 uppercase tracking-widest">Calculated on real-time entry basis</p>
            </div>
            <div className="flex items-center gap-3">
               <Search className="w-4 h-4 text-slate-300" />
               <input 
                  type="text" 
                  placeholder="Filter Roll No..." 
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-500 placeholder:text-slate-200"
               />
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Roll No / Student</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Score Entry (/{totalMarks})</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Auto Grade</th>
                     <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Remarks</th>
                  </tr>
               </thead>
               <tbody>
                  {students.map((s, i) => (
                     <tr key={s.id} className="group hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
                        <td className="px-10 py-6">
                           <div>
                              <p className="text-slate-900 font-black tracking-tighter text-sm uppercase italic">{s.firstName} {s.lastName}</p>
                              <code className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{s.studentCode}</code>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className={cn(
                              "w-3 h-3 rounded-full animate-pulse",
                              marks[s.id] >= passMarks ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : 
                              marks[s.id] > 0 ? "bg-rose-500 shadow-lg shadow-rose-500/20" : "bg-slate-200"
                           )} />
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center justify-center gap-3">
                              <input 
                                 type="number" 
                                 value={marks[s.id] || ""}
                                 onChange={(e) => handleUpdateMark(s.id, e.target.value)}
                                 className={cn(
                                    "w-24 px-4 py-3 bg-slate-50 rounded-2xl border-2 border-transparent outline-none font-black text-center text-lg transition-all focus:bg-white focus:shadow-xl",
                                    marks[s.id] >= 75 ? "text-blue-600 focus:border-blue-400" : 
                                    marks[s.id] < passMarks && marks[s.id] > 0 ? "text-rose-600 focus:border-rose-400" : "text-slate-900 focus:border-slate-200"
                                 )}
                                 placeholder="--"
                              />
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                              marks[s.id] >= 90 ? "bg-blue-600 text-white" :
                              marks[s.id] >= 75 ? "bg-emerald-100 text-emerald-700" :
                              marks[s.id] >= passMarks ? "bg-amber-100 text-amber-700" :
                              marks[s.id] > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-400"
                           )}>
                              {marks[s.id] >= 90 ? "A+ ELITE" :
                               marks[s.id] >= 75 ? "A EXCELLENT" :
                               marks[s.id] >= passMarks ? "B QUALIFIED" :
                               marks[s.id] > 0 ? "F RE-TEST" : "PENDING"}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-right">
                           <input 
                              type="text" 
                              value={remarks[s.id] || ""}
                              onChange={(e) => setRemarks(prev => ({ ...prev, [s.id]: e.target.value }))}
                              placeholder="Add Remark..."
                              className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-right text-[10px] font-black uppercase tracking-widest text-slate-400 placeholder:text-slate-200 transition-all"
                           />
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic font-mono decoration-blue-500/20 underline decoration-2 underline-offset-4">Logic: Automated Scoring & Grading Active</p>
            <div className="flex gap-4">
               <button onClick={() => window.print()} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all">
                  <FileText className="w-3.5 h-3.5" /> Export PDF Preview
               </button>
               <button onClick={handleSync} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-200 hover:scale-105 active:scale-95 transition-all">
                  <LayoutGrid className="w-3.5 h-3.5" /> Final Sync to Core
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}
