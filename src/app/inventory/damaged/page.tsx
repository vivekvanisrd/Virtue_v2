"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  History,
  TrendingDown,
  Trash2,
  FileText,
  Search
} from "lucide-react";

type Item = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

type DamagedRecord = {
  id: string;
  log_date: string;
  quantity: number;
  reason: string;
  logged_by: string;
  inventory_items: {
    item_code: string;
    item_name: string;
    unit: string;
  };
};

type StockRecord = {
  id: string;
  current_stock: number;
};

export default function DamagedStockPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Metadata & Live Stock mapping
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [liveStockMap, setLiveStockMap] = useState<Record<string, number>>({});
  
  // Form fields
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);

  // History list
  const [damagedHistory, setDamagedHistory] = useState<DamagedRecord[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReasonFilter, setSelectedReasonFilter] = useState("All");

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchHistoryAndStock();
    }
  }, [academicYearId]);

  async function fetchMetadata() {
    setLoading(true);
    try {
      // 1. Fetch Items
      const itemRes = await fetch("/api/inventory/items");
      const itemData = await itemRes.json();
      if (itemRes.ok) setItems(itemData.items || []);

      // 2. Fetch Academic Years
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

  async function fetchHistoryAndStock() {
    if (!academicYearId) return;
    try {
      // 1. Fetch Damaged History logs
      const historyRes = await fetch(`/api/inventory/damaged?academic_year_id=${academicYearId}`);
      const historyData = await historyRes.json();
      if (historyRes.ok) setDamagedHistory(historyData.damaged || []);

      // 2. Fetch Live stock levels to check availability
      const stockRes = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const stockData = await stockRes.json();
      if (stockRes.ok) {
        const stockMap: Record<string, number> = {};
        (stockData.stock || []).forEach((s: StockRecord) => {
          stockMap[s.id] = s.current_stock;
        });
        setLiveStockMap(stockMap);
      }
    } catch {
      console.warn("Failed to sync current stock levels and damaged logs.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedItemId) {
      setError("Please select an item SKU.");
      return;
    }

    const availableStock = liveStockMap[selectedItemId] || 0;
    const requestedQty = Number(quantity);

    if (requestedQty <= 0) {
      setError("Quantity must be a positive integer.");
      return;
    }

    if (requestedQty > availableStock) {
      setError(`Insufficient stock. Only ${availableStock} units are available in current stock.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/damaged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_id: selectedItemId,
          quantity: requestedQty,
          reason: reason.trim(),
          log_date: logDate,
          academic_year_id: academicYearId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to log damaged stock.");
      }

      setSuccess("Damaged stock recorded successfully!");
      // Reset form fields
      setSelectedItemId("");
      setQuantity("1");
      setReason("");
      setLogDate(new Date().toISOString().split("T")[0]);
      
      // Refresh list & stock availability
      fetchHistoryAndStock();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Derived metrics
  const totalDamagedItems = damagedHistory.reduce((acc, curr) => acc + curr.quantity, 0);
  const varietyDamaged = new Set(damagedHistory.map(d => d.inventory_items?.item_name || "")).size;

  // Filtered history list
  const filteredHistory = damagedHistory.filter(d => {
    const matchesSearch =
      searchQuery === "" ||
      d.inventory_items?.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.inventory_items?.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesReason =
      selectedReasonFilter === "All" ||
      d.reason.toLowerCase().includes(selectedReasonFilter.toLowerCase());

    return matchesSearch && matchesReason;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Syncing inventory damages...</p>
      </div>
    );
  }

  const selectedItemStock = selectedItemId ? (liveStockMap[selectedItemId] || 0) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Damaged Stock Manager</h2>
          <p className="text-slate-500 text-xs mt-1">Log damaged stock write-offs, track inventory shrinkage, and view audit reports</p>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-6 rounded-3xl border border-slate-800 text-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Items Wrote-Off</span>
            <span className="text-3xl font-black">{totalDamagedItems}</span>
            <span className="text-[10px] text-[#4DA8DA] font-semibold block mt-1">Deducted from active stock</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-[#4DA8DA]" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Damaged SKU Categories</span>
            <span className="text-3xl font-black text-slate-800">{varietyDamaged}</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Unique products affected</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Logged Incidents</span>
            <span className="text-3xl font-black text-slate-800">{damagedHistory.length}</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total write-off batches</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <History className="w-6 h-6 text-slate-400" />
          </div>
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

      {/* Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Log Incident Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Log Damaged Stock</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Record items to write off</p>
              </div>
            </div>

            {/* Select Item */}
            <div>
              <label className={labelClass}>Select Product SKU *</label>
              <select
                className={inputClass}
                value={selectedItemId}
                onChange={e => {
                  setSelectedItemId(e.target.value);
                  setError("");
                }}
                required
              >
                <option value="" disabled>Select Item SKU</option>
                {items.map(itm => (
                  <option key={itm.id} value={itm.id}>
                    {itm.item_name} [{itm.item_code}]
                  </option>
                ))}
              </select>
              {selectedItemId && (
                <div className="mt-1.5 px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Current Live Stock:</span>
                  <span className={`text-xs ${selectedItemStock <= 5 ? "text-rose-600" : "text-slate-850"}`}>
                    {selectedItemStock} {items.find(i => i.id === selectedItemId)?.unit || "units"}
                  </span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className={labelClass}>Damaged Quantity *</label>
              <input
                type="number"
                min="1"
                max={selectedItemStock > 0 ? selectedItemStock : undefined}
                className={inputClass}
                placeholder="Number of damaged items..."
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Log Date */}
            <div>
              <label className={labelClass}>Incident Log Date</label>
              <div className="relative">
                <input
                  type="date"
                  className={inputClass}
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className={labelClass}>Reason for Damage *</label>
              <select
                className={inputClass}
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              >
                <option value="" disabled>Select Reason</option>
                <option value="Water damage / Dampness">Water damage / Dampness</option>
                <option value="Torn pages / Covers">Torn pages / Covers</option>
                <option value="Uniform stain / Fabric defect">Uniform stain / Fabric defect</option>
                <option value="Transit damage">Transit damage</option>
                <option value="In-house spillage / Soil">In-house spillage / Soil</option>
                <option value="Defective prints">Defective prints</option>
                <option value="Other / Miscellaneous">Other / Miscellaneous</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedItemId || Number(quantity) > selectedItemStock}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#4DA8DA]/10"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Stock Write-Off"}
            </button>
          </form>
        </div>

        {/* History / Past write-off logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">Write-Off Logs history</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Review logged inventory shrinkages</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Reason Filter */}
                <select
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-650 focus:outline-none"
                  value={selectedReasonFilter}
                  onChange={e => setSelectedReasonFilter(e.target.value)}
                >
                  <option value="All">All Reasons</option>
                  <option value="Water">Water damage</option>
                  <option value="Torn">Torn / Defect</option>
                  <option value="Transit">Transit</option>
                  <option value="Spillage">Spillage</option>
                  <option value="Defective">Defective</option>
                  <option value="Other">Other</option>
                </select>
                {/* Search */}
                <div className="w-44 relative">
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-2.5 py-1.5 text-[11px] font-bold text-slate-650 placeholder-slate-400 focus:outline-none"
                    placeholder="Search SKU/Reason..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="px-4 py-3.5">Log Date</th>
                    <th className="px-4 py-3.5">Product SKU</th>
                    <th className="px-4 py-3.5">Item Name</th>
                    <th className="px-4 py-3.5">Wrote-Off Qty</th>
                    <th className="px-4 py-3.5">Reason Category</th>
                    <th className="px-4 py-3.5">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        No incidents logged for matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-850 font-semibold">
                          {new Date(rec.log_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-500">
                          {rec.inventory_items?.item_code}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-850">
                          {rec.inventory_items?.item_name}
                        </td>
                        <td className="px-4 py-3 text-rose-650 font-black text-xs">
                          -{rec.quantity} {rec.inventory_items?.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {rec.reason}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                          {rec.logged_by.slice(0, 10)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
