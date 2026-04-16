"use client";

import React, { useState, useRef } from "react";
import { 
  FileUp, Download, CheckCircle2, AlertCircle, 
  Trash2, Landmark, User, Zap, Sparkles 
} from "lucide-react";
import { importStaffEliteBulkAction, BulkImportResult } from "@/lib/actions/staff-bulk-actions";

export function StaffBulkPortal({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setError("Invalid file format. Please upload a Sovereign CSV template.");
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const deepSanitize = (val: any) => {
        if (typeof val !== 'string') return val;
        return val
            .replace(/\s+/g, ' ')       // Collapse multiple spaces
            .replace(/[.!]/g, '')       // Remove unwanted symbols
            .trim()
            .split(' ')
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = text.split(/\r?\n/).filter(row => row.trim());
      const headers = rows[0].split(",").map(h => h.trim());
      
      const data = rows.slice(1).map((row, index) => {
        const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(",");
        const obj: any = { _rowNum: index + 1 };
        headers.forEach((header, i) => {
          let val = values[i]?.trim() || "";
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          
          // Apply instant sanitization for preview
          if (header === "firstName" || header === "lastName" || header === "middleName") {
            val = deepSanitize(val);
          }
          
          obj[header] = val;
        });
        return obj;
      });
      setParsedData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await importStaffEliteBulkAction(parsedData);
      setResult(res);
      if (res.success) {
        setParsedData([]);
        setFile(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 🏛️ HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-widest uppercase">Sovereign Bulk Ledger</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Elite Staff <span className="text-indigo-600">Provisioning.</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Atomically onboard staff clusters while maintaining 100% rule compliance.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <a 
            href="/templates/pava_staff_template.csv" 
            download 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Download className="w-4 h-4" /> Download Golden Template
          </a>
          <button 
            onClick={onBack}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-xs font-bold transition-all"
          >
            Return to Hub
          </button>
        </div>
      </div>

      {result && (
        <div className={`mb-8 p-6 rounded-3xl border ${result.success ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"} animate-in zoom-in duration-300`}>
          <div className="flex items-center gap-3 mb-4">
            {result.success ? <CheckCircle2 className="text-emerald-500 w-6 h-6" /> : <AlertCircle className="text-rose-500 w-6 h-6" />}
            <h3 className="font-bold text-slate-900">
              {result.success ? "Cluster Onboarding Finalized" : "Onboarding Interrupted"}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white/50 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Success</div>
              <div className="text-2xl font-black text-emerald-600">{result.insertedCount}</div>
            </div>
            <div className="bg-white/50 p-3 rounded-2xl">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Failed/Skipped</div>
              <div className="text-2xl font-black text-rose-600">{result.skippedCount}</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200/50 max-h-48 overflow-y-auto space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Error Detailed Trail</div>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs flex items-center gap-3 bg-white/40 p-2 rounded-lg">
                  <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded font-bold">R{err.row}</span>
                  <span className="font-bold text-slate-700">{err.name}:</span>
                  <span className="text-rose-500">{err.reason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-80 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-200 transition-all cursor-pointer group"
        >
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <FileUp className="w-8 h-8 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 mb-1">Upload Sovereign Staff Ledger</div>
          <p className="text-xs text-slate-400">Drag and drop your pava_staff_template.csv here</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".csv"
          />
        </div>
      ) : (
        <div className="glass rounded-[32px] premium-shadow border border-white/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                   <Zap className="w-5 h-5" />
                </div>
                <div>
                   <div className="text-sm font-bold text-slate-900">{file.name}</div>
                   <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{parsedData.length} Personnel Identified</div>
                </div>
             </div>
             <button 
               onClick={() => { setFile(null); setParsedData([]); }}
               className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
             >
                <Trash2 className="w-5 h-5" />
             </button>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase">Personnel Name</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase">Salary</th>
                      <th className="p-4 text-[10px] font-bold text-slate-400 uppercase">Bank/Account</th>
                   </tr>
                </thead>
                <tbody>
                   {parsedData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-indigo-50/10 transition-colors">
                         <td className="p-4">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">READY</span>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                  <User className="w-4 h-4" />
                               </div>
                               <div>
                                  <div className="text-xs font-bold text-slate-700">{row.firstName} {row.lastName}</div>
                                  <div className="text-[9px] text-slate-400 font-medium">{row.designation || "Staff"} · {row.role || "Teacher"}</div>
                               </div>
                            </div>
                         </td>
                         <td className="p-4">
                            <div className="text-xs font-black text-slate-700">₹{row.basicSalary || 0}</div>
                         </td>
                         <td className="p-4">
                            <div className="flex items-center gap-2">
                               <Landmark className="w-3 h-3 text-amber-500" />
                               <div className="text-[10px] font-medium text-slate-500">{row.accountNumber || "N/A"}</div>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
             {parsedData.length > 50 && (
                <div className="p-4 text-center text-[10px] text-slate-400 font-bold uppercase bg-slate-50/30">
                   + {parsedData.length - 50} more records in cluster
                </div>
             )}
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
             <button
               onClick={handleImport}
               disabled={isProcessing}
               className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
             >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Committing Cluster...
                  </span>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Confirm & Onboard Cluster
                  </>
                )}
             </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs flex items-center gap-3">
           <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
    </div>
  );
}
