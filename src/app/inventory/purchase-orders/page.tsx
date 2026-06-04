"use client";

import { useState, useEffect } from "react";
import {
  Plus, Search, Edit3, Loader2, Sparkles, FileText, CheckCircle2, Clock, XCircle, ArrowLeft,
  Calendar, Trash2, HelpCircle, User, Truck, Info, ChevronDown, Check, X, IndianRupee
} from "lucide-react";

type Supplier = {
  id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
};

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

type PurchaseOrder = {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  remarks: string | null;
  created_by: string;
  created_at: string;
  inventory_suppliers: {
    supplier_name: string;
    contact_person: string | null;
  };
  inventory_po_items: {
    id: string;
    item_id: string;
    quantity_ordered: number;
    quantity_received: number;
    rate: number;
    amount: number;
    inventory_items: {
      item_code: string;
      item_name: string;
      unit: string;
    };
  }[];
};

export default function PurchaseOrdersPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "create">("ledger");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Masters Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  
  // Filters
  const [academicYearId, setAcademicYearId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // State POs
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Tab 2 Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [poRemarks, setPoRemarks] = useState("");
  const [poStatus, setPoStatus] = useState("Approved"); // Approved or Draft
  const [poItems, setPoItems] = useState<{ item_id: string; quantity_ordered: number; rate: number }[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchPurchaseOrders();
    }
  }, [academicYearId]);

  async function fetchMetadata() {
    setLoading(true);
    try {
      const supRes = await fetch("/api/inventory/suppliers");
      const supData = await supRes.json();
      if (supRes.ok) setSuppliers(supData.suppliers || []);

      const itmRes = await fetch("/api/inventory/items");
      const itmData = await itmRes.json();
      if (itmRes.ok) setItems(itmData.items || []);

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

  async function fetchPurchaseOrders() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/purchase-orders?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setPos(data.pos || []);
    } catch {
      setError("Failed to load purchase orders ledger.");
    }
  }

  // Handle Create PO Submission
  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedSupplierId || poItems.length === 0 || !academicYearId) {
      setError("Please select a supplier and add at least one item SKU.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        supplier_id: selectedSupplierId,
        academic_year_id: academicYearId,
        remarks: poRemarks,
        status: poStatus,
        items: poItems,
      };

      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit Purchase Order");

      setSuccess(`Purchase Order registered successfully!`);
      setActiveTab("ledger");
      setSelectedSupplierId("");
      setPoRemarks("");
      setPoItems([]);
      fetchPurchaseOrders();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Helper: Manage Draft Items List
  function addPOItem(itemId: string) {
    if (!itemId) return;
    if (poItems.some(i => i.item_id === itemId)) return;
    setPoItems([...poItems, { item_id: itemId, quantity_ordered: 10, rate: 0 }]);
  }

  function updatePOItemQty(itemId: string, qty: number) {
    setPoItems(poItems.map(i => i.item_id === itemId ? { ...i, quantity_ordered: qty } : i));
  }

  function updatePOItemRate(itemId: string, rate: number) {
    setPoItems(poItems.map(i => i.item_id === itemId ? { ...i, rate } : i));
  }

  function removePOItem(itemId: string) {
    setPoItems(poItems.filter(i => i.item_id !== itemId));
  }

  // Calculated PO total amount
  const poCalculatedTotal = poItems.reduce((acc, itm) => acc + (itm.quantity_ordered * itm.rate), 0);

  // Status badge styling helper
  function getPOStatusBadge(status: string) {
    const map: Record<string, string> = {
      Draft: "bg-slate-50 text-slate-700 border-slate-200",
      Approved: "bg-blue-50 text-blue-700 border-blue-200",
      "Partially Received": "bg-amber-50 text-amber-700 border-amber-200",
      Received: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Cancelled: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${map[status] || "bg-slate-100 border-slate-200 text-slate-600"}`}>
        {status}
      </span>
    );
  }

  // Filter purchase orders in local memory
  const filteredPOs = pos.filter(po => {
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.inventory_suppliers.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Purchase Orders (PO)</h2>
          <p className="text-slate-500 text-xs mt-1">Manage vendor procurement requests, pricing contracts, and stock inflow approvals</p>
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
        {[
          { key: "ledger", label: "Procurement Ledger", icon: FileText },
          { key: "create", label: "Generate PO Request", icon: Plus },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                setError("");
                setSuccess("");
              }}
              className={`px-5 py-3 text-xs font-bold transition-all border-b-2 rounded-t-xl flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "border-[#4DA8DA] text-[#4DA8DA] bg-sky-50/20"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
          <XCircle className="w-4 h-4 shrink-0 text-rose-500" /> {error}
        </div>
      )}

      {/* Tab Sections */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Loading PO Roster...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: LEDGER LIST */}
          {activeTab === "ledger" && (
            <>
              {/* Filter panel */}
              <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:bg-white border border-slate-200 focus:border-[#4DA8DA] transition-all"
                    placeholder="Search by PO number or supplier name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 focus:outline-none"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Approved">Approved</option>
                    <option value="Partially Received">Partially Received</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">PO Number</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Created At</th>
                        <th className="px-6 py-4 text-right">View Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPOs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No purchase orders found in ledger</td>
                        </tr>
                      ) : (
                        filteredPOs.map(po => (
                          <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-[#1E5F8A]">{po.po_number}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{po.inventory_suppliers.supplier_name}</div>
                              <div className="text-[10px] text-slate-450">{po.inventory_suppliers.contact_person || ""}</div>
                            </td>
                            <td className="px-6 py-4 font-black text-[#4DA8DA]">₹{Number(po.total_amount).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-4">{getPOStatusBadge(po.status)}</td>
                            <td className="px-6 py-4 text-slate-550 font-medium">
                              {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedPO(po)}
                                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg font-bold text-[10px] transition-all"
                              >
                                View Items
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CREATE PO */}
          {activeTab === "create" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Config panel */}
              <div className="lg:col-span-1">
                <form onSubmit={handleCreatePO} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                      <Truck className="w-4.5 h-4.5 text-[#4DA8DA]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Order Configurations</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Supplier details</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Supplier *</label>
                    <select
                      className={inputClass}
                      value={selectedSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.supplier_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>PO Status Type</label>
                    <select
                      className={inputClass}
                      value={poStatus}
                      onChange={e => setPoStatus(e.target.value)}
                    >
                      <option value="Approved">Approved (Ready to receive)</option>
                      <option value="Draft">Draft (Internal review)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Order Remarks / Instructions</label>
                    <textarea
                      className={`${inputClass} h-20 resize-none`}
                      placeholder="Enter procurement instructions, shipping requirements, delivery dates..."
                      value={poRemarks}
                      onChange={e => setPoRemarks(e.target.value)}
                    />
                  </div>

                  {/* Calculated Price display */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Est. Total Amount</span>
                    <span className="text-2xl font-black text-[#4DA8DA]">₹{poCalculatedTotal.toLocaleString("en-IN")}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSupplierId || poItems.length === 0}
                    className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Submit Purchase Order"
                    )}
                  </button>
                </form>
              </div>

              {/* Items List Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">PO Items Listing</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select products and set ordered counts</p>
                    </div>
                    <div className="w-64 relative">
                      <select
                        className={inputClass}
                        value=""
                        onChange={e => addPOItem(e.target.value)}
                      >
                        <option value="" disabled>+ Add Item SKU to list</option>
                        {items.map(itm => (
                          <option key={itm.id} value={itm.id}>
                            {itm.item_name} [{itm.item_code}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {poItems.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                      <Plus className="w-8 h-8 text-slate-350 mb-2" />
                      <p className="text-xs font-semibold text-slate-500">List is empty</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Select items from the dropdown on the top right to start building the order.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="px-4 py-3">Item Name [SKU]</th>
                            <th className="px-4 py-3">Order Qty</th>
                            <th className="px-4 py-3">Unit Price (₹)</th>
                            <th className="px-4 py-3">Subtotal</th>
                            <th className="px-4 py-3 text-right">Remove</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {poItems.map(itm => {
                            const dbItem = items.find(i => i.id === itm.item_id);
                            return (
                              <tr key={itm.item_id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 text-slate-800">
                                  <div className="font-semibold">{dbItem?.item_name}</div>
                                  <div className="text-[9px] text-slate-400 font-mono font-bold uppercase">{dbItem?.item_code}</div>
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                                    value={itm.quantity_ordered}
                                    onChange={e => updatePOItemQty(itm.item_id, Number(e.target.value))}
                                    min={1}
                                    required
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                                    placeholder="Rate"
                                    value={itm.rate === 0 ? "" : itm.rate}
                                    onChange={e => updatePOItemRate(itm.item_id, Number(e.target.value))}
                                    min={0}
                                    step="any"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  ₹{(itm.quantity_ordered * itm.rate).toLocaleString("en-IN")}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => removePOItem(itm.item_id)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
          )}
        </div>
      )}

      {/* PO DETAIL MODAL */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Purchase Order specs</span>
                <h2 className="text-base font-black text-slate-800 mt-0.5">{selectedPO.po_number}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Supplier: {selectedPO.inventory_suppliers.supplier_name}</p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block mb-0.5">Total Amount</span>
                  <span className="font-black text-[#4DA8DA] text-sm">₹{Number(selectedPO.total_amount).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">PO Status</span>
                  {getPOStatusBadge(selectedPO.status)}
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Date Created</span>
                  <span className="text-slate-700">{new Date(selectedPO.created_at).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {selectedPO.remarks && (
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1">Remarks:</span>
                  {selectedPO.remarks}
                </div>
              )}

              {/* Items checklist */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Constituent Item Roster:</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] sticky top-0">
                        <th className="px-4 py-3">Item Details</th>
                        <th className="px-4 py-3">Rate</th>
                        <th className="px-4 py-3">Qty Ordered</th>
                        <th className="px-4 py-3">Qty Inwarded</th>
                        <th className="px-4 py-3">Balance Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {selectedPO.inventory_po_items.map(pi => {
                        const bal = pi.quantity_ordered - pi.quantity_received;
                        return (
                          <tr key={pi.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{pi.inventory_items.item_name}</div>
                              <div className="text-[9px] font-mono text-slate-400">{pi.inventory_items.item_code}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">₹{Number(pi.rate).toLocaleString("en-IN")}</td>
                            <td className="px-4 py-3 font-bold text-slate-800">{pi.quantity_ordered}</td>
                            <td className="px-4 py-3 font-bold text-emerald-600">{pi.quantity_received}</td>
                            <td className={`px-4 py-3 font-bold ${bal > 0 ? "text-amber-600" : "text-slate-400"}`}>{bal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-end">
              <button
                onClick={() => setSelectedPO(null)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
