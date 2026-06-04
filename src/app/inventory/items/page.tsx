"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit3, ShieldAlert, CheckCircle, Package, ArrowLeft, Loader2, Sparkles, Filter, X } from "lucide-react";

type Item = {
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
  created_at: string;
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

const UNITS = ["Pcs", "Box", "Set", "Pack", "Pair", "Dozens"];
const TYPES = ["Regular", "Premium", "Kit Item", "Staff Use"];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("Active");

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Form Fields
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [itemType, setItemType] = useState(TYPES[0]);
  const [unit, setUnit] = useState(UNITS[0]);
  const [reorderLevel, setReorderLevel] = useState("10");
  const [barcode, setBarcode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState("Active");
  
  // Opening stock fields (optional on create/update)
  const [academicYearId, setAcademicYearId] = useState("");
  const [openingQty, setOpeningQty] = useState("0");

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      // 1. Fetch Items
      const itemsRes = await fetch("/api/inventory/items");
      const itemsData = await itemsRes.json();
      if (itemsRes.ok) setItems(itemsData.items || []);

      // 2. Fetch Metadata (Academic Years)
      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        setAcademicYears(metaData.academicYears || []);
        // Pre-select current academic year if available
        const current = metaData.academicYears?.find((ay: any) => ay.isCurrent);
        if (current) setAcademicYearId(current.id);
        else if (metaData.academicYears?.length > 0) setAcademicYearId(metaData.academicYears[0].id);
      }
    } catch {
      setError("Failed to load catalog data.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(item: Item | null = null) {
    setError("");
    setSuccess("");
    if (item) {
      // Edit mode
      setSelectedItem(item);
      setItemCode(item.item_code);
      setItemName(item.item_name);
      setCategory(item.category);
      setItemType(item.item_type || TYPES[0]);
      setUnit(item.unit);
      setReorderLevel(String(item.reorder_level));
      setBarcode(item.barcode || "");
      setQrCode(item.qr_code || "");
      setStatus(item.status);
      setOpeningQty("0"); // reset opening qty field
    } else {
      // Create mode
      setSelectedItem(null);
      setItemCode("");
      setItemName("");
      setCategory(CATEGORIES[0]);
      setItemType(TYPES[0]);
      setUnit(UNITS[0]);
      setReorderLevel("10");
      setBarcode("");
      setQrCode("");
      setStatus("Active");
      setOpeningQty("0");
    }
    setIsOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        id: selectedItem?.id || undefined,
        item_code: itemCode.trim(),
        item_name: itemName.trim(),
        category,
        item_type: itemType,
        unit,
        reorder_level: Number(reorderLevel),
        barcode: barcode.trim() || null,
        qr_code: qrCode.trim() || null,
        status,
        ...(Number(openingQty) > 0 && academicYearId
          ? { opening_qty: Number(openingQty), academic_year_id: academicYearId }
          : {}),
      };

      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save item SKU.");

      setSuccess(selectedItem ? "Item updated successfully!" : "New Item SKU created successfully!");
      setIsOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Client filtering
  const filteredItems = items.filter(itm => {
    const matchesSearch =
      searchQuery === "" ||
      itm.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itm.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (itm.barcode && itm.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || itm.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || itm.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Item Catalog Master</h2>
          <p className="text-slate-500 text-xs mt-1">Manage bookstore products, textbooks, uniforms, and opening stock counts</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-[#4DA8DA]/10"
        >
          <Plus className="w-4 h-4" /> Add Item SKU
        </button>
      </div>

      {/* Filter Row */}
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
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 focus:outline-none"
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {success}
        </div>
      )}

      {/* Catalog Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Loading Items...</span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-6 py-4">Item Code</th>
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Unit</th>
                  <th className="px-6 py-4">Reorder Level</th>
                  <th className="px-6 py-4">Barcode / QR</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">No items found in catalog</td>
                  </tr>
                ) : (
                  filteredItems.map(itm => (
                    <tr key={itm.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{itm.item_code}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{itm.item_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px]">
                          {itm.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{itm.item_type || "Regular"}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{itm.unit}</td>
                      <td className="px-6 py-4 font-bold text-slate-750">{itm.reorder_level}</td>
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">
                        {itm.barcode || itm.qr_code ? (
                          <div className="flex flex-col gap-0.5">
                            {itm.barcode && <span>BC: {itm.barcode}</span>}
                            {itm.qr_code && <span>QR: {itm.qr_code}</span>}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          itm.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {itm.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenModal(itm)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[#4DA8DA] transition-colors"
                          title="Edit Item Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredItems.length > 0 && (
            <div className="px-6 py-3 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200">
              Showing {filteredItems.length} of {items.length} unique SKUs
            </div>
          )}
        </div>
      )}

      {/* CRUD Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  {selectedItem ? "Edit Item SKU" : "Create New Item SKU"}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  Bookstore Catalog Specifications
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 animate-shake">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Item Code (SKU)</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. TEXT-GRADE1-MATH"
                    value={itemCode}
                    onChange={e => setItemCode(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Item Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. Grade 1 Math Text"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select className={inputClass} value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <select className={inputClass} value={itemType} onChange={e => setItemType(e.target.value)}>
                    {TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <select className={inputClass} value={unit} onChange={e => setUnit(e.target.value)}>
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={reorderLevel}
                    onChange={e => setReorderLevel(e.target.value)}
                    required
                    min={0}
                  />
                </div>
                <div>
                  <label className={labelClass}>Barcode</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Optional barcode value"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Configure opening stock (optional) */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" /> Add / Update Opening Stock (Optional)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Academic Year</label>
                    <select
                      className={inputClass}
                      value={academicYearId}
                      onChange={e => setAcademicYearId(e.target.value)}
                    >
                      <option value="" disabled>Select Year</option>
                      {academicYears.map(ay => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Opening Quantity</label>
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Add opening inventory count"
                      value={openingQty}
                      onChange={e => setOpeningQty(e.target.value)}
                      min={0}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition-all"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#4DA8DA] hover:bg-[#3c97c9] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-[#4DA8DA]/10"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save SKU Specifications"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
