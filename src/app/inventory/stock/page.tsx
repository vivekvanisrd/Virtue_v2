"use client";

import { useState, useEffect } from "react";
import {
  Search, Loader2, Sparkles, FileText, CheckCircle2, AlertTriangle, ArrowLeft,
  Calendar, Trash2, HelpCircle, Package, AlertCircle, RefreshCw, BarChart3, TrendingDown
} from "lucide-react";

type StockRecord = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  item_type: string | null;
  unit: string;
  reorder_level: number;
  barcode: string | null;
  qr_code: string | null;
  status: string;
  opening_qty: number;
  received_qty: number;
  adjusted_add_qty: number;
  adjusted_sub_qty: number;
  issued_qty: number;
  damaged_qty: number;
  current_stock: number;
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

const CATEGORIES = [
  "Notebooks",
  "Textbooks",
  "Uniforms",
  "Shoes",
  "ID Cards",
  "Diaries",
  "Stationery"
];

export default function StockLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [stock, setStock] = useState<StockRecord[]>([]);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [alertFilter, setAlertFilter] = useState("All"); // All, Low Stock, Out of Stock, Healthy

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchLiveStock();
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
      setError("Failed to load academic year configurations.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLiveStock() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setStock(data.stock || []);
      else throw new Error(data.error || "Failed to load live ledger");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Filter logic
  const filteredStock = stock.filter(item => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchQuery));

    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;

    let matchesAlert = true;
    if (alertFilter === "Low Stock") {
      matchesAlert = item.current_stock <= item.reorder_level && item.current_stock > 0;
    } else if (alertFilter === "Out of Stock") {
      matchesAlert = item.current_stock <= 0;
    } else if (alertFilter === "Healthy") {
      matchesAlert = item.current_stock > item.reorder_level;
    }

    return matchesSearch && matchesCategory && matchesAlert;
  });

  // Calculate metrics
  const totalSkuCount = stock.length;
  const lowStockCount = stock.filter(i => i.current_stock <= i.reorder_level && i.current_stock > 0).length;
  const outOfStockCount = stock.filter(i => i.current_stock <= 0).length;
  const totalStockQty = stock.reduce((sum, item) => sum + item.current_stock, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Live Stock Ledger</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time inventory balances, stock counts, adjustments, and reorder alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLiveStock}
            className="p-2.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Catalog SKUs", value: totalSkuCount, icon: Package, color: "text-[#1E5F8A]", bg: "bg-blue-50 border-blue-100" },
          { label: "Total Available Qty", value: totalStockQty, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
          { label: "Low Stock Warnings", value: lowStockCount, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Out of Stock Items", value: outOfStockCount, icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className={`border rounded-2xl p-4 shadow-sm flex items-center justify-between ${c.bg}`}>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{c.label}</span>
                <span className="text-2xl font-black text-slate-800">{c.value}</span>
              </div>
              <div className={`p-2.5 bg-white rounded-xl shadow-sm ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:bg-white border border-slate-200 focus:border-[#4DA8DA] transition-all"
            placeholder="Search by SKU code, item name, or barcode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 focus:outline-none"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 focus:outline-none"
            value={alertFilter}
            onChange={e => setAlertFilter(e.target.value)}
          >
            <option value="All">All Items Status</option>
            <option value="Healthy">In Stock Only</option>
            <option value="Low Stock">Low Stock Warnings</option>
            <option value="Out of Stock">Out of Stock Only</option>
          </select>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Calculating live balances...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="px-6 py-4">Item SKU</th>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Opening</th>
                  <th className="px-6 py-4">Inward (GRN)</th>
                  <th className="px-6 py-4">Adjusted (Net)</th>
                  <th className="px-6 py-4">Outward Issued</th>
                  <th className="px-6 py-4">Damaged</th>
                  <th className="px-6 py-4">Available Stock</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-slate-400 font-bold">No stock items found in ledger</td>
                  </tr>
                ) : (
                  filteredStock.map(item => {
                    const isLow = item.current_stock <= item.reorder_level && item.current_stock > 0;
                    const isOut = item.current_stock <= 0;
                    const netAdjustment = item.adjusted_add_qty - item.adjusted_sub_qty;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/60 transition-colors ${isOut ? "bg-rose-50/10" : isLow ? "bg-amber-50/10" : ""}`}>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{item.item_code}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{item.item_name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-150 text-slate-650 rounded-full font-bold text-[9px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-600">{item.opening_qty}</td>
                        <td className="px-6 py-4 text-emerald-600 font-bold">+{item.received_qty}</td>
                        <td className={`px-6 py-4 font-bold ${netAdjustment > 0 ? "text-indigo-600" : netAdjustment < 0 ? "text-rose-600" : "text-slate-400"}`}>
                          {netAdjustment > 0 ? `+${netAdjustment}` : netAdjustment < 0 ? `${netAdjustment}` : "0"}
                        </td>
                        <td className="px-6 py-4 text-rose-600 font-bold">-{item.issued_qty}</td>
                        <td className="px-6 py-4 text-rose-600 font-bold">-{item.damaged_qty}</td>
                        <td className="px-6 py-4 font-black text-sm text-slate-800">
                          {item.current_stock} <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" /> Low Stock ({item.reorder_level})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" /> In Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredStock.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200">
              Showing {filteredStock.length} SKU codes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
