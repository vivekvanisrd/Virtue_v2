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
  Users
} from "lucide-react";
import { importStaffCSV } from "@/lib/actions/staff-import-actions";
import { cn } from "@/lib/utils";

import { useTenant } from "@/context/tenant-context";

export function StaffImportManager() {
  const { schoolId, branchId } = useTenant();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple client-side CSV text parser
  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      // Handle simple comma separation without robust quote breaking for brevity
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
    reader.onerror = () => {
      setIsParsing(false);
      alert("Failed to read file");
    };
    reader.readAsText(selected);
  };

  const clearFile = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    // Call server action for validation and insertion
    const result = await importStaffCSV(parsedData, schoolId, branchId);
    
    setImportResult(result);
    setIsImporting(false);
  };

  const downloadTemplate = () => {
    const headers = "firstName,lastName,employeeId,email,phone,role\n";
    const sample = "John,Doe,EMP-001,john@example.com,9876543210,TEACHER\n";
    const blob = new Blob([headers + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-background p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Bulk Import Staff & Teachers
          </h2>
          <p className="text-foreground opacity-60 mt-1">
            Upload a CSV to securely batch import multiple staff records.
          </p>
        </div>
        
        <button 
          onClick={downloadTemplate}
          className="px-4 py-2 bg-muted/50 text-slate-700 hover:bg-slate-100 rounded-lg text-sm font-bold flex items-center gap-2 border border-border transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Main Upload Area */}
      {!file && !importResult && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-background border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-[30px] p-16 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
        >
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Drag & Drop or Click to Upload</h3>
          <p className="text-foreground opacity-60 max-w-md mx-auto">
            Please ensure your CSV uses the exact columns specified in our template. Duplicate emails and phones will be automatically skipped.
          </p>
        </div>
      )}

      {/* File Selected / Parse View */}
      {file && !importResult && (
        <div className="bg-background rounded-[30px] border border-border shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{file.name}</h3>
                <p className="text-sm text-foreground opacity-60">{parsedData.length} records parsed</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={clearFile}
                className="p-3 text-foreground opacity-50 hover:bg-muted/50 hover:text-red-500 rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || parsedData.length === 0}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                {isImporting ? "Processing..." : "Validate & Import"}
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-auto custom-scrollbar p-6">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 text-foreground opacity-60 font-bold border-b border-border">
                  <th className="py-3 px-4 rounded-tl-xl whitespace-nowrap">Full Name</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedData.slice(0, 50).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50/50">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{row.employeeId || "-"}</td>
                    <td className="py-3 px-4 text-slate-600">{row.email || "-"}</td>
                    <td className="py-3 px-4 text-slate-600 font-bold">{row.role || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.length > 50 && (
              <div className="text-center py-4 text-xs font-bold text-foreground opacity-50 bg-muted/50 mt-4 rounded-xl">
                Showing top 50 records of {parsedData.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Results View */}
      {importResult && (
        <div className="bg-background rounded-[30px] border border-border shadow-sm overflow-hidden p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-foreground mb-2">Import Complete!</h2>
          <p className="text-foreground opacity-60 mb-8 max-w-lg mx-auto">
            The bulk staff import process has finished executing securely. Please review the summary of imported and skipped records below.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="text-4xl font-black text-green-600 mb-1">{importResult.insertedCount}</div>
              <div className="text-sm font-bold text-green-800 uppercase tracking-wider">Successfully Added</div>
            </div>
            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
              <div className="text-4xl font-black text-orange-600 mb-1">{importResult.skippedCount}</div>
              <div className="text-sm font-bold text-orange-800 uppercase tracking-wider">Skipped / Duplicates</div>
            </div>
          </div>

          {/* Skipped Details Log */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="text-left bg-red-50/50 rounded-2xl border-2 border-red-100 p-6 max-h-[300px] overflow-y-auto custom-scrollbar">
              <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Skipped Record Details
              </h4>
              <ul className="space-y-3">
                {importResult.errors.map((err: any, idx: number) => (
                  <li key={idx} className="bg-background p-3 rounded-xl border border-red-100 text-sm flex items-start gap-3">
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold text-xs shrink-0 mt-0.5">
                      Row {err.row}
                    </span>
                    <div>
                      <div className="font-bold text-foreground">{err.name} <span className="text-foreground opacity-50 font-normal">({err.employeeId})</span></div>
                      <div className="text-red-600 font-medium">{err.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
             <button 
                onClick={clearFile}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
              >
                Upload Another File
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
