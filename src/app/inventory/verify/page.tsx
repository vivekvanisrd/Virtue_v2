"use client";

import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Equal,
  Sparkles,
  Save
} from "lucide-react";

type StockItem = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

type VerificationDraft = {
  item_id: string;
  physical_qty: number;
  reason: string;
  isDirty: boolean; // has user customized this physical count
};

export default function StockTakePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  
  // Draft of physical count entries
  const [draftCounts, setDraftCounts] = useState<Record<string, VerificationDraft>>({});

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchStock();
    }
  }, [academicYearId]);

  async function fetchMetadata() {
    setLoading(true);
    try {
      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        setAcademicYears(metaData.academicYears || []);
        const current = metaData.academicYears?.find((ay: any) => ay.isCurrent);
        if (current) setAcademicYearId(current.id);
        else if (metaData.academicYears?.length > 0) setAcademicYearId(metaData.academicYears[0].id);
      }
    } catch {
      setError("Failed to load catalog metadata.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStock() {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        const items = data.stock || [];
        setStockItems(items);
        
        // Initialize draft counts
        const drafts: Record<string, VerificationDraft> = {};
        items.forEach((itm: StockItem) => {
          drafts[itm.id] = {
            item_id: itm.id,
            physical_qty: itm.current_stock,
            reason: "",
            isDirty: false
          };
        });
        setDraftCounts(drafts);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load live stock items.");
    } finally {
      setLoading(false);
    }
  }

  function handlePhysicalQtyChange(itemId: string, val: string) {
    const qty = val === "" ? 0 : Number(val);
    setDraftCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        physical_qty: qty,
        isDirty: true
      }
    }));
  }

  function handleReasonChange(itemId: string, text: string) {
    setDraftCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason: text
      }
    }));
  }

  function resetDraft(itemId: string) {
    const originalItem = stockItems.find(i => i.id === itemId);
    if (!originalItem) return;
    setDraftCounts(prev => ({
      ...prev,
      [itemId]: {
        item_id: itemId,
        physical_qty: originalItem.current_stock,
        reason: "",
        isDirty: false
      }
    }));
  }

  // Identify items with discrepancies
  const itemsWithDiscrepancies = stockItems.filter(itm => {
    const draft = draftCounts[itm.id];
    return draft && draft.isDirty && draft.physical_qty !== itm.current_stock;
  });

  async function handleReconcileSubmit() {
    setError("");
    setSuccess("");

    if (itemsWithDiscrepancies.length === 0) {
      setError("No stock discrepancies found or adjusted to submit.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        academic_year_id: academicYearId,
        adjustment_date: new Date().toISOString().split("T")[0],
        items: itemsWithDiscrepancies.map(itm => {
          const draft = draftCounts[itm.id];
          return {
            item_id: itm.id,
            physical_qty: draft.physical_qty,
            reason: draft.reason.trim() || `Physical Audit Reconciliation Discrepancy (${draft.physical_qty > itm.current_stock ? "Add" : "Subtract"})`,
          };
        }),
      };

      const res = await fetch("/api/inventory/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to reconcile counts.");
      }

      setSuccess(`Successfully reconciled ${itemsWithDiscrepancies.length} item stock counts!`);
      // Refresh stock values from database
      fetchStock();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Client filtering
  const filteredItems = stockItems.filter(itm => {
    const matchesSearch =
      searchQuery === "" ||
      itm.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itm.item_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || itm.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  if (loading && stockItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Opening verification ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Physical Verification & Audit</h2>
          <p className="text-slate-500 text-xs mt-1">Conduct stocktake verification audits, identify shortages/overages, and reconcile system inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Year Context:</label>
          <select
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4DA8DA]"
            value={academicYearId}
            onChange={e => setAcademicYearId(e.target.value)}
          >
            {academicYears.map(ay => (
              <option key={ay.id} value={ay.id}>
                {ay.name} {ay.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Banner/Dashboard */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 rounded-3xl p-6 border border-slate-800 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#4DA8DA]">
            <ClipboardCheck className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Stocktake Audit Mode</span>
          </div>
          <h3 className="text-lg font-black tracking-tight">Post Inventory Reconciliation Adjustments</h3>
          <p className="text-slate-400 text-xs max-w-xl">
            Input physical counts. The system will automatically compare count with current stock balance and post adjustments (Add/Subtract) to correct counts.
          </p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={fetchStock}
            className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Sync System Quantities
          </button>
          <button
            onClick={handleReconcileSubmit}
            disabled={submitting || itemsWithDiscrepancies.length === 0}
            className="px-5 py-2.5 bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#4DA8DA]/10"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Reconcile counts ({itemsWithDiscrepancies.length})
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" /> {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all font-semibold"
            placeholder="Search by SKU name or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Category:</label>
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4DA8DA]"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {["Notebooks", "Textbooks", "Uniforms", "Shoes", "ID Cards", "Diaries", "Stationery"].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Verification Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-6 py-4">Product SKU</th>
                <th className="px-6 py-4">Item Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">System stock</th>
                <th className="px-6 py-4 w-32">Physical count</th>
                <th className="px-6 py-4">Discrepancy</th>
                <th className="px-6 py-4 w-72">Adjustment Reason / Notes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 font-semibold">
                    No items in catalog match search criteria
                  </td>
                </tr>
              ) : (
                filteredItems.map(itm => {
                  const draft = draftCounts[itm.id] || { physical_qty: itm.current_stock, reason: "", isDirty: false };
                  const discrepancy = draft.physical_qty - itm.current_stock;
                  
                  // Color highlights based on discrepancy
                  let discrepancyBadge = (
                    <span className="flex items-center gap-1 text-slate-400 font-bold">
                      <Equal className="w-3.5 h-3.5" /> Balanced
                    </span>
                  );
                  let rowBg = "hover:bg-slate-50/50";

                  if (discrepancy < 0) {
                    discrepancyBadge = (
                      <span className="flex items-center gap-0.5 text-rose-600 font-extrabold">
                        <ArrowDownRight className="w-4 h-4 shrink-0" /> {discrepancy} (Shortage)
                      </span>
                    );
                    rowBg = "bg-rose-50/15 hover:bg-rose-50/25";
                  } else if (discrepancy > 0) {
                    discrepancyBadge = (
                      <span className="flex items-center gap-0.5 text-emerald-600 font-extrabold">
                        <ArrowUpRight className="w-4 h-4 shrink-0" /> +{discrepancy} (Overage)
                      </span>
                    );
                    rowBg = "bg-emerald-50/15 hover:bg-emerald-50/25";
                  }

                  return (
                    <tr key={itm.id} className={`${rowBg} transition-colors`}>
                      {/* SKU */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                        {itm.item_code}
                      </td>
                      {/* Item Name */}
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {itm.item_name}
                      </td>
                      {/* Category */}
                      <td className="px-6 py-4 text-slate-500">
                        {itm.category}
                      </td>
                      {/* System Stock */}
                      <td className="px-6 py-4 text-slate-800 font-bold">
                        {itm.current_stock} {itm.unit}
                      </td>
                      {/* Physical Input */}
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-850"
                          value={draft.physical_qty}
                          min="0"
                          onChange={e => handlePhysicalQtyChange(itm.id, e.target.value)}
                        />
                      </td>
                      {/* Discrepancy indicator */}
                      <td className="px-6 py-4">
                        {discrepancyBadge}
                      </td>
                      {/* Reason */}
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium placeholder-slate-400"
                          placeholder="Why the difference? E.g., counting error..."
                          value={draft.reason}
                          disabled={discrepancy === 0}
                          onChange={e => handleReasonChange(itm.id, e.target.value)}
                        />
                      </td>
                      {/* Reset Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={!draft.isDirty}
                          onClick={() => resetDraft(itm.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-[#4DA8DA] disabled:opacity-30 transition-colors uppercase tracking-wider"
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredItems.length > 0 && (
          <div className="px-6 py-3.5 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200 flex items-center justify-between">
            <span>Showing {filteredItems.length} catalog items</span>
            {itemsWithDiscrepancies.length > 0 && (
              <span className="text-amber-600 font-black animate-pulse flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {itemsWithDiscrepancies.length} changes pending reconciliation
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
