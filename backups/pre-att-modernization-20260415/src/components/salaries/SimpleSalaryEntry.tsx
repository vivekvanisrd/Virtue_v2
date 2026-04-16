"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2, Save, Download, CheckCircle2, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { 
  generatePayrollDraftAction, 
  savePayrollDraftAction, 
  finalizePayrollAction, 
  exportBankCSVAction,
  syncPayrollStaffAction 
} from "@/lib/actions/payroll-actions";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleSalaryEntryProps {
  branchId: string;
}

export function SimpleSalaryEntry({ branchId }: SimpleSalaryEntryProps) {
  const router = useRouter();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalMonthDays, setTotalMonthDays] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [status, setStatus] = useState<{text: string, type: "success" | "error"} | null>(null);
  
  const [activeRun, setActiveRun] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  // 1. Initial Load for the current month
  useEffect(() => {
    handleLoadSheet();
  }, [month, year]);

  const handleLoadSheet = async () => {
    setIsLoading(true);
    try {
      const res = await generatePayrollDraftAction(month, year, totalMonthDays, branchId);
      if (res.success && res.data) {
        setActiveRun(res.data);
        const newSlips = res.data.slips || [];
        setSlips(newSlips);
        // Default select all
        setSelectedIds(new Set(newSlips.map((s: any) => s.id)));
      }
    } catch (err) {
      console.error("Failed to load sheet.");
    } finally {
      setIsLoading(false);
    }
  };

  const showMsg = (text: string, type: "success" | "error") => {
    setStatus({text, type});
    setTimeout(() => setStatus(null), 5000);
  };

  const handleSync = async () => {
    if (!activeRun) return;
    setIsSyncing(true);
    const res = await syncPayrollStaffAction(activeRun.id);
    if (res.success) {
      if (res.count && res.count > 0) {
        showMsg(`Synced! ${res.count} new staff members added to the sheet.`, "success");
      } else {
        showMsg("Sheet is already up to date.", "success");
      }
      handleLoadSheet(); // Refresh the list
    } else {
      showMsg("Sync failed: " + (res as any).error, "error");
    }
    setIsSyncing(false);
  };

  // 2. The Simplified Math Engine (ID-based focus for sorting compatibility)
  const updateDays = (id: string, days: string) => {
    const val = parseFloat(days);
    const attended = isNaN(val) ? 0 : Math.min(totalMonthDays, Math.max(0, val));

    setSlips(prev => prev.map(slip => {
      if (slip.id !== id) return slip;

      const row = { ...slip };
      row.attendedDays = attended;
      row.lwpDays = Math.max(0, totalMonthDays - attended);
      row.payableDays = attended;

      // Proration
      const dailyRate = (Number(row.snapshot.basic) + Number(row.snapshot.hra) + Number(row.snapshot.da) + Number(row.snapshot.specialAllowance)) / totalMonthDays;
      row.grossSalary = Math.round(dailyRate * attended);
      
      const tds = row.deductions?.tdsAmount || 0;
      const loan = row.deductions?.advanceRecovery || 0;
      const misc = row.deductions?.customManual || 0;

      row.netSalary = Math.round(row.grossSalary - tds - loan - misc);
      return row;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await savePayrollDraftAction(activeRun.id, slips);
    if (res.success) {
      showMsg("Salary sheet saved successfully.", "success");
      handleLoadSheet(); // Refresh state
    } else {
      showMsg("Error saving sheet: " + (res as any).error, "error");
    }
    setIsSaving(false);
  };

  const handleFinalize = async () => {
    if(!confirm("Are you ready to finalize? This will lock the salaries for your bank upload.")) return;
    setIsSaving(true);
    const res = await finalizePayrollAction(activeRun.id);
    if (res.success) {
      showMsg("Salaries locked! You can now download the bank files.", "success");
      handleLoadSheet();
    } else {
      showMsg(res.error, "error");
    }
    setIsSaving(false);
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === slips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(slips.map(s => s.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBatchExport = async () => {
    setIsExporting(true);
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      showMsg("Please select at least one staff member.", "error");
      setIsExporting(false);
      return;
    }

    // 1. Internal
    await handleExport("AXIS_INTERNAL", ids);
    // 2. External
    setTimeout(() => handleExport("AXIS_EXTERNAL", ids), 1000);
    
    setIsExporting(false);
  };

  const handleExport = async (format: "AXIS_INTERNAL" | "AXIS_EXTERNAL", ids?: string[]) => {
    const res = await exportBankCSVAction(activeRun.id, format, ids);
    if (res.success && res.csvData) {
      const blob = new Blob([res.csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${format}_${month}_${year}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      showMsg((res as any).error || "Export failed.", "error");
    }
  };

  const filteredAndSortedSlips = useMemo(() => {
    let result = [...slips];

    // 1. Filter Logic
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.staff?.firstName?.toLowerCase().includes(lowSearch) || 
        s.staff?.lastName?.toLowerCase().includes(lowSearch) || 
        s.staff?.staffCode?.toLowerCase().includes(lowSearch)
      );
    }

    // 2. Sort Logic
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any = 0;
        let bVal: any = 0;

        if (sortConfig.key === 'name') {
          aVal = `${a.staff?.firstName} ${a.staff?.lastName}`.toLowerCase();
          bVal = `${b.staff?.firstName} ${b.staff?.lastName}`.toLowerCase();
        } else if (sortConfig.key === 'netSalary') {
          aVal = a.netSalary;
          bVal = b.netSalary;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [slips, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex flex-col gap-6 p-4 max-w-6xl mx-auto">
      {/* HEADER: Control Center */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Easy Salary Entry</h1>
          <p className="text-slate-500 font-medium">Enter "Days Present" to generate your bank file.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
              <select className="bg-transparent text-sm font-bold px-3 py-2 outline-none" value={month} onChange={(e)=>setMonth(Number(e.target.value))}>
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
              <input type="number" className="w-20 bg-transparent text-sm font-bold text-center border-l border-slate-200 outline-none" value={year} onChange={(e)=>setYear(Number(e.target.value))} />
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase">Days in Month:</span>
              <input type="number" className="w-10 bg-transparent text-sm font-bold focus:text-blue-600 outline-none" value={totalMonthDays} onChange={(e)=>setTotalMonthDays(Number(e.target.value))} />
           </div>

           <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-blue-300 transition-colors">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff..." 
                className="bg-transparent text-sm font-bold outline-none w-32 placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>

           {activeRun ? (
             <div className="flex items-center gap-3">
               <button 
                 onClick={handleSync} 
                 disabled={isSyncing || activeRun.status !== "Draft"} 
                 title="Check for new staff members"
                 className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all disabled:opacity-30"
               >
                 <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
               </button>
               <button onClick={handleSave} disabled={isSaving || activeRun.status !== "Draft"} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2">
                 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 Save Sheet
               </button>
             </div>
           ) : (
             <button onClick={handleLoadSheet} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all">
               Start This Month
             </button>
           )}
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
           {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
           <span className="font-bold text-sm">{status.text}</span>
        </div>
      )}

      {/* THE GRID */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
             <Loader2 className="w-10 h-10 animate-spin" />
             <span className="font-bold">Loading your staff list...</span>
          </div>
        ) : slips.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
             <span className="font-bold underline decoration-slate-200 decoration-2">No staff records found for this period.</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6 w-12">
                   <input 
                     type="checkbox" 
                     className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                     checked={selectedIds.size === slips.length && slips.length > 0}
                     onChange={toggleSelectAll}
                   />
                </th>
                <th className="py-4 px-2 cursor-pointer hover:text-slate-900 group/h" onClick={() => requestSort('name')}>
                  <div className="flex items-center gap-1">
                    Staff Member
                    {sortConfig?.key === 'name' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/h:opacity-100 transition-opacity" />}
                  </div>
                </th>
                <th className="py-4 px-4 text-center">Full Month Pay</th>
                <th className="py-4 px-4 text-center bg-blue-50/50 text-blue-600">Days Present</th>
                <th className="py-4 px-6 text-right cursor-pointer hover:text-slate-900 group/h" onClick={() => requestSort('netSalary')}>
                   <div className="flex items-center justify-end gap-1">
                    Payment To Bank
                    {sortConfig?.key === 'netSalary' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/h:opacity-100 transition-opacity" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAndSortedSlips.map((row) => (
                <tr key={row.staffId} className={cn("hover:bg-slate-50/30 transition-colors group", !selectedIds.has(row.id) && "opacity-40 grayscale-[0.5]")}>
                   <td className="py-4 px-6 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td className="py-4 px-2">
                    <div className="font-bold text-slate-900 leading-none">{row.staff?.firstName} {row.staff?.lastName}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1">{row.staff?.staffCode || "No Code"}</div>
                  </td>
                  <td className="py-4 px-4 text-center text-sm font-semibold text-slate-500">
                    ₹{( (Number(row.snapshot?.basic) || 0) + (Number(row.snapshot?.hra) || 0) ).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-center bg-blue-50/20">
                    <input 
                      type="number" step="0.5"
                      disabled={activeRun.status !== "Draft"}
                      className="w-20 mx-auto text-center font-black text-lg text-blue-600 bg-white border border-slate-200 rounded-lg p-2 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                      value={row.attendedDays}
                      onChange={(e) => updateDays(row.id, e.target.value)}
                    />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-black text-slate-900 text-lg">₹{(Number(row.netSalary) || 0).toLocaleString()}</div>
                    {row.attendedDays < totalMonthDays && (
                      <div className="text-[10px] font-bold text-rose-500">Prorated for {row.attendedDays} days</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER: Bank Export */}
      {activeRun && (
        <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-800">
           <div className="flex items-center gap-3 text-white">
              <div className={`w-3 h-3 rounded-full animate-pulse ${activeRun.status === 'Approved' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="font-black text-sm uppercase tracking-wide">
                Status: {activeRun.status === 'Draft' ? 'Salary Sheet Open' : 'Salary Finalized & Locked'}
              </span>
           </div>

            <div className="flex items-center gap-3">
              {activeRun.status === "Draft" ? (
                <button onClick={handleFinalize} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95">
                  Confirm All & Lock
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleExport("AXIS_INTERNAL", Array.from(selectedIds))} 
                    disabled={isExporting}
                    className="bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    Axis-to-Axis
                  </button>
                  <button 
                    onClick={() => handleExport("AXIS_EXTERNAL", Array.from(selectedIds))} 
                    disabled={isExporting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg"
                  >
                    <Download className="w-4 h-4 text-blue-200" />
                    Non-Axis (IMPS)
                  </button>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
