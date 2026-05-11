"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Server, 
  Wifi, 
  Search,
  Download,
  Filter,
  ArrowRight,
  LayoutGrid,
  List,
  SortAsc,
  Maximize2,
  Minimize2,
  ChevronDown,
  Edit3,
  Save,
  Trash2,
  XCircle,
  History,
  Calendar,
  Upload,
  IndianRupee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { validateIfscBatchAction, fetchIfscLiveAction } from "@/lib/actions/ifsc-actions";
import { processBulkSalaryImportAction, getAuditHistoryAction } from "@/lib/actions/bulk-salary-actions";

// --- TIER 1: REGEX ENGINE ---
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
  branchName?: string;
  apiChecked: boolean;
  apiStatus?: "success" | "fail" | "loading";
  issues: string[];
  selected: boolean; // For manual selection/payout
  isExported?: boolean; // Tracking export status
  segment?: string; // RCB, SNB, MNB
  isPaid?: boolean;
}

export function BulkPayoutAudit() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<ParsedRow[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"TABLE" | "CARDS" | "HISTORY">("TABLE");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSegment, setFilterSegment] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortField, setSortField] = useState<keyof ParsedRow | "">("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastOrderRef = useRef<number[]>([]);

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

  React.useEffect(() => {
    const savedAuth = localStorage.getItem("audit_lab_auth");
    if (savedAuth === "true") setIsAuthorized(true);
    loadHistory();
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    // HARDCODED PASSWORD AS REQUESTED
    if (passwordInput === "Virtue@2026") {
      setIsAuthorized(true);
      localStorage.setItem("audit_lab_auth", "true");
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const loadHistory = async () => {
    const res = await getAuditHistoryAction();
    if (res.success) {
      setHistory(res.data);
      // AUTO-RESTORE LATEST SESSION IF LAB IS EMPTY
      if (data.length === 0 && res.data.length > 0) {
        const latestRecords = res.data.filter((r: any) => {
          const latestTime = new Date(res.data[0].processedAt);
          const rTime = new Date(r.processedAt);
          return Math.abs(latestTime.getTime() - rTime.getTime()) < 30000;
        });

        const restoredData: ParsedRow[] = latestRecords.map((r: any, index: number) => ({
          index: index + 1,
          name: r.staffName,
          accountNo: r.accountNumber,
          rawIfsc: r.ifscCode,
          cleanIfsc: r.ifscCode,
          actualSalary: Number(r.actualSalary),
          totalDays: r.totalDays,
          workedDays: r.presentDays,
          netSalary: Number(r.netSalary),
          bankName: r.bankName,
          branchName: r.branchName,
          segment: r.segment,
          tier1Pass: true,
          tier2Pass: true,
          apiChecked: true,
          apiStatus: "success",
          issues: [],
          selected: true
        }));
        setData(restoredData);
      }
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
        let segmentIdx = headers.findIndex(h => typeof h === 'string' && (h.toUpperCase().includes("SEGMENT") || h.toUpperCase().includes("GROUP")));
        
        // --- DEEP SCAN FOR SEGMENT COLUMN ---
        // If no header match, look at the last column of data rows for keywords
        if (segmentIdx === -1) {
          for (let i = headerRowIdx + 1; i < Math.min(headerRowIdx + 10, jsonData.length); i++) {
            const row = jsonData[i];
            if (row && row.length > 0) {
              const lastVal = String(row[row.length - 1]).trim().toUpperCase();
              if (["RCB", "SNB", "MNB"].includes(lastVal)) {
                segmentIdx = row.length - 1;
                break;
              }
            }
          }
        }

        const parsedRows: ParsedRow[] = [];
        const ifscsToCheck: string[] = [];
        let currentSegment = "PENDING";

        for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // Check for Segment Headers (RCB, SNB, MNB)
          const rowText = row.join(" ").toUpperCase();
          if (rowText.includes("RCB") && !row[nameIdx]) currentSegment = "RCB";
          else if (rowText.includes("SNB") && !row[nameIdx]) currentSegment = "SNB";
          else if (rowText.includes("MNB") && !row[nameIdx]) currentSegment = "MNB";

          if (!row[nameIdx] || String(row[nameIdx]).trim() === "" || !isNaN(Number(row[nameIdx]))) continue;
          
          // Row-level segment detection
          const rowSegment = segmentIdx !== -1 && row[segmentIdx] ? String(row[segmentIdx]).trim().toUpperCase() : currentSegment;
          
          const name = String(row[nameIdx]).trim();
          const rawAcc = String(row[accIdx] || "");
          const rawIfsc = String(row[ifscIdx] || "");
          const actualSalary = Number(row[actualSalIdx] || 0);
          const totalDays = Number(row[totalDaysIdx] || 30);
          const workedDays = Number(row[workedDaysIdx] || 30);
          const netSalary = Number(row[netSalIdx] || 0);

          // AUTO-CORRECT: The "O instead of 0" issue (e.g., UTIBOOO -> UTIB000)
          let cleanIfsc = rawIfsc.trim().toUpperCase();
          if (cleanIfsc.includes("OOO")) {
             cleanIfsc = cleanIfsc.replace(/OOO/g, "000");
          }

          const cleanAcc = rawAcc.trim().replace(/\s/g, '');
          
          let tier1Pass = true;
          const issues: string[] = [];

          if (rawIfsc !== cleanIfsc) issues.push(`Corrected IFSC (Fixed 'O' to '0').`);
          if (rawAcc !== cleanAcc) issues.push("Spaces removed from Account.");

          if (!IFSC_REGEX.test(cleanIfsc)) {
            tier1Pass = false;
            issues.push("Invalid IFSC Format (Check length & 5th char '0').");
          }

          if (cleanIfsc) ifscsToCheck.push(cleanIfsc);

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
            issues,
            selected: tier1Pass,
            segment: rowSegment
          });
        }

        // Tier 2: Bulk Offline Validation
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
                  row.selected = false;
                } else {
                  row.tier2Pass = true;
                  row.bankName = res.bankName || `Bank Code: ${res.bankCode}`;
                }
                if (!res.isKnownBank) row.issues.push(`Bank code '${res.bankCode}' not active in current RBI Registry.`);
              }
            }
          }
        }

        setData(parsedRows);

        // Tier 3: Auto-Verify Throttled
        const pendingRows = parsedRows.filter(r => r.tier1Pass && r.tier2Pass && !r.apiChecked);
        for (const row of pendingRows) {
          await handleApiVerify(row.index, parsedRows); 
          await new Promise(resolve => setTimeout(resolve, 150));
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
            tier1Pass: false,
            selected: false,
            issues: [...r.issues, "Razorpay API Rejected: Invalid IFSC"] 
          } : r
        ));
      }
    } catch (err) {
      setData(prev => prev.map(r => r.index === index ? { ...r, apiStatus: "fail" } : r));
    }
  };

  const handleToggleSelect = (index: number) => {
    setData(prev => prev.map(r => r.index === index ? { ...r, selected: !r.selected } : r));
  };

  const handleExport = (bankType: "AXIS" | "OTHER") => {
    const selectedRows = data.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert("No staff members selected for export.");
      return;
    }

    const filtered = selectedRows.filter(r => {
      const isAxis = (r.bankName || "").toUpperCase().includes("AXIS");
      return bankType === "AXIS" ? isAxis : !isAxis;
    });

    if (filtered.length === 0) {
      alert(`No ${bankType} records found in selection.`);
      return;
    }

    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    
    // Standard Bank Template for Bulk Payout
    const exportData = filtered.map(r => ({
      "Beneficiary Name": r.name,
      "Account Number": r.accountNo,
      "IFSC Code": r.cleanIfsc,
      "Amount": r.netSalary,
      "Bank Name": r.bankName,
      "Branch": r.branchName || "N/A",
      "Segment": r.segment || "GENERAL",
      "Payment Mode": bankType === "AXIS" ? "TFR" : "NEFT",
      "Remarks": `${r.segment || "Salary"} ${monthName} ${year}`
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payouts");
    XLSX.writeFile(wb, `Payroll_Export_${monthName}_${year}.xlsx`);
    
    // Mark as exported
    const ids = filtered.map(r => r.index);
    setData(prev => prev.map(r => ids.includes(r.index) ? { ...r, isExported: true } : r));
  };

  const handleUpdateRow = (index: number, updates: Partial<ParsedRow>) => {
    setData(prev => prev.map(r => {
      if (r.index === index) {
        const updatedRow = { ...r, ...updates };
        
        // AUTO-CALCULATION: (Actual Salary / Total Days) * Worked Days
        if (updates.actualSalary !== undefined || updates.workedDays !== undefined || updates.totalDays !== undefined) {
          const actual = updatedRow.actualSalary || 0;
          const worked = updatedRow.workedDays || 0;
          const total = updatedRow.totalDays || 30;
          updatedRow.netSalary = Math.round((actual / (total || 30)) * worked);
        }

        if (updates.cleanIfsc !== undefined) {
          updatedRow.tier1Pass = IFSC_REGEX.test(updates.cleanIfsc);
        }

        return updatedRow;
      }
      return r;
    }));
  };

  const handleFinalizeToERP = async () => {
    const selectedRows = data.filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert("No staff members selected for processing.");
      return;
    }

    if (!confirm(`Are you sure you want to process salary for ${selectedRows.length} staff members for April 2026? This will update the database.`)) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const payload = selectedRows.map(r => ({
        name: r.name,
        accountNo: r.accountNo,
        ifsc: r.cleanIfsc,
        bankName: r.bankName,
        branchName: r.branchName,
        segment: r.segment,
        actualSalary: r.actualSalary,
        totalDays: r.totalDays,
        workedDays: r.workedDays,
        netSalary: r.netSalary
      }));

      // Assuming April 2026 for now as requested
      const result = await processBulkSalaryImportAction(4, 2026, payload);

      if (result.success) {
        alert(`Successfully processed ${result.data.successCount} salary records. ${result.data.failCount} failed (see logs).`);
        if (result.data.logs.length > 0) {
          console.log("Bulk Import Logs:", result.data.logs);
        }
        
        // Also trigger the downloads automatically as per "Standard flow"
        handleExport("AXIS");
        handleExport("OTHER");
      } else {
        alert("ERP Synchronization Failed: " + result.error);
      }
    } catch (err) {
      alert("System Error during ERP sync.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- ANALYTICS ENGINE: SORTING & FILTERING ---
  const filteredAndSortedData = React.useMemo(() => {
    let result = [...data];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.accountNo.includes(q) || 
        r.cleanIfsc.toLowerCase().includes(q)
      );
    }

    // Segment Filter
    if (filterSegment !== "ALL") {
      result = result.filter(r => r.segment === filterSegment);
    }

    // Status Filter
    if (filterStatus === "CRITICAL") {
      result = result.filter(r => !r.tier1Pass || r.apiStatus === "fail");
    } else if (filterStatus === "VERIFIED") {
      result = result.filter(r => r.apiStatus === "success");
    }

    // STABLE SORTING LOGIC
    // We only re-calculate the sort order if we are NOT editing
    if (sortField && editingIndex === null) {
      result.sort((a, b) => {
        const valA = a[sortField as keyof ParsedRow];
        const valB = b[sortField as keyof ParsedRow];
        
        if (typeof valA === "string" && typeof valB === "string") {
          return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return sortOrder === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
        }
        return 0;
      });
      // Store this order
      lastOrderRef.current = result.map(r => r.index);
    } else if (lastOrderRef.current.length > 0) {
      // If we ARE editing, or no sort field, apply the last known order to keep things stable
      const order = lastOrderRef.current;
      result.sort((a, b) => {
        const idxA = order.indexOf(a.index);
        const idxB = order.indexOf(b.index);
        // If row is new (not in order ref), put it at the end
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return result;
  }, [data, searchQuery, filterSegment, filterStatus, sortField, sortOrder, editingIndex]);

  const handleSort = (field: keyof ParsedRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const totalPayable = data.reduce((sum, r) => sum + r.netSalary, 0);
  const totalPaid = data.filter(r => r.isPaid).reduce((sum, r) => sum + r.netSalary, 0);
  const totalPending = totalPayable - totalPaid;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600" />
          
          <div className="flex flex-col items-center text-center mb-10">
             <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-3xl flex items-center justify-center shadow-inner mb-6">
                <ShieldCheck className="w-10 h-10" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Secure Lab</h2>
             <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Authentication Required</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
             <div className="relative group">
                <ShieldCheck className={cn("absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", authError ? "text-rose-500" : "text-slate-300 group-focus-within:text-blue-600")} />
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter Access Key..."
                  className={cn(
                    "w-full bg-slate-50 border-2 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold outline-none transition-all",
                    authError ? "border-rose-200 bg-rose-50 text-rose-600 animate-shake" : "border-slate-50 focus:border-blue-500/20 focus:bg-white"
                  )}
                  autoFocus
                />
             </div>
             
             <button 
               type="submit" 
               className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all"
             >
                Verify Identity
             </button>
          </form>

          {authError && (
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-rose-500 text-[9px] font-black uppercase text-center mt-6 tracking-widest"
            >
               Access Denied • Invalid Security Key
            </motion.p>
          )}

          <p className="text-slate-300 text-[8px] font-black uppercase text-center mt-10 tracking-[0.3em]">
             PaVa-EDUX Global Security Standard
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col bg-slate-50/50 transition-all duration-500 font-sans",
      isFullscreen ? "fixed inset-0 z-[100] p-10 h-screen overflow-y-auto bg-slate-50" : "h-full p-6"
    )}>
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            
            {/* Top Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                    isFullscreen ? "bg-slate-900 text-white shadow-xl rotate-180" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  )}
                  title={isFullscreen ? "Exit Zen Mode" : "Expand Workspace (Zen Mode)"}
                >
                   {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
                </button>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Bulk Payout Audit Lab
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest italic font-black">Pro</span>
                  </h1>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5 flex items-center gap-2">
                    <Server className="w-3 h-3 text-emerald-500" />
                    RBI Registry Status: <span className="text-emerald-600">Active</span>
                    <span className="opacity-20">|</span>
                    <Wifi className="w-3 h-3 text-blue-500" />
                    Live Verification Throttling: <span className="text-blue-600 italic">Optimized</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-wrap">
                {data.length > 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                      <button onClick={() => setViewMode("TABLE")} className={cn("p-2 rounded-lg transition-all", viewMode === "TABLE" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}><List className="w-4 h-4" /></button>
                      <button onClick={() => setViewMode("CARDS")} className={cn("p-2 rounded-lg transition-all", viewMode === "CARDS" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}><LayoutGrid className="w-4 h-4" /></button>
                      <button onClick={() => setViewMode("HISTORY")} className={cn("p-2 rounded-lg transition-all", viewMode === "HISTORY" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600")}><History className="w-4 h-4" /></button>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                    <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/20 hover:scale-105 transition-all"
                    >
                      <Upload className="w-3 h-3" />
                      New Audit
                    </button>
                    <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                    <button onClick={() => handleExport("AXIS")} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-slate-50 transition-all border border-slate-200"><Download className="w-3 h-3 text-blue-600" />Axis</button>
                    <button onClick={() => handleExport("OTHERS")} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-xl font-black text-[10px] uppercase shadow-sm hover:bg-slate-50 transition-all border border-slate-200"><Download className="w-3 h-3 text-emerald-600" />Non-Axis</button>
                    <button 
                      onClick={handleFinalizeToERP}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      Submit to DB
                    </button>
                  </div>
                )}
                {data.length === 0 && (
                   <div className="flex items-center gap-2">
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-slate-900/20 hover:scale-105 transition-all">
                        <Upload className="w-3 h-3" />
                        New Audit
                     </button>
                     <button onClick={() => setViewMode("HISTORY")} className={cn("flex items-center gap-2 px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm border", viewMode === "HISTORY" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")}>
                        <History className="w-3 h-3" />
                        View History
                     </button>
                   </div>
                )}
              </div>
            </div>

            {/* FINANCIAL SUMMARY BAR */}
            {data.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                 <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-blue-500/5 rounded-full group-hover:scale-150 transition-all duration-700" />
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Payable</p>
                       <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{totalPayable.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                       <IndianRupee className="w-6 h-6" />
                    </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-[2rem] border border-emerald-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-all duration-700" />
                    <div>
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1">Total Paid</p>
                       <p className="text-2xl font-black text-emerald-600 tracking-tighter">₹{totalPaid.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                       <ShieldCheck className="w-6 h-6" />
                    </div>
                 </div>

                 <div className="bg-white p-6 rounded-[2rem] border border-rose-100 shadow-sm flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute right-[-10%] top-[-20%] w-32 h-32 bg-rose-500/5 rounded-full group-hover:scale-150 transition-all duration-700" />
                    <div>
                       <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Total Pending</p>
                       <p className="text-2xl font-black text-rose-600 tracking-tighter">₹{totalPending.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                       <History className="w-6 h-6" />
                    </div>
                 </div>
              </motion.div>
            )}

            {/* Global Search & Filters */}
            {data.length > 0 && viewMode !== "HISTORY" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm"
              >
                <div className="flex-1 relative group w-full">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                   <input 
                     type="text" 
                     placeholder="Search by Name, Account, or IFSC..." 
                     className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-slate-300 transition-all"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                   <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase mr-1">Group:</span>
                      {["ALL", "RCB", "SNB", "MNB"].map(seg => (
                        <button 
                          key={seg} 
                          onClick={() => setFilterSegment(seg)}
                          className={cn("px-3 py-1 rounded-lg text-[9px] font-black transition-all", filterSegment === seg ? "bg-white text-blue-600 shadow-sm border border-blue-100" : "text-slate-400 hover:text-slate-600")}
                        >
                          {seg}
                        </button>
                      ))}
                   </div>
                   
                   <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase mr-1">Status:</span>
                      {["ALL", "CRITICAL", "VERIFIED"].map(st => (
                        <button 
                          key={st} 
                          onClick={() => setFilterStatus(st)}
                          className={cn("px-3 py-1 rounded-lg text-[9px] font-black transition-all", filterStatus === st ? "bg-white text-blue-600 shadow-sm border border-blue-100" : "text-slate-400 hover:text-slate-600")}
                        >
                          {st}
                        </button>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {/* Stats Summary */}
            <AnimatePresence>
              {data.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  {[
                    { label: "Audit Records", value: data.length, icon: FileSpreadsheet, color: "text-slate-600" },
                    { label: "Integrity Pass", value: data.filter(r => r.apiStatus === "success").length, icon: CheckCircle2, color: "text-emerald-600" },
                    { label: "Critical Fails", value: data.filter(r => !r.tier1Pass || r.apiStatus === "fail").length, icon: AlertCircle, color: "text-rose-600" },
                    { label: "Warnings", value: data.filter(r => r.issues.length > 0 && r.tier1Pass && r.apiStatus !== "fail").length, icon: Wifi, color: "text-amber-600" }
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center bg-slate-50", stat.color.replace('text-', 'bg-').replace('600', '50'))}>
                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                        <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Zone */}
            {!data.length ? (
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full h-[400px] border-2 border-dashed rounded-[3rem] p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                  isDragging ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50",
                  isParsing && "opacity-50 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && processFile(e.target.files[0])} />
                {isParsing ? <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" /> : (
                  <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <UploadCloud className="w-12 h-12" />
                  </div>
                )}
                <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Drop April 2026 Salary Sheet</h3>
                <p className="text-slate-500 font-medium max-w-sm">System will auto-parse, sanitize invisible spaces, and verify IFSC codes via live RBI registry.</p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                      Audit Snapshot: {filteredAndSortedData.length} of {data.length} Records
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if(confirm("HARD RESET: This will delete all current audit data and return to upload screen. Proceed?")) {
                          setData([]); setFile(null); setEditingIndex(null);
                        }
                      }} 
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Secret Hard Reset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-slate-100 mx-1" />
                    <button onClick={() => { setData([]); setFile(null); }} className="text-[10px] font-black text-slate-400 hover:text-rose-600 transition-all uppercase tracking-widest px-4 py-2 hover:bg-rose-50 rounded-xl">Discard Batch</button>
                  </div>
                </div>

                {viewMode === "TABLE" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black border-b border-slate-100">
                          <th className="p-6 w-16">
                             <button 
                               onClick={() => {
                                 const allSelected = filteredAndSortedData.every(r => r.selected || !r.tier1Pass);
                                 const targetIds = filteredAndSortedData.map(r => r.index);
                                 setData(prev => prev.map(r => targetIds.includes(r.index) ? { ...r, selected: !allSelected && r.tier1Pass } : r));
                               }}
                               className="w-5 h-5 border-2 border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center"
                             >
                               {filteredAndSortedData.length > 0 && filteredAndSortedData.every(r => r.selected || !r.tier1Pass) && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                             </button>
                          </th>
                          <th className="p-6 w-12 text-center">S.No</th>
                          <th className="p-6 w-24 cursor-pointer hover:text-slate-900" onClick={() => handleSort("segment")}>
                            <div className="flex items-center gap-1">Group {sortField === "segment" && <SortAsc className="w-2 h-2" />}</div>
                          </th>
                          <th className="p-6 min-w-[200px] cursor-pointer hover:text-slate-900" onClick={() => handleSort("name")}>
                            <div className="flex items-center gap-1">Staff Details {sortField === "name" && <SortAsc className="w-2 h-2" />}</div>
                          </th>
                          <th className="p-6">Account & IFSC</th>
                          <th className="p-6">Status</th>
                          <th className="p-6 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("workedDays")}>
                            <div className="flex items-center justify-end gap-1">Attendance {sortField === "workedDays" && <SortAsc className="w-2 h-2" />}</div>
                          </th>
                          <th className="p-6 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort("actualSalary")}>
                            <div className="flex items-center justify-end gap-1">Actual Salary {sortField === "actualSalary" && <SortAsc className="w-2 h-2" />}</div>
                          </th>
                          <th className="p-6 text-right pr-10 cursor-pointer hover:text-slate-900" onClick={() => handleSort("netSalary")}>
                            <div className="flex items-center justify-end gap-1">Net Payable {sortField === "netSalary" && <SortAsc className="w-2 h-2" />}</div>
                          </th>
                          <th className="p-6 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredAndSortedData.map((row) => {
                          const isCritical = !row.tier1Pass || row.apiStatus === "fail";
                          const isEditing = editingIndex === row.index;
                          return (
                            <tr key={row.index} className={cn("transition-all duration-200", isCritical ? "bg-rose-50/30" : "hover:bg-slate-50/50", isEditing && "bg-blue-50/50")}>
                              <td className="p-6">
                                 <button 
                                   onClick={() => !isCritical && handleToggleSelect(row.index)}
                                   disabled={isCritical}
                                   className={cn(
                                     "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                                     row.selected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-transparent"
                                   )}
                                 >
                                   <CheckCircle2 className="w-4 h-4" />
                                 </button>
                              </td>
                              <td className="p-6 text-center text-[10px] font-black text-slate-400">
                                 {data.indexOf(row) + 1}
                              </td>
                              <td className="p-6">
                                 {isEditing ? (
                                   <select 
                                     value={row.segment} 
                                     onChange={(e) => handleUpdateRow(row.index, { segment: e.target.value })}
                                     className="text-[9px] font-black px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                   >
                                     <option value="RCB">RCB</option>
                                     <option value="SNB">SNB</option>
                                     <option value="MNB">MNB</option>
                                     <option value="GENERAL">GENERAL</option>
                                   </select>
                                 ) : (
                                   <span className={cn(
                                     "text-[9px] font-black px-3 py-1.5 rounded-xl border flex items-center justify-center w-fit min-w-[60px]",
                                     row.segment === "RCB" ? "bg-purple-50 border-purple-100 text-purple-600" :
                                     row.segment === "SNB" ? "bg-orange-50 border-orange-100 text-orange-600" :
                                     row.segment === "MNB" ? "bg-blue-50 border-blue-100 text-blue-600" :
                                     "bg-slate-50 border-slate-100 text-slate-400"
                                   )}>
                                     {row.segment}
                                   </span>
                                 )}
                              </td>
                              <td className="p-6">
                                {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={row.name} 
                                    onChange={(e) => handleUpdateRow(row.index, { name: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                  />
                                ) : (
                                  <>
                                    <div className="font-black text-slate-800 text-sm mb-1">{row.name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <button 
                                        onClick={() => handleUpdateRow(row.index, { isPaid: !row.isPaid })}
                                        className={cn(
                                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                                          row.isPaid ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                        )}
                                      >
                                        {row.isPaid ? "Paid" : "Pending"}
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                       {row.issues.map((issue, idx) => (
                                         <span key={idx} className={cn(
                                           "text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1",
                                           issue.includes("Rejected") || issue.includes("Format") || issue.includes("Failed") 
                                             ? "bg-rose-50 border-rose-100 text-rose-600" 
                                             : "bg-amber-50 border-amber-100 text-amber-600"
                                         )}>
                                           {issue.includes("Rejected") ? <AlertCircle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                                           {issue}
                                         </span>
                                       ))}
                                       {row.apiStatus === "success" && row.issues.length === 0 && (
                                         <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[9px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1">
                                           <CheckCircle2 className="w-3 h-3" />
                                           INTEGRITY SECURED
                                         </span>
                                       )}
                                    </div>
                                  </>
                                )}
                              </td>
                              <td className="p-6">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <input 
                                      type="text" 
                                      value={row.accountNo} 
                                      onChange={(e) => handleUpdateRow(row.index, { accountNo: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                      placeholder="Account No"
                                    />
                                    <input 
                                      type="text" 
                                      value={row.cleanIfsc} 
                                      onChange={(e) => handleUpdateRow(row.index, { cleanIfsc: e.target.value.toUpperCase() })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                      placeholder="IFSC Code"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="font-black text-slate-700 font-mono tracking-widest text-xs bg-slate-100/50 px-2 py-1 rounded-lg border border-slate-200 inline-block w-fit">
                                      {row.accountNo}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={cn("font-black font-mono tracking-widest text-sm", isCritical ? "text-rose-600" : "text-emerald-600")}>
                                        {row.cleanIfsc}
                                      </span>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-tight">{row.bankName}</span>
                                        {row.branchName && (
                                          <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                                            <ArrowRight className="w-2 h-2" />
                                            {row.branchName}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="p-6">
                                 {row.isExported ? (
                                   <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl w-fit border border-blue-100 animate-in zoom-in duration-300">
                                     <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Sheet Generated</span>
                                   </div>
                                 ) : (
                                   <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-3 py-1.5">
                                     Pending Export
                                   </div>
                                 )}
                              </td>
                              <td className="p-6 text-right">
                                 {isEditing ? (
                                   <input 
                                     type="number" 
                                     value={row.workedDays} 
                                     onChange={(e) => handleUpdateRow(row.index, { workedDays: Number(e.target.value) })}
                                     className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                   />
                                 ) : (
                                   <div className="text-right">
                                     <span className="text-sm font-black text-slate-900 tracking-tight">{row.workedDays} / {row.totalDays}</span>
                                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Days Present</p>
                                   </div>
                                 )}
                              </td>
                              <td className="p-6 text-right">
                                 {isEditing ? (
                                   <input 
                                     type="number" 
                                     value={row.actualSalary} 
                                     onChange={(e) => handleUpdateRow(row.index, { actualSalary: Number(e.target.value) })}
                                     className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-right text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                   />
                                 ) : (
                                   <div className="text-right">
                                     <span className="text-sm font-black text-slate-900 tracking-tight">₹{row.actualSalary.toLocaleString('en-IN')}</span>
                                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gross Base</p>
                                   </div>
                                 )}
                              </td>
                              <td className="p-6 text-right pr-10 relative">
                                 <div className="flex flex-col items-end">
                                    <span className={cn(
                                      "text-sm font-black tracking-tighter transition-all",
                                      isEditing ? "text-blue-600 scale-110" : "text-slate-900"
                                    )}>
                                      ₹{row.netSalary.toLocaleString('en-IN')}
                                    </span>
                                    {!isEditing && (
                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                         {row.actualSalary - row.netSalary > 0 ? `${row.totalDays - row.workedDays} LWP Deduction` : "Full Payout"}
                                      </p>
                                    )}
                                 </div>
                              </td>
                              <td className="p-6 text-center">
                                 {isEditing ? (
                                   <button 
                                     onClick={() => {
                                       setEditingIndex(null);
                                       handleApiVerify(row.index);
                                     }} 
                                     className="p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:scale-110 transition-transform"
                                   >
                                     <Save className="w-4 h-4" />
                                   </button>
                                 ) : (
                                   <button 
                                     onClick={() => setEditingIndex(row.index)} 
                                     className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                   >
                                     <Edit3 className="w-4 h-4" />
                                   </button>
                                 )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedData.map((row) => {
                      const isCritical = !row.tier1Pass || row.apiStatus === "fail";
                      return (
                        <motion.div 
                          layout
                          key={row.index} 
                          className={cn(
                            "p-6 rounded-[2rem] border transition-all relative group",
                            isCritical ? "bg-rose-50/50 border-rose-100" : "bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1"
                          )}
                        >
                          <div className="flex items-center justify-between mb-4">
                             <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">#{data.indexOf(row) + 1} • {row.segment}</span>
                             <button 
                               onClick={() => !isCritical && handleToggleSelect(row.index)}
                               disabled={isCritical}
                               className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all", row.selected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-transparent")}
                             >
                               <CheckCircle2 className="w-4 h-4" />
                             </button>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-black text-slate-900 leading-tight">{row.name}</h4>
                              <div className="flex items-center gap-2 mt-2">
                                <button 
                                  onClick={() => handleUpdateRow(row.index, { isPaid: !row.isPaid })}
                                  className={cn(
                                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                                    row.isPaid ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                  )}
                                >
                                  {row.isPaid ? "Paid" : "Pending"}
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Net Payable</p>
                                <p className={cn("text-lg font-black tracking-tighter", isCritical ? "text-slate-300 line-through" : "text-slate-900")}>
                                   ₹{row.netSalary.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Attendance</p>
                                <p className="text-sm font-black text-slate-700">{row.workedDays} / {row.totalDays}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}


        {viewMode === "HISTORY" && data.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <div>
                  <h3 className="font-black text-slate-900 text-lg tracking-tight">Audit Session History</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 italic">Last 100 Independent Payout Records</p>
               </div>
               <button onClick={() => setViewMode("TABLE")} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-slate-900/20 hover:scale-105 transition-all">Back to Lab</button>
            </div>
            
            <div className="p-8 space-y-4">
               {(() => {
                 const groups: Record<string, any[]> = {};
                 history.forEach(r => {
                   const time = new Date(r.processedAt);
                   const sessionKey = `${time.toLocaleDateString()} ${time.getHours()}:${time.getMinutes()}:${Math.floor(time.getSeconds()/30)}`;
                   if (!groups[sessionKey]) groups[sessionKey] = [];
                   groups[sessionKey].push(r);
                 });

                 const sessionEntries = Object.entries(groups);
                 if (sessionEntries.length === 0) {
                   return (
                     <div className="flex flex-col items-center gap-4 py-20">
                        <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                           <History className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No historical records found</p>
                     </div>
                   );
                 }

                 return sessionEntries.map(([key, sessionRecords], idx) => (
                   <div key={idx} className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/30">
                      <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                               <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Audit Session</p>
                               <p className="text-sm font-black text-slate-900">{new Date(sessionRecords[0].processedAt).toLocaleString('en-IN')}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Staff Count</p>
                               <p className="text-sm font-black text-blue-600">{sessionRecords.length} Records</p>
                            </div>
                            <button 
                              onClick={() => {
                                const restoredData: ParsedRow[] = sessionRecords.map((r, index) => ({
                                  index: index + 1,
                                  name: r.staffName,
                                  accountNo: r.accountNumber,
                                  rawIfsc: r.ifscCode,
                                  cleanIfsc: r.ifscCode,
                                  actualSalary: Number(r.actualSalary),
                                  totalDays: r.totalDays,
                                  workedDays: r.presentDays,
                                  netSalary: Number(r.netSalary),
                                  bankName: r.bankName,
                                  branchName: r.branchName,
                                  segment: r.segment,
                                  tier1Pass: true,
                                  tier2Pass: true,
                                  apiChecked: true,
                                  apiStatus: "success",
                                  issues: [],
                                  selected: true
                                }));
                                setData(restoredData);
                                setViewMode("TABLE");
                              }}
                              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/20 hover:scale-105 transition-all"
                            >
                               Restore Session
                            </button>
                         </div>
                      </div>
                      <div className="p-4 max-h-[250px] overflow-y-auto">
                         <table className="w-full text-left">
                            <tbody className="divide-y divide-slate-100">
                               {sessionRecords.map((r, i) => (
                                 <tr key={i} className="text-[10px]">
                                    <td className="py-2 px-4 font-black text-slate-700">{r.staffName}</td>
                                    <td className="py-2 px-4 font-mono text-slate-400 italic">{r.accountNumber}</td>
                                    <td className="py-2 px-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">{r.segment}</span></td>
                                    <td className="py-2 px-4 text-right font-black text-slate-900">₹{Number(r.netSalary).toLocaleString('en-IN')}</td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   </div>
                 ));
               })()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
