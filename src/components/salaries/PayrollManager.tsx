"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2, Plus, Save, Lock, ArrowLeftCircle, CheckCircle2 } from "lucide-react";
import { generatePayrollDraftAction, savePayrollDraftAction, finalizePayrollAction, exportBankCSVAction } from "@/lib/actions/payroll-actions";
import { useRouter } from "next/navigation";

interface PayrollManagerProps {
  branchId: string;
}

export function PayrollManager({ branchId }: PayrollManagerProps) {
  const router = useRouter();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [totalWorkingDays, setTotalWorkingDays] = useState(30);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  
  const [activeRun, setActiveRun] = useState<any>(null);
  const [slips, setSlips] = useState<any[]>([]);

  const totals = useMemo(() => {
    return slips.reduce(
      (acc, slip) => {
        acc.gross += slip.grossSalary;
        acc.net += slip.netSalary;
        return acc;
      },
      { gross: 0, net: 0 }
    );
  }, [slips]);

  const showMsg = (text: string, type: "success" | "error") => {
     setStatusMessage({text, type});
     setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleGenerateDraft = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await generatePayrollDraftAction(month, year, totalWorkingDays, branchId);
      if (res.success) {
        showMsg(res.message || "Draft Generated Successfully!", "success");
        if (res.data?.slips) {
          setActiveRun(res.data);
          setSlips(res.data.slips);
        } else {
           router.refresh();
        }
      } else {
        showMsg(res.error, "error");
      }
    } catch (err) {
      showMsg("Failed to generate draft.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Math Function for Grid Updates
  const recalculateRow = (index: number, field: string, value: string) => {
    const updated = [...slips];
    const row = { ...updated[index] };
    
    // Update local state value safely
    const parsed = Number(value);
    (row as any)[field] = isNaN(parsed) ? 0 : Math.max(0, parsed);

    // 1. Math Engine: Attended Days vs Leave Logic
    if (field === "lwpDays") {
        row.attendedDays = Math.max(0, row.totalWorkingDays - row.lwpDays);
        row.payableDays = row.attendedDays;
    } else if (field === "attendedDays") {
        row.lwpDays = Math.max(0, row.totalWorkingDays - row.attendedDays);
        row.payableDays = row.attendedDays;
    } else if (field === "payableDays") {
        // Manual override of payable days (uncommon but allowed)
    }

    // Base math calculations (Daily Rate is components/totalDays)
    const totalMonthDays = row.totalWorkingDays || 30;
    const dailyBasic = (Number(row.snapshot.basicSalary) || 0) / totalMonthDays;
    const dailyHra = (Number(row.snapshot.hraAmount) || 0) / totalMonthDays;
    const dailyDa = (Number(row.snapshot.daAmount) || 0) / totalMonthDays;
    const dailySpecial = (Number(row.snapshot.specialAllowance) || 0) / totalMonthDays;
    
    // Total Gross = (Daily Rate * Payable Days)
    row.grossSalary = Math.round((dailyBasic + dailyHra + dailyDa + dailySpecial) * row.payableDays);
    
    // Deductions Layer
    const tds = row.deductions?.tdsAmount || 0;
    const loanRec = row.deductions?.advanceRecovery || 0;
    const manualDed = row.deductions?.customManual || 0;
    
    row.netSalary = Math.round(row.grossSalary - tds - loanRec - manualDed);

    updated[index] = row;
    setSlips(updated);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    // Fires secure update action hitting the Database + ActivityLog
    const res = await savePayrollDraftAction(activeRun.id, slips);
    if (res.success) showMsg("Draft securely saved.", "success");
    else showMsg("Error saving draft: " + (res as any).error, "error");
    setIsSaving(false);
  };

  const handleFinalize = async () => {
    if(!confirm("Are you absolutely sure you want to finalize? This locks all salaries and records them natively into your ledger!")) return;
    
    setIsSaving(true);
    const res = await finalizePayrollAction(activeRun.id);
    if (res.success) {
      showMsg("Payroll officially sealed and posted to Ledger!", "success");
      router.refresh(); // Or reload state
    } else {
      showMsg(res.error, "error");
    }
    setIsSaving(false);
  };

  const handleExportCSV = async (format: "GENERIC" | "AXIS_INTERNAL" | "AXIS_EXTERNAL") => {
    if (!activeRun) return;
    setIsExporting(true);
    try {
      const res = await exportBankCSVAction(activeRun.id, format);
      if (res.success && res.csvData) {
        const blob = new Blob([res.csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = format === "GENERIC" ? `PAYROLL_${month}_${year}.csv` : 
                        format === "AXIS_INTERNAL" ? `AXIS_INTERNAL_${month}_${year}.csv` : 
                        `AXIS_EXTERNAL_${month}_${year}.csv`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMsg(`${format} Export downloaded.`, "success");
      } else {
        showMsg((res as any).error || "Failed to export.", "error");
      }
    } catch (err) {
      showMsg("Critical export failure.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200">
      
      {/* HEADER SECTION */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payroll Engine</h2>
          <p className="text-sm text-slate-500 font-medium">Standard automated draft and dispatch workflow.</p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Parameters */}
           <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
             <select 
                className="bg-transparent border-none text-sm font-semibold outline-none py-1.5 px-3"
                value={month} onChange={(e) => setMonth(Number(e.target.value))}
             >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
             </select>
             <div className="h-4 w-px bg-slate-200 mx-1 border-r" />
             <input type="number" className="w-20 bg-transparent border-none text-sm font-semibold text-center outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))} />
           </div>

           <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="text-xs font-bold text-slate-400">Total Days:</span>
              <input type="number" className="w-12 border-none outline-none text-sm font-bold text-slate-700 bg-transparent" value={totalWorkingDays} onChange={(e)=>setTotalWorkingDays(Number(e.target.value))} />
           </div>
           
           {!activeRun && (
             <button onClick={handleGenerateDraft} disabled={isLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm">
               {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
               Run Draft
             </button>
           )}
        </div>
      </div>

      {/* GRID SECTION */}
      <div className="flex-1 overflow-auto bg-white p-6 relative">
         {!activeRun ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <p className="text-sm font-medium">Select a month and click "Run Draft" to load the Grid.</p>
            </div>
         ) : (
            <div className="w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 tracking-wider">
                    <th className="pb-3 pl-2">STAFF</th>
                    <th className="pb-3 px-4 text-center">ATTENDED</th>
                    <th className="pb-3 px-4 text-center">LWP</th>
                    <th className="pb-3 px-4 text-center">PAYABLE</th>
                    <th className="pb-3 px-4 text-right">ADVANCE</th>
                    <th className="pb-3 px-4 text-right">TDS/TAX</th>
                    <th className="pb-3 px-4 text-right">DEDUCT</th>
                    <th className="pb-3 pr-2 text-right">NET PAY</th>
                  </tr>
                </thead>
                <tbody className="text-sm border-b border-slate-100">
                  {slips.map((row, idx) => (
                    <tr key={row.staffId} className="border-t border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-2 max-w-[200px] truncate font-medium text-slate-700">
                         {row.staff?.firstName} {row.staff?.lastName}
                         <div className="text-xs text-slate-400">{row.staff?.staffCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" step="0.5"
                          className="w-full text-center bg-transparent outline-none font-bold text-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 border border-transparent hover:border-slate-200"
                          value={row.attendedDays}
                          onChange={(e) => recalculateRow(idx, "attendedDays", e.target.value)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input 
                          type="number" step="0.5"
                          className="w-full text-center bg-transparent outline-none font-semibold text-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-100 rounded px-2 py-1 border border-transparent hover:border-slate-200"
                          value={row.lwpDays}
                          onChange={(e) => recalculateRow(idx, "lwpDays", e.target.value)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full text-center font-black text-slate-900 bg-slate-50 py-1 rounded">
                          {row.payableDays}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                           <span className="text-slate-400 text-xs mr-1">₹</span>
                           <input 
                             type="number"
                             className="w-20 text-right bg-transparent outline-none font-semibold text-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-100 rounded px-2 py-1"
                             value={row.deductions?.advanceRecovery || 0}
                             onChange={(e) => {
                               const updated = [...slips];
                               updated[idx].deductions = { ...updated[idx].deductions, advanceRecovery: Number(e.target.value) };
                               setSlips(updated);
                               recalculateRow(idx, "dummy", "0"); 
                             }}
                           />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                           <span className="text-slate-400 text-xs mr-1">₹</span>
                           <input 
                             type="number"
                             className="w-20 text-right bg-transparent outline-none font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 rounded px-2 py-1"
                             value={row.deductions?.tdsAmount || 0}
                             onChange={(e) => {
                               const updated = [...slips];
                               updated[idx].deductions = { ...updated[idx].deductions, tdsAmount: Number(e.target.value) };
                               setSlips(updated);
                               recalculateRow(idx, "dummy", "0"); 
                             }}
                           />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                           <span className="text-slate-400 text-xs mr-1">₹</span>
                           <input 
                             type="number"
                             className="w-20 text-right bg-transparent outline-none font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-amber-100 rounded px-2 py-1"
                             value={row.deductions?.customManual || 0}
                             onChange={(e) => {
                               const updated = [...slips];
                               updated[idx].deductions = { ...updated[idx].deductions, customManual: Number(e.target.value) };
                               setSlips(updated);
                               recalculateRow(idx, "dummy", "0"); 
                             }}
                           />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-xs text-slate-400">G: ₹{row.grossSalary?.toLocaleString()}</div>
                      </td>
                      <td className="py-3 pr-2 text-right font-bold text-emerald-600 text-base">₹{row.netSalary?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Total Run Value:</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-700">₹{totals.gross.toLocaleString()}</td>
                    <td className="py-4 pr-2 text-right font-black text-emerald-600 text-lg">₹{totals.net.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
         )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex justify-between items-center">
         <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${activeRun?.status === "Approved" ? "text-emerald-500" : "text-slate-300"}`} />
            <span className="text-sm font-bold text-slate-500">
               Status: {activeRun ? activeRun.status : "No Active Run"}
            </span>
         </div>
         <div className="flex items-center gap-3">
           <button 
             onClick={handleSaveDraft}
             disabled={!activeRun || isSaving || activeRun.status !== "Draft"} 
             className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
           >
             {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-400" />}
             Save Draft
           </button>
           <button 
             onClick={handleFinalize}
             disabled={!activeRun || isSaving || activeRun.status !== "Draft"} 
             className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
           >
             <Lock className="w-4 h-4" />
             Lock & Disburse
           </button>
           {(activeRun?.status === "Approved" || activeRun?.status === "Paid") && (
             <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button 
                  onClick={() => handleExportCSV("AXIS_INTERNAL")}
                  disabled={isExporting} 
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded flex items-center gap-2 transition-all disabled:opacity-50"
                  title="Internal Axis to Axis"
                >
                  {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Axis IFT
                </button>
                <button 
                  onClick={() => handleExportCSV("AXIS_EXTERNAL")}
                  disabled={isExporting} 
                  className="bg-amber-600 border border-amber-500 hover:bg-amber-700 text-white font-bold text-xs px-3 py-2 rounded flex items-center gap-2 transition-all disabled:opacity-50"
                  title="Cross Bank NEFT/IMPS"
                >
                  <Save className="w-3 h-3" />
                  Axis NEFT/IMPS
                </button>
                <button 
                  onClick={() => handleExportCSV("GENERIC")}
                  disabled={isExporting} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded flex items-center gap-2 transition-all disabled:opacity-50 border border-slate-200"
                >
                  Generic
                </button>
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
