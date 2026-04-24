"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet, 
  Download,
  Trash2,
  Users,
  Info
} from "lucide-react";
import { importStudentsAction } from "@/lib/actions/student-import-actions";
import { cn } from "@/lib/utils";

import { useTenant } from "@/context/tenant-context";

export function StudentImportHub() {
  const { schoolId } = useTenant();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ''));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || "";
      });
      result.push(obj);
    }
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setParsedData(data);
      setIsParsing(false);
    };
    reader.readAsText(selected);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    const result = await importStudentsAction(parsedData, schoolId);
    setImportResult(result);
    setIsImporting(false);
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/student_import_template.csv";
    link.download = "student_migration_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-background p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Migration Hub</h2>
            <p className="text-foreground opacity-60 text-sm">Bulk import legacy student records with deep-check validation.</p>
          </div>
        </div>
        <button 
          onClick={downloadTemplate}
          className="px-5 py-2.5 bg-muted/50 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-bold flex items-center gap-2 border border-border transition-all"
        >
          <Download className="w-4 h-4" />
          Professional Template
        </button>
      </div>

      {!file && !importResult && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-background border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-[30px] p-20 flex flex-col items-center justify-center cursor-pointer transition-all text-center group bg-[radial-gradient(circle_at_top_right,var(--primary-light),transparent)]"
        >
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <UploadCloud className="w-16 h-16 text-primary mb-6 group-hover:scale-110 transition-transform duration-300" />
          <h3 className="text-2xl font-bold text-foreground mb-3">Upload Migration CSV</h3>
          <p className="text-foreground opacity-60 max-w-lg mx-auto">
            Drag & drop your populated template here. Every record will be verified against our 52-point integrity check.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs font-bold text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
            <Info className="w-4 h-4" />
            Supports Identity, Academic, Family & Financial Records
          </div>
        </div>
      )}

      {file && !importResult && (
        <div className="bg-background rounded-[30px] border border-border shadow-sm overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{file.name}</h3>
                <p className="text-sm text-foreground opacity-60">{parsedData.length} records detected</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setFile(null)} className="p-3 text-foreground opacity-50 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || parsedData.length === 0}
                className="px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                {isImporting ? "Deep Checking..." : "Commit Migration"}
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-auto custom-scrollbar p-0">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-10">
                <tr className="text-foreground opacity-70 font-bold border-b border-border">
                  <th className="py-4 px-6 whitespace-nowrap">Student Name</th>
                  <th className="py-4 px-6">Class</th>
                  <th className="py-4 px-6">Admission No</th>
                  <th className="py-4 px-6">Guardian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsedData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-foreground">{row.firstName} {row.lastName}</td>
                    <td className="py-4 px-6"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{row.className || "Missing"}</span></td>
                    <td className="py-4 px-6 font-mono text-xs">{row.admissionNumber || "-"}</td>
                    <td className="py-4 px-6 text-foreground opacity-60">{row.fatherName || "Missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importResult && (
        <div className="bg-background rounded-[30px] border border-border shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95 duration-500">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl",
            importResult.success ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          )}>
            {importResult.success ? <CheckCircle2 className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
          </div>
          
          <h2 className="text-4xl font-black text-foreground mb-3">{importResult.success ? "Migration Successful!" : "Migration Blocked"}</h2>
          <p className="text-foreground opacity-60 mb-10 max-w-xl mx-auto text-lg">
            {importResult.success 
              ? "All valid records have been securely committed to the academic and financial ledgers."
              : "Multiple critical integrity errors were detected in your CSV data."}
          </p>

          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto mb-10">
            <div className="bg-green-50 rounded-[24px] p-8 border border-green-100 shadow-sm transition-transform hover:scale-105">
              <div className="text-5xl font-black text-green-600 mb-2">{importResult.insertedCount}</div>
              <div className="text-xs font-black text-green-800 uppercase tracking-[0.2em]">Imported</div>
            </div>
            <div className="bg-orange-50 rounded-[24px] p-8 border border-orange-100 shadow-sm transition-transform hover:scale-105">
              <div className="text-5xl font-black text-orange-600 mb-2">{importResult.skippedCount}</div>
              <div className="text-xs font-black text-orange-800 uppercase tracking-[0.2em]">Failures</div>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="text-left bg-red-50/30 rounded-[30px] border-2 border-red-50 p-8 max-h-[400px] overflow-y-auto custom-scrollbar">
              <h4 className="font-bold text-red-800 mb-6 flex items-center gap-2 text-lg">
                <AlertCircle className="w-6 h-6" />
                Deep Validation Diagnostics
              </h4>
              <div className="space-y-4">
                {importResult.errors.map((err: any, idx: number) => (
                  <div key={idx} className="bg-background p-4 rounded-2xl border border-red-100 shadow-sm flex items-start gap-4">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-lg font-black text-[10px] shrink-0 mt-1">
                      ROW {err.row}
                    </span>
                    <div>
                      <div className="font-bold text-foreground text-base">{err.name}</div>
                      <div className="text-red-600 font-medium text-sm leading-relaxed">{err.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12">
             <button onClick={() => { setFile(null); setImportResult(null); }} className="px-10 py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black transition-all shadow-xl active:scale-95">
                New Migration Upload
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
