"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";

type KitItem = {
  item_id: string;
  quantity: number;
  inventory_items: {
    item_code: string;
    item_name: string;
    unit: string;
  };
};

type Kit = {
  id: string;
  kit_name: string;
  description: string | null;
  total_price: number;
  inventory_kit_items: KitItem[];
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

type StockItem = {
  id: string;
  item_code: string;
  item_name: string;
  current_stock: number;
};

export default function KitConverterPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [kits, setKits] = useState<Kit[]>([]);
  const [selectedKitId, setSelectedKitId] = useState("");
  const [qtyToAssemble, setQtyToAssemble] = useState("5");

  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchStockAndKits();
    }
  }, [academicYearId]);

  async function fetchMetadata() {
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
    }
  }

  async function fetchStockAndKits() {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      // 1. Fetch Kits
      const kitRes = await fetch("/api/inventory/kits");
      const kitData = await kitRes.json();
      if (kitRes.ok) setKits(kitData.kits || []);

      // 2. Fetch stock levels
      const stockRes = await fetch(`/api/inventory/stock?academic_year_id=${academicYearId}`);
      const stockData = await stockRes.json();
      if (stockRes.ok) {
        const smap: Record<string, number> = {};
        (stockData.stock || []).forEach((s: StockItem) => {
          smap[s.id] = s.current_stock;
        });
        setStockMap(smap);
      }
    } catch (err) {
      setError("Failed to load stock data and kit configurations.");
    } finally {
      setLoading(false);
    }
  }

  const selectedKit = kits.find(k => k.id === selectedKitId);

  // Calculate maximum kit sets that can be assembled based on constituent stocks
  let maxKitsPossible = 9999;
  if (selectedKit && selectedKit.inventory_kit_items.length > 0) {
    selectedKit.inventory_kit_items.forEach(ki => {
      const stock = stockMap[ki.item_id] || 0;
      const possible = Math.floor(stock / ki.quantity);
      if (possible < maxKitsPossible) {
        maxKitsPossible = possible;
      }
    });
  } else {
    maxKitsPossible = 0;
  }

  async function handleAssembleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedKitId) {
      setError("Please select a Class Kit to assemble.");
      return;
    }

    const qty = Number(qtyToAssemble);
    if (qty <= 0 || isNaN(qty)) {
      setError("Please enter a valid positive quantity to assemble.");
      return;
    }

    if (qty > maxKitsPossible) {
      setError(`Cannot assemble ${qty} kits. Only ${maxKitsPossible} kits can be assembled with current stock.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/kits/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: selectedKitId,
          quantity: qty,
          academic_year_id: academicYearId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assemble kits.");
      }

      setSuccess(`Successfully bundled ${qty} sets of ${selectedKit?.kit_name}! Stocks adjusted.`);
      setQtyToAssemble("5");
      fetchStockAndKits(); // Reload live stock balances
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";

  if (loading && kits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Opening Kit Bundler desk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Kit Converter & Bundler</h2>
          <p className="text-slate-500 text-xs mt-1">Bundle individual textbooks and notebooks into pre-assembled Class Kits ready for sale</p>
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

      {/* Intro Box */}
      <div className="bg-gradient-to-br from-[#1E5F8A] via-slate-800 to-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md border border-[#1E5F8A]/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#4DA8DA]">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Inventory Kit Assembly</span>
          </div>
          <h3 className="text-base font-black tracking-tight">Pre-bundle Individual Items</h3>
          <p className="text-slate-350 text-xs max-w-xl">
            Select a class kit and enter the quantity to package. The converter will automatically deduct individual component counts and add the consolidated pre-assembled kit stock.
          </p>
        </div>
      </div>

      {/* Success/Error Alerts */}
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

      {/* Assembly Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurations column */}
        <div className="lg:col-span-1 space-y-6">
          <form onSubmit={handleAssembleSubmit} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                <Layers className="w-4.5 h-4.5 text-[#4DA8DA]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Assembly Parameters</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure bundle run</p>
              </div>
            </div>

            {/* Select Kit */}
            <div>
              <label className={labelClass}>Select Target Kit *</label>
              <select
                className={inputClass}
                value={selectedKitId}
                onChange={e => {
                  setSelectedKitId(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                required
              >
                <option value="" disabled>Select Class Kit</option>
                {kits.map(k => (
                  <option key={k.id} value={k.id}>{k.kit_name} Kit (₹{Number(k.total_price)})</option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <label className={labelClass}>Quantity to Bundle *</label>
              <input
                type="number"
                min="1"
                max={maxKitsPossible > 0 ? maxKitsPossible : undefined}
                className={inputClass}
                value={qtyToAssemble}
                onChange={e => setQtyToAssemble(e.target.value)}
                required
              />
            </div>

            {/* Max Possible Display */}
            {selectedKitId && (
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Max Kits possible to build</span>
                <span className={`text-3xl font-black ${maxKitsPossible === 0 ? "text-rose-600 animate-pulse" : "text-[#1E5F8A]"}`}>
                  {maxKitsPossible}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Based on current stock levels</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedKitId || maxKitsPossible === 0 || Number(qtyToAssemble) > maxKitsPossible}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#4DA8DA]/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Bundling...
                </>
              ) : (
                <>
                  Assemble / Convert Kits <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Mapped Checklist column */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800">Constituent Items Checklist</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verify stock availability of components</p>
              </div>
              {selectedKit && (
                <span className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-550">
                  {selectedKit.inventory_kit_items.length} items mapped
                </span>
              )}
            </div>

            {!selectedKit ? (
              <div className="border border-dashed border-slate-200 rounded-2xl py-24 text-center flex flex-col items-center justify-center text-slate-450">
                <Package className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">No Kit Selected</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Select a grade kit from the configuration panel on the left to review its bill of materials and stock counts.</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-450 font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-4 py-3">Product Name [SKU]</th>
                      <th className="px-4 py-3 text-right">Qty / Kit</th>
                      <th className="px-4 py-3 text-right">Stock available</th>
                      <th className="px-4 py-3 text-right">Total required</th>
                      <th className="px-4 py-3 text-right w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                    {selectedKit.inventory_kit_items.map(ki => {
                      const stockAvailable = stockMap[ki.item_id] || 0;
                      const totalRequired = ki.quantity * Number(qtyToAssemble || 0);
                      const isShort = stockAvailable < totalRequired;

                      return (
                        <tr key={ki.item_id} className={`hover:bg-slate-50/50 ${isShort ? "bg-rose-50/10" : ""}`}>
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-slate-800">{ki.inventory_items.item_name}</div>
                            <div className="font-mono text-[9px] text-slate-400 mt-0.5">{ki.inventory_items.item_code}</div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-800">{ki.quantity}</td>
                          <td className={`px-4 py-3.5 text-right font-bold ${stockAvailable <= 5 ? "text-rose-600" : "text-slate-800"}`}>
                            {stockAvailable} {ki.inventory_items.unit}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-550">{totalRequired}</td>
                          <td className="px-4 py-3.5 text-right">
                            {isShort ? (
                              <span className="inline-flex items-center gap-0.5 bg-rose-50 border border-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                Shortage
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
