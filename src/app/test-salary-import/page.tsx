"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Search,
  Wifi,
  WifiOff,
  Server
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

import { validateIfscBatchAction, fetchIfscLiveAction } from "@/lib/actions/ifsc-actions";

// --- TIER 1: REGEX ENGINE (Pre-flight browser check) ---
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

interface ParsedRow {
  index: number;
  name: string;
  accountNo: string;
  rawIfsc: string;
  cleanIfsc: string;
  actualSalary: number;
  totalDays: number;
  workedDays: number;
  netSalary: number;
  tier1Pass: boolean;
  tier2Pass: boolean;
  bankName?: string;
  apiChecked: boolean;
  apiStatus?: "success" | "fail" | "loading";
  issues: string[];
}

export default function SalaryImportLab() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [data, setData] = useState<ParsedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFile(file);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileData = e.target?.result;
        const workbook = XLSX.read(fileData, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
        
        let headerRowIdx = -1;
        for(let i=0; i<Math.min(10, jsonData.length); i++) {
          if (jsonData[i].includes("NAME") || jsonData[i].includes("ACTUAL SALARY")) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          alert("Could not detect headers in this Excel sheet.");
          setIsParsing(false);
          return;
        }

        const headers = jsonData[headerRowIdx] as string[];
        const nameIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("NAME"));
        const accIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("ACCOUNT"));
        const ifscIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("IFSC"));
        const actualSalIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("ACTUAL SALARY"));
        const totalDaysIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("TOTAL WORKING DAYS"));
        const workedDaysIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("NO.OF WORKING"));
        const netSalIdx = headers.findIndex(h => typeof h === 'string' && h.toUpperCase().includes("NET SALARY"));

        const parsedRows: ParsedRow[] = [];
        const ifscsToCheck: string[] = [];

        for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = row[nameIdx];
          if (!name) continue;

          const rawAcc = String(row[accIdx] || "");
          const rawIfsc = String(row[ifscIdx] || "");
          const actualSalary = Number(row[actualSalIdx] || 0);
          const totalDays = Number(row[totalDaysIdx] || 30);
          const workedDays = Number(row[workedDaysIdx] || 30);
          const netSalary = Number(row[netSalIdx] || 0);

          const cleanIfsc = rawIfsc.trim().toUpperCase();
          const cleanAcc = rawAcc.trim().replace(/\s/g, '');
          
          let tier1Pass = true;
          const issues: string[] = [];

          if (rawIfsc !== cleanIfsc) issues.push("Invisible spaces stripped.");
          if (rawAcc !== cleanAcc) issues.push("Spaces removed from Account.");

          if (!IFSC_REGEX.test(cleanIfsc)) {
            tier1Pass = false;
            issues.push("Invalid IFSC Format (Check length & 5th char '0').");
          }

          if (cleanIfsc) {
            ifscsToCheck.push(cleanIfsc);
          }

          parsedRows.push({
            index: i,
            name,
            accountNo: cleanAcc,
            rawIfsc,
            cleanIfsc,
            actualSalary,
            totalDays,
            workedDays,
            netSalary,
            tier1Pass,
            tier2Pass: false,
            bankName: "Pending Verification",
            apiChecked: false,
            issues
          });
        }

        // Tier 2: Bulk Offline Validation via Razorpay `ifsc` Server Action
        if (ifscsToCheck.length > 0) {
          const batchValidation = await validateIfscBatchAction(ifscsToCheck);
          if (batchValidation.success && batchValidation.data) {
            const validationMap = new Map(batchValidation.data.map((res: any) => [res.code, res]));
            
            for (const row of parsedRows) {
              const res = validationMap.get(row.cleanIfsc);
              if (res) {
                if (!res.isValidOffline) {
                  row.tier2Pass = false;
                  if (!row.issues.includes("Failed Offline RBI Check")) {
                     row.issues.push("Failed Offline RBI Check (Fake Branch Code).");
                  }
                  row.bankName = "Invalid Branch";
                } else {
                  row.tier2Pass = true;
                  row.bankName = res.bankName || `Bank Code: ${res.bankCode}`;
                }
                
                if (!res.isKnownBank) {
                  row.issues.push(`Bank code '${res.bankCode}' not active in current RBI Registry.`);
                }
              }
            }
          }
        }

        setData(parsedRows);

        // --- AUTO-VERIFY TRIGGER ---
        // Automatically start the throttled verification queue for branch details
        const pendingRows = parsedRows.filter(r => r.tier1Pass && r.tier2Pass && !r.apiChecked);
        for (const row of pendingRows) {
          // We use a small delay and a localized update to prevent UI freezing
          await handleApiVerify(row.index, parsedRows); 
          await new Promise(resolve => setTimeout(resolve, 150)); // 150ms throttle
        }
      } catch (err) {
        console.error("Error parsing file", err);
        alert("Failed to parse the Excel file.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // --- TIER 3: SURGICAL API VERIFICATION ---
  const handleApiVerify = async (index: number, currentData?: ParsedRow[]) => {
    const dataSource = currentData || data;
    const row = dataSource.find(r => r.index === index);
    if (!row || row.apiStatus === "loading") return;

    setData(prev => prev.map(r => r.index === index ? { ...r, apiStatus: "loading" } : r));

    try {
      const response = await fetchIfscLiveAction(row.cleanIfsc);
      if (response.success && response.data) {
        const details = response.data;
        setData(prev => prev.map(r => 
          r.index === index ? { 
            ...r, 
            apiStatus: "success", 
            apiChecked: true, 
            bankName: details.BANK, 
            branchName: details.BRANCH,
            issues: [...r.issues.filter(i => !i.includes("not active in current")), `Verified live: ${details.BRANCH}`] 
          } : r
        ));
      } else {
        setData(prev => prev.map(r => 
          r.index === index ? { 
            ...r, 
            apiStatus: "fail", 
            apiChecked: true, 
            tier1Pass: false, // Force fail
            issues: [...r.issues, "Razorpay API Rejected: Invalid IFSC"] 
          } : r
        ));
      }
    } catch (err) {
      setData(prev => prev.map(r => r.index === index ? { ...r, apiStatus: "fail" } : r));
    }
  };

  // --- BULK VERIFICATION QUEUE (Safe Throttling) ---
  const verifyAllBranches = async () => {
    const pendingRows = data.filter(r => r.tier1Pass && r.tier2Pass && !r.apiChecked);
    for (const row of pendingRows) {
      await handleApiVerify(row.index);
      // Small 200ms delay between calls to be respectful of API limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              Salary Import & Validation Lab
            </h1>
            <p className="text-slate-500 font-medium mt-1 pl-11">
              Offline-first validation with deep RBI metadata.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {data.length > 0 && (
              <button 
                onClick={verifyAllBranches}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 active:scale-95"
              >
                <Wifi className="w-4 h-4" />
                START AUTO-VERIFICATION
              </button>
            )}
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-xs border border-emerald-100">
              <Server className="w-4 h-4" />
              RBI REGISTRY ACTIVE
            </div>
          </div>
        </div>

        {/* Validation Summary Cards */}
        {data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
              <p className="text-3xl font-black text-slate-900">{data.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Validated</p>
              <p className="text-3xl font-black text-emerald-600">
                {data.filter(r => r.apiStatus === "success").length}
              </p>
            </div>
            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 shadow-sm">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Critical Errors</p>
              <p className="text-3xl font-black text-rose-600">
                {data.filter(r => !r.tier1Pass || r.apiStatus === "fail").length}
              </p>
            </div>
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Warnings</p>
              <p className="text-3xl font-black text-amber-600">
                {data.filter(r => r.issues.length > 0 && r.tier1Pass && r.apiStatus !== "fail").length}
              </p>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {!data.length && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "w-full max-w-2xl mx-auto mt-10 border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
              isParsing && "opacity-50 pointer-events-none"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => e.target.files && processFile(e.target.files[0])}
            />
            {isParsing ? (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            ) : (
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <UploadCloud className="w-10 h-10" />
              </div>
            )}
            <h3 className="text-xl font-black text-slate-800 mb-2">Drag & Drop Excel File</h3>
            <p className="text-slate-500 font-medium">Supports .xlsx and .csv formats</p>
          </div>
        )}

        {/* Data Matrix */}
        {data.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <h3 className="font-black text-slate-800 text-lg">Payroll Data Audit</h3>
              </div>
              <button 
                onClick={() => { setData([]); setFile(null); }}
                className="text-xs font-black text-slate-400 hover:text-rose-600 px-4 py-2 rounded-xl hover:bg-rose-50 transition-all uppercase tracking-widest"
              >
                Reset & Upload New
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                    <th className="p-6">Staff Member & Audit Issues</th>
                    <th className="p-6">Account Number</th>
                    <th className="p-6">Bank & Branch (Detailed)</th>
                    <th className="p-6 text-right pr-10">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((row) => {
                    const hasIssues = row.issues.length > 0;
                    const isCriticalFail = !row.tier1Pass || row.apiStatus === "fail";

                    return (
                      <tr key={row.index} className={cn(
                        "transition-all duration-200", 
                        isCriticalFail ? "bg-rose-50/40" : "hover:bg-slate-50/50"
                      )}>
                        {/* Name & Clear Error Details */}
                        <td className="p-6 max-w-[300px]">
                          <div className="font-black text-slate-800 text-sm mb-2">{row.name}</div>
                          <div className="space-y-1.5">
                            {row.issues.map((issue, idx) => {
                              const isError = issue.includes("Rejected") || issue.includes("Format") || issue.includes("Failed");
                              return (
                                <div key={idx} className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-tight",
                                  isError 
                                    ? "bg-rose-100 border-rose-200 text-rose-700" 
                                    : "bg-amber-100 border-amber-200 text-amber-700"
                                )}>
                                  {isError ? <AlertCircle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                  {issue}
                                </div>
                              );
                            })}
                            {!hasIssues && row.apiStatus === "success" && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-tight">
                                <CheckCircle2 className="w-3 h-3" />
                                DATA INTEGRITY VERIFIED
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Account */}
                        <td className="p-6">
                          <div className="font-black text-slate-700 font-mono tracking-widest text-sm bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 inline-block">
                            {row.accountNo}
                          </div>
                        </td>

                        {/* IFSC Hybrid Validation */}
                        <td className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col min-w-[220px]">
                              <span className={cn(
                                "font-black font-mono tracking-[2px] text-base mb-1", 
                                isCriticalFail ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {row.cleanIfsc}
                              </span>
                              <div className="flex flex-col gap-1 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                                  {row.bankName}
                                </span>
                                {row.branchName ? (
                                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter flex items-center gap-1">
                                    <Search className="w-3 h-3" />
                                    {row.branchName}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-400 italic flex items-center gap-1">
                                    <Loader2 className={cn("w-3 h-3", row.apiStatus === "loading" && "animate-spin")} />
                                    {row.apiStatus === "loading" ? "Fetching branch..." : "Branch pending verification"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status Icon */}
                            <div className={cn(
                              "mt-2 w-10 h-10 rounded-2xl border flex items-center justify-center transition-all",
                              row.apiStatus === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-600" :
                              row.apiStatus === "fail" ? "bg-rose-50 border-rose-200 text-rose-600 shadow-lg shadow-rose-200/50" :
                              "bg-slate-50 border-slate-200 text-slate-300"
                            )}>
                              {row.apiStatus === "loading" ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> :
                               row.apiStatus === "success" ? <CheckCircle2 className="w-6 h-6" /> :
                               row.apiStatus === "fail" ? <AlertCircle className="w-6 h-6" /> :
                               <Wifi className="w-5 h-5 opacity-40" />
                              }
                            </div>
                          </div>
                        </td>

                        {/* Net Payout */}
                        <td className="p-6 text-right pr-10">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payout</div>
                          <div className={cn(
                            "font-black text-xl tracking-tight",
                            isCriticalFail ? "text-slate-300 line-through" : "text-slate-900"
                          )}>
                            ₹{row.netSalary.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                             ({row.totalDays - row.workedDays} LWP DEDUCTED)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
