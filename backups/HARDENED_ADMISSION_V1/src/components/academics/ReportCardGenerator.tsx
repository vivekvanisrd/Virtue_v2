"use client";

import React, { useRef } from "react";
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Award, 
  TrendingUp, 
  User, 
  Calendar,
  Zap,
  ShieldCheck,
  Star,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReportCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  results: any[];
  examName: string;
}

export function ReportCardGenerator({ isOpen, onClose, student, results, examName }: ReportCardGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const calculateTotal = () => {
    return results.reduce((acc, r) => acc + Number(r.marksObtained), 0);
  };

  const calculateMax = () => {
    return results.reduce((acc, r) => acc + Number(r.totalMarks), 0);
  };

  const percentage = results.length > 0 ? (calculateTotal() / calculateMax()) * 100 : 0;

  const handlePrint = () => {
    const printContent = printRef.current;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime();
    const windowName = "Print" + uniqueName;
    const printWindow = window.open(windowUrl, windowName, "left=50,top=50,width=800,height=900");

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Report Card - ${student.firstName}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 4px double #e2e8f0; padding-bottom: 20px; }
              .school-name { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; color: #1e293b; }
              .report-title { font-size: 14px; font-weight: 700; color: #64748b; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.2em; }
              .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
              .info-item { font-size: 12px; }
              .info-label { font-weight: 700; color: #94a3b8; text-transform: uppercase; font-size: 10px; margin-bottom: 2px; }
              .info-value { font-weight: 900; color: #1e293b; font-size: 14px; }
              .marks-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border: 2px solid #f1f5f9; }
              .marks-table th { text-align: left; background: #f8fafc; padding: 15px; font-size: 10px; text-transform: uppercase; color: #64748b; border: 1px solid #f1f5f9; }
              .marks-table td { padding: 15px; border: 1px solid #f1f5f9; font-size: 12px; font-weight: 700; }
              .summary-box { display: grid; grid-template-cols: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
              .stat-box { border: 2px solid #f1f5f9; padding: 20px; border-radius: 12px; text-align: center; }
              .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
              .stat-value { font-size: 24px; font-weight: 900; color: #1e293b; }
              .footer { margin-top: 60px; display: grid; grid-template-cols: 1fr 1fr; gap: 100px; text-align: center; }
              .signature { border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #64748b; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>window.print(); setTimeout(() => window.close(), 500);</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        >
          {/* Controls */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                   <Award className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="font-black text-sm uppercase tracking-widest tracking-tighter italic">Progress Report Console</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High Integrity Academic Statement</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200"
                >
                   <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                   <X className="w-5 h-5 text-slate-400" />
                </button>
             </div>
          </div>

          {/* Report Card Preview (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-12 bg-slate-50 border-x-4 border-slate-100">
             <div ref={printRef} className="bg-white mx-auto shadow-2xl p-16 min-h-[1000px] border border-slate-100 rounded-[3rem] relative overflow-hidden">
                
                {/* School Header */}
                <div className="header text-center mb-12 border-b-4 border-double border-slate-100 pb-10">
                   <h1 className="school-name text-4xl font-black italic tracking-tighter uppercase mb-2">VIRTUE INTERNATIONAL ACADEMY</h1>
                   <p className="font-bold text-slate-400 text-[10px] tracking-[0.3em] uppercase">Session 2025-26 • Holistic Academic Record</p>
                   <div className="mt-6 flex justify-center gap-4">
                      <span className="px-5 py-1.5 bg-black text-white rounded-full text-[9px] font-black uppercase tracking-widest">{examName}</span>
                      <span className="px-5 py-1.5 border-2 border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest">Progress Report</span>
                   </div>
                </div>

                {/* Student Info Matrix */}
                <div className="grid grid-cols-2 gap-y-10 gap-x-20 mb-16">
                   <div className="space-y-6">
                      <div className="group">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 underline decoration-blue-500/20 underline-offset-4 decoration-2">Student Name</p>
                         <p className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{student.firstName} {student.lastName}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Scholar Number</p>
                         <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{student.studentCode}</p>
                      </div>
                   </div>
                   <div className="space-y-6 text-right">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Class / Section</p>
                         <p className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{student.className || 'VI'} - {student.sectionName || 'A'}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                         <p className="text-sm font-black text-slate-900 uppercase tracking-widest">#{student.rollNo || '24'}</p>
                      </div>
                   </div>
                </div>

                {/* Performance Matrix */}
                <table className="marks-table">
                   <thead>
                      <tr>
                         <th className="w-2/5">Learning Objective (Subject)</th>
                         <th className="text-center">Total Marks</th>
                         <th className="text-center">Passing Marks</th>
                         <th className="text-center">Marks Obtained</th>
                         <th className="text-center">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {results.map((r, i) => (
                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 font-black uppercase italic tracking-tight">{r.subject?.name || 'Subject'}</td>
                            <td className="text-center text-slate-500">{Number(r.totalMarks)}</td>
                            <td className="text-center text-slate-400">{Number(r.passMarks)}</td>
                            <td className="text-center text-slate-900 text-lg">{Number(r.marksObtained)}</td>
                            <td className="text-center">
                               <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black tracking-[0.1em] uppercase",
                                  Number(r.marksObtained) >= Number(r.passMarks) ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                               )}>
                                  {Number(r.marksObtained) >= Number(r.passMarks) ? "Distinction" : "Re-Test"}
                               </span>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>

                {/* Summary Hub */}
                <div className="summary-box">
                   <div className="stat-box border-slate-900 bg-slate-900 text-white">
                      <p className="stat-label opacity-40">Aggregate Ratio</p>
                      <p className="stat-value text-white">{calculateTotal()} / {calculateMax()}</p>
                   </div>
                   <div className="stat-box border-blue-600 bg-blue-50">
                      <p className="stat-label text-blue-900">Total Percentage</p>
                      <p className="stat-value text-blue-600">{percentage.toFixed(2)}%</p>
                   </div>
                   <div className="stat-box">
                      <p className="stat-label">Final Standing</p>
                      <p className="stat-value">
                        {percentage >= 90 ? "A+" : percentage >= 75 ? "A" : percentage >= 60 ? "B" : percentage >= 33 ? "C" : "D"}
                      </p>
                   </div>
                </div>

                {/* Footer Signatories */}
                <div className="footer">
                   <div className="signature">
                      <p className="mb-2">Class Teacher Signature</p>
                      <div className="h-0.5 bg-slate-100 w-full" />
                   </div>
                   <div className="signature">
                      <p className="mb-2">Principal Signatory</p>
                      <div className="h-0.5 bg-slate-100 w-full" />
                   </div>
                </div>

                {/* Watermark Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-25deg] pointer-events-none scale-150">
                   <h1 className="text-[12rem] font-black italic tracking-tighter">VIRTUE</h1>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
