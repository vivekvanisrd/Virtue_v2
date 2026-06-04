"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  FileSpreadsheet,
  Truck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  History,
  ArrowRight,
  Loader2,
  DollarSign,
  Plus,
  Bookmark,
  Coins,
  Layers,
  ShoppingBag,
  Warehouse
} from "lucide-react";

type StockItem = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  reorder_level: number;
  current_stock: number;
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

export default function InventoryDashboard() {
  const [loading, setLoading] = useState(true);
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [recentIssues, setRecentIssues] = useState<any[]>([]);
  const [stats, setStats] = useState({
    sales: { value: 0, count: 0 },
    purchases: { value: 0, count: 0 },
    catalog: { items: 0, kits: 0 },
    stock: { available: 0, sold: 0, lowStock: 0 }
  });

  useEffect(() => {
    fetchMetadataAndStock();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchStock();
      fetchRecentIssues();
      fetchStats();
    }
  }, [academicYearId]);

  async function fetchMetadataAndStock() {
    setLoading(true);
    try {
      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        setAcademicYears(metaData.academicYears || []);
        const current = metaData.academicYears?.find((ay: any) => ay.isCurrent);
        if (current) {
          setAcademicYearId(current.id);
        } else if (metaData.academicYears?.length > 0) {
          setAcademicYearId(metaData.academicYears[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard metadata:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStock() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        setStockList(data.stock || []);
      }
    } catch (err) {
      console.error("Failed to load stock data:", err);
    }
  }

  async function fetchRecentIssues() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/issues?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        setRecentIssues(data.issues?.slice(0, 5) || []);
      }
    } catch (err) {
      console.error("Failed to load recent issues:", err);
    }
  }

  async function fetchStats() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/dashboard?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    }
  }

  // Calculated Stats for low stock table
  const lowStockItems = stockList.filter(item => item.current_stock <= item.reorder_level);
  const lowStockCount = stats.stock.lowStock;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Live Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Bookstore Inventory Dashboard</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time summaries, live connection state, and catalog actions</p>
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

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        {/* Metric 1: Sales / Revenue */}
        <Link
          href="/inventory/fee-link/owner"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Sales / Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:bg-purple-55/20 transition-colors">
              <Coins className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">₹{Number(stats.sales.value).toLocaleString("en-IN")}</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stats.sales.count} payments</span>
          </div>
        </Link>

        {/* Metric 2: Purchases */}
        <Link
          href="/inventory/purchase-orders"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Purchases</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-55/20 transition-colors">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">₹{Number(stats.purchases.value).toLocaleString("en-IN")}</h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{stats.purchases.count} receipts</span>
          </div>
        </Link>

        {/* Metric 3: Catalog Items */}
        <Link
          href="/inventory/items"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-[#4DA8DA]/35 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Catalog Items</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 group-hover:bg-[#4DA8DA]/10 transition-colors">
              <Package className="w-4 h-4 text-[#4DA8DA]" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{stats.catalog.items} SKUs</h3>
            <span className="text-[10px] text-slate-400 font-medium">Distinct products</span>
          </div>
        </Link>

        {/* Metric 4: Pre-assembled Kits */}
        <Link
          href="/inventory/converter"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-violet-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Pre-assembled Kits</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-55/20 transition-colors">
              <Layers className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{stats.catalog.kits} Kits</h3>
            <span className="text-[10px] text-slate-400 font-medium">Class kit options</span>
          </div>
        </Link>

        {/* Metric 5: Available Stock */}
        <Link
          href="/inventory/stock"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Available Stock</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-55/20 transition-colors">
              <Warehouse className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{stats.stock.available.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 font-medium">Units on hand</span>
          </div>
        </Link>

        {/* Metric 6: Sold / Issued Stock */}
        <Link
          href="/inventory/issues"
          className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Sold / Issued Stock</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 group-hover:bg-rose-55/20 transition-colors">
              <ShoppingBag className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">{stats.stock.sold.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-400 font-medium">Units distributed</span>
          </div>
        </Link>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Quick Operations Menu</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link
            href="/inventory/items"
            className="bg-white border border-slate-200 hover:border-[#4DA8DA]/35 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#4DA8DA] group-hover:scale-105 transition-all">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Add SKU / Items</span>
          </Link>

          <Link
            href="/inventory/goods-receipts"
            className="bg-white border border-slate-200 hover:border-emerald-250 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-all">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Receive Stock (GRN)</span>
          </Link>

          <Link
            href="/inventory/issues"
            className="bg-white border border-slate-200 hover:border-sky-300 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-[#4DA8DA] group-hover:scale-105 transition-all">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Issue to Student</span>
          </Link>

          <Link
            href="/inventory/reports"
            className="bg-white border border-slate-200 hover:border-slate-350 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-55/35 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-105 transition-all">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Excel / PDF Reports</span>
          </Link>

          <Link
            href="/inventory/suppliers"
            className="bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-all">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Suppliers Master</span>
          </Link>

          <Link
            href="/books-buy"
            className="bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-all">
              <Bookmark className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Checkout Link</span>
          </Link>
        </div>
      </div>

      {/* Low Stock and Recent Issues Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Low Stock Warnings */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Critical Low Stock alerts</h4>
            </div>
            {lowStockCount > 0 && (
              <Link href="/inventory/purchase-orders" className="text-[#4DA8DA] hover:underline text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                Raise PO <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>

          {lowStockCount === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              All items are fully stocked!
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-150 rounded-2xl">
              <table className="w-full text-left text-xs font-medium">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2.5">Item Name</th>
                    <th className="px-4 py-2.5">Item Code</th>
                    <th className="px-4 py-2.5 text-right">In Stock</th>
                    <th className="px-4 py-2.5 text-right">Reorder Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lowStockItems.slice(0, 5).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{item.item_name}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{item.item_code}</td>
                      <td className="px-4 py-3 text-right font-black text-rose-600">{item.current_stock}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{item.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Recent Stock Issues */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-sky-500" />
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Stock Distributions</h4>
            </div>
            <Link href="/inventory/issues" className="text-[#4DA8DA] hover:underline text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
              View Issues <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentIssues.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              No recent distribution logs.
            </div>
          ) : (
            <div className="space-y-3">
              {recentIssues.map((issue: any) => (
                <div key={issue.id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/55 rounded-2xl text-xs font-medium">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">
                      {issue.issue_type === "Student" ? "Student Distribution" : "Class Distribution"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Ref: <span className="font-mono text-slate-500 font-bold">{issue.id.slice(0, 8)}...</span> • {new Date(issue.issue_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-50 text-[#4DA8DA] border border-sky-100">
                      {issue.inventory_issue_items?.length} SKUs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
