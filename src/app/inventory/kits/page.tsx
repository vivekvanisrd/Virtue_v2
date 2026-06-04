"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit3, Trash2, CheckCircle, AlertTriangle, Layers, Loader2, X, PlusCircle, MinusCircle } from "lucide-react";

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
  status: string;
  inventory_kit_items: KitItem[];
};

type CatalogItem = {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
};

export default function KitManagementPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [kits, setKits] = useState<Kit[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);

  // Disassembly Modal state
  const [academicYearId, setAcademicYearId] = useState("");
  const [isDisassembleOpen, setIsDisassembleOpen] = useState(false);
  const [disassembleKit, setDisassembleKit] = useState<Kit | null>(null);
  const [disassembleQty, setDisassembleQty] = useState("1");

  // Form fields
  const [kitName, setKitName] = useState("");
  const [description, setDescription] = useState("");
  const [totalPrice, setTotalPrice] = useState("");
  const [status, setStatus] = useState("Active");
  const [mappedItems, setMappedItems] = useState<{ item_id: string; quantity: number }[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const kitRes = await fetch("/api/inventory/kits");
      const kitData = await kitRes.json();
      if (kitRes.ok) setKits(kitData.kits || []);

      const itemRes = await fetch("/api/inventory/items");
      const itemData = await itemRes.json();
      if (itemRes.ok) setCatalogItems(itemData.items || []);

      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        const current = metaData.academicYears?.find((ay: any) => ay.isCurrent);
        if (current) setAcademicYearId(current.id);
        else if (metaData.academicYears?.length > 0) setAcademicYearId(metaData.academicYears[0].id);
      }
    } catch {
      setError("Failed to load kit configurations.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(kit: Kit | null = null) {
    setError("");
    setSuccess("");
    if (kit) {
      setSelectedKit(kit);
      setKitName(kit.kit_name);
      setDescription(kit.description || "");
      setTotalPrice(String(kit.total_price));
      setStatus(kit.status);
      setMappedItems(kit.inventory_kit_items.map(ki => ({
        item_id: ki.item_id,
        quantity: ki.quantity
      })));
    } else {
      setSelectedKit(null);
      setKitName("");
      setDescription("");
      setTotalPrice("0");
      setStatus("Active");
      setMappedItems([]);
    }
    setIsOpen(true);
  }

  function handleAddMappedItem() {
    if (catalogItems.length === 0) return;
    setMappedItems([...mappedItems, { item_id: catalogItems[0].id, quantity: 1 }]);
  }

  function handleRemoveMappedItem(index: number) {
    const updated = [...mappedItems];
    updated.splice(index, 1);
    setMappedItems(updated);
  }

  function handleMappedItemChange(index: number, field: "item_id" | "quantity", value: any) {
    const updated = [...mappedItems];
    if (field === "item_id") {
      updated[index].item_id = value;
    } else {
      updated[index].quantity = Number(value);
    }
    setMappedItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!kitName.trim()) {
      setError("Kit name is required.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        id: selectedKit?.id || undefined,
        kit_name: kitName.trim(),
        description: description.trim() || null,
        total_price: Number(totalPrice),
        status,
        items: mappedItems.map(m => ({
          item_id: m.item_id,
          quantity: m.quantity
        }))
      };

      const res = await fetch("/api/inventory/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Kit configuration.");

      setSuccess(selectedKit ? "Class Kit updated successfully!" : "New Class Kit created successfully!");
      setIsOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenDisassembleModal(kit: Kit) {
    setError("");
    setSuccess("");
    setDisassembleKit(kit);
    setDisassembleQty("1");
    setIsDisassembleOpen(true);
  }

  async function handleDisassembleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!disassembleKit || !disassembleQty || Number(disassembleQty) <= 0 || !academicYearId) {
      setError("Valid disassembly quantity and academic year context are required.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/inventory/kits/disassemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_id: disassembleKit.id,
          quantity: Number(disassembleQty),
          academic_year_id: academicYearId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disassemble kit.");

      setSuccess(`Successfully disassembled ${disassembleQty} sets of ${disassembleKit.kit_name} Kit! Stocks updated.`);
      setIsDisassembleOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";

  if (loading && kits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Loading Kit Configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Grade Kit Mappings</h2>
          <p className="text-slate-500 text-xs mt-1">Configure composite Class Kits and map individual textbooks/notebook components</p>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#4DA8DA]/10 flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Create Class Kit
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" /> {error}
        </div>
      )}

      {/* Kit Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kits.map(kit => (
          <div key={kit.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-sky-200 hover:shadow-md transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <Layers className="w-4.5 h-4.5 text-[#4DA8DA]" />
                  </div>
                  <h3 className="font-black text-slate-800 text-sm tracking-tight">{kit.kit_name} Kit</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  kit.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                }`}>
                  {kit.status}
                </span>
              </div>
              <p className="text-slate-500 text-xs line-clamp-2 min-h-[2rem]">{kit.description || "No description provided."}</p>
              
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">Total Bundle Price</span>
                  <span className="font-black text-slate-850">₹{Number(kit.total_price).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="font-semibold text-slate-400">Mapped Components</span>
                  <span className="font-bold text-[#1E5F8A]">{kit.inventory_kit_items.length} items</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleOpenDisassembleModal(kit)}
                className="text-rose-500 hover:text-rose-650 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer uppercase tracking-wider"
              >
                <MinusCircle className="w-3.5 h-3.5" /> Disassemble
              </button>
              <button
                onClick={() => handleOpenModal(kit)}
                className="text-[#4DA8DA] hover:text-[#3c97c9] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer uppercase tracking-wider"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Configuration
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Creation & Editing Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-150 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#4DA8DA]" />
                <div>
                  <h3 className="text-base font-black text-slate-800">{selectedKit ? "Edit Kit Mapping" : "Create New Class Kit"}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure component quantities</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Kit Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 4th Class"
                    className={inputClass}
                    value={kitName}
                    onChange={e => setKitName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Bundle Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 5200"
                    className={inputClass}
                    value={totalPrice}
                    onChange={e => setTotalPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Kit Description</label>
                  <input
                    type="text"
                    placeholder="Short summary of items"
                    className={inputClass}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
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

              {/* Mappings Manager */}
              <div className="border-t border-slate-150 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Seeded Constituent Items</h4>
                  <button
                    type="button"
                    onClick={handleAddMappedItem}
                    disabled={catalogItems.length === 0}
                    className="text-[#4DA8DA] hover:text-[#3c97c9] disabled:opacity-40 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Item Row
                  </button>
                </div>

                {mappedItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs font-semibold">
                    No items mapped yet. Click "Add Item Row" to populate kit components.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {mappedItems.map((mapped, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Catalog Product</label>
                          <select
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 w-full focus:outline-none"
                            value={mapped.item_id}
                            onChange={e => handleMappedItemChange(idx, "item_id", e.target.value)}
                          >
                            {catalogItems.map(itm => (
                              <option key={itm.id} value={itm.id}>
                                [{itm.item_code}] {itm.item_name} ({itm.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Qty per Kit</label>
                          <input
                            type="number"
                            min="1"
                            required
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 w-full focus:outline-none"
                            value={mapped.quantity}
                            onChange={e => handleMappedItemChange(idx, "quantity", e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMappedItem(idx)}
                          className="mt-4 w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-150 pt-4 flex items-center justify-end gap-2 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {selectedKit ? "Save Mapping" : "Create Kit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disassembly Modal */}
      {isDisassembleOpen && disassembleKit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-150 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-base font-black text-slate-800">Disassemble {disassembleKit.kit_name} Kit</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Unpack kit boxes into loose books</p>
                </div>
              </div>
              <button onClick={() => setIsDisassembleOpen(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleDisassembleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className={labelClass}>Quantity to Disassemble *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5"
                  className={inputClass}
                  value={disassembleQty}
                  onChange={e => setDisassembleQty(e.target.value)}
                  disabled={submitting}
                />
                <p className="text-[10px] text-slate-400 mt-1 font-semibold">This will subtract {disassembleQty || "0"} from kit stock and distribute contents back to respective loose stocks.</p>
              </div>

              {/* Components Preview */}
              <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-4 space-y-2">
                <h4 className="text-[10px] font-bold text-rose-700 uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Component Unpacking Preview:
                </h4>
                <div className="divide-y divide-rose-100 text-xs font-semibold text-slate-650 max-h-48 overflow-y-auto">
                  {disassembleKit.inventory_kit_items.map((ki, idx) => {
                    const count = ki.quantity * (Number(disassembleQty) || 0);
                    return (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <span>{ki.inventory_items.item_name} ({ki.inventory_items.unit})</span>
                        <span className="font-bold text-emerald-600">+{count} units</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="border-t border-slate-150 pt-4 flex items-center justify-end gap-2 bg-white sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsDisassembleOpen(false)}
                  disabled={submitting}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !disassembleQty || Number(disassembleQty) <= 0}
                  className="bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Confirm Disassembly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
