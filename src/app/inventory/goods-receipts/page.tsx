"use client";

import { useState, useEffect } from "react";
import {
  Plus, Search, Loader2, FileText, CheckCircle2, XCircle, ArrowLeft,
  Calendar, Trash2, HelpCircle, Truck, Info, ChevronDown, Check, X, ClipboardList, Eye
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
  inventory_po_items: {
    item_id: string;
    quantity_ordered: number;
    quantity_received: number;
    rate: number;
    inventory_items: {
      item_code: string;
      item_name: string;
      unit: string;
    };
  }[];
};

type GoodsReceipt = {
  id: string;
  grn_number: string;
  po_id: string | null;
  supplier_id: string;
  invoice_number: string;
  receipt_date: string;
  total_amount: number;
  status: string;
  remarks: string | null;
  created_by: string;
  created_at: string;
  inventory_suppliers: {
    supplier_name: string;
  };
  inventory_grn_items: {
    id: string;
    item_id: string;
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

export default function GoodsReceiptsPage() {
  const [activeTab, setActiveTab] = useState<"ledger" | "log">("ledger");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Masters Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  
  // Filters
  const [academicYearId, setAcademicYearId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // State GRNs
  const [grns, setGrns] = useState<GoodsReceipt[]>([]);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null);

  // Tab 2: Form Logging State
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedPOId, setSelectedPOId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [grnRemarks, setGrnRemarks] = useState("");
  const [grnItems, setGrnItems] = useState<{ item_id: string; quantity_received: number; rate: number }[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchGoodsReceipts();
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

  async function fetchGoodsReceipts() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/goods-receipts?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setGrns(data.grns || []);
    } catch {
      setError("Failed to load GRN ledger.");
    }
  }

  async function fetchPurchaseOrders() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/purchase-orders?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setPurchaseOrders(data.pos || []);
    } catch {
      console.warn("Failed to load purchase orders for matching.");
    }
  }

  // Handle PO match logic
  useEffect(() => {
    if (selectedPOId) {
      const matchedPO = purchaseOrders.find(po => po.id === selectedPOId);
      if (matchedPO) {
        const autoItems = matchedPO.inventory_po_items.map(pi => {
          const remaining = pi.quantity_ordered - pi.quantity_received;
          return {
            item_id: pi.item_id,
            quantity_received: remaining > 0 ? remaining : 0,
            rate: Number(pi.rate)
          };
        });
        setGrnItems(autoItems);
      }
    } else {
      setGrnItems([]);
    }
  }, [selectedPOId]);

  // Handle Log GRN Submission
  async function handleLogGRN(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedSupplierId || !invoiceNumber || !receiptDate || grnItems.length === 0 || !academicYearId) {
      setError("Please fill out all required fields and add at least one item SKU.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        po_id: selectedPOId || null,
        supplier_id: selectedSupplierId,
        invoice_number: invoiceNumber.trim(),
        receipt_date: receiptDate,
        academic_year_id: academicYearId,
        remarks: grnRemarks,
        items: grnItems.map(itm => ({
          item_id: itm.item_id,
          quantity_received: Number(itm.quantity_received),
          rate: Number(itm.rate)
        }))
      };

      const res = await fetch("/api/inventory/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to inward stock.");

      setSuccess(`Goods Receipt Note logged successfully! Live stock levels updated.`);
      setActiveTab("ledger");
      setSelectedSupplierId("");
      setSelectedPOId("");
      setInvoiceNumber("");
      setGrnRemarks("");
      setGrnItems([]);
      fetchGoodsReceipts();
      fetchPurchaseOrders();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Filter approved POs matching selected supplier
  const filteredPOOptions = purchaseOrders.filter(po => 
    po.supplier_id === selectedSupplierId && 
    (po.status === "Approved" || po.status === "Partially Received")
  );

  // Helper: Manage GRN Items list manually if not matching a PO
  function addGRNItem(itemId: string) {
    if (!itemId) return;
    if (grnItems.some(i => i.item_id === itemId)) return;
    setGrnItems([...grnItems, { item_id: itemId, quantity_received: 10, rate: 0 }]);
  }

  function updateGRNItemQty(itemId: string, qty: number) {
    setGrnItems(grnItems.map(i => i.item_id === itemId ? { ...i, quantity_received: qty } : i));
  }

  function updateGRNItemRate(itemId: string, rate: number) {
    setGrnItems(grnItems.map(i => i.item_id === itemId ? { ...i, rate } : i));
  }

  function removeGRNItem(itemId: string) {
    setGrnItems(grnItems.filter(i => i.item_id !== itemId));
  }

  const grnCalculatedTotal = grnItems.reduce((acc, itm) => acc + (itm.quantity_received * itm.rate), 0);

  const filteredGRNs = grns.filter(grn => {
    const matchesSearch =
      grn.grn_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grn.inventory_suppliers.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Goods Receipts (GRN)</h2>
          <p className="text-slate-500 text-xs mt-1">Inward physical stock delivery, match items against approved Purchase Orders, and update catalog inventory levels</p>
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
          { key: "ledger", label: "GRN Inflow Ledger", icon: ClipboardList },
          { key: "log", label: "Inward New Stock", icon: Plus },
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Loader2 className="w-8 h-8 text-[#4DA8DA] animate-spin" />
          <span className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">Loading Goods Receipts...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: LEDGER */}
          {activeTab === "ledger" && (
            <>
              {/* Filter */}
              <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:bg-white border border-slate-200 focus:border-[#4DA8DA] transition-all"
                    placeholder="Search by GRN number, supplier name or invoice..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">GRN Number</th>
                        <th className="px-6 py-4">PO Number</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4">Invoice No</th>
                        <th className="px-6 py-4">Receipt Date</th>
                        <th className="px-6 py-4">Total Amount</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredGRNs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">No goods receipts found in ledger</td>
                        </tr>
                      ) : (
                        filteredGRNs.map(grn => (
                          <tr key={grn.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-[#1E5F8A]">{grn.grn_number}</td>
                            <td className="px-6 py-4 font-mono text-slate-500">{grn.po_id ? purchaseOrders.find(po => po.id === grn.po_id)?.po_number || "Linked" : "Direct Inward"}</td>
                            <td className="px-6 py-4 font-semibold text-slate-800">{grn.inventory_suppliers.supplier_name}</td>
                            <td className="px-6 py-4 font-semibold text-slate-600">{grn.invoice_number}</td>
                            <td className="px-6 py-4 text-slate-550 font-medium">
                              {new Date(grn.receipt_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-6 py-4 font-black text-[#4DA8DA]">₹{Number(grn.total_amount).toLocaleString("en-IN")}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedGRN(grn)}
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

          {/* TAB 2: LOG NEW GRN */}
          {activeTab === "log" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form config panel */}
              <div className="lg:col-span-1">
                <form onSubmit={handleLogGRN} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4.5 h-4.5 text-[#4DA8DA]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Inflow Specifications</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Log Goods Inward</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Supplier *</label>
                    <select
                      className={inputClass}
                      value={selectedSupplierId}
                      onChange={e => {
                        setSelectedSupplierId(e.target.value);
                        setSelectedPOId("");
                      }}
                      required
                    >
                      <option value="" disabled>Select Supplier</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.supplier_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Match with Purchase Order (Optional)</label>
                    <select
                      className={inputClass}
                      value={selectedPOId}
                      onChange={e => setSelectedPOId(e.target.value)}
                      disabled={!selectedSupplierId}
                    >
                      <option value="">No PO (Direct Inward Stock)</option>
                      {filteredPOOptions.map(po => (
                        <option key={po.id} value={po.id}>{po.po_number}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 font-semibold mt-1">Select a PO to automatically populate the inward items checklists.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Invoice Number *</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="e.g. INV-1092"
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Receipt Date *</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={receiptDate}
                        onChange={e => setReceiptDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Receipt Remarks</label>
                    <textarea
                      className={`${inputClass} h-16 resize-none`}
                      placeholder="Add stock condition, shortages or transport logs..."
                      value={grnRemarks}
                      onChange={e => setGrnRemarks(e.target.value)}
                    />
                  </div>

                  {/* Calculated Price display */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Calculated GRN Total</span>
                    <span className="text-2xl font-black text-[#4DA8DA]">₹{grnCalculatedTotal.toLocaleString("en-IN")}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSupplierId || !invoiceNumber || grnItems.length === 0}
                    className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      "Confirm Goods Inward"
                    )}
                  </button>
                </form>
              </div>

              {/* Items List Editor */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-800">Inward Items Checklist</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Set physical counts received and rate contracts</p>
                    </div>
                    {!selectedPOId && (
                      <div className="w-64 relative">
                        <select
                          className={inputClass}
                          value=""
                          onChange={e => addGRNItem(e.target.value)}
                        >
                          <option value="" disabled>+ Add Item SKU to list</option>
                          {items.map(itm => (
                            <option key={itm.id} value={itm.id}>
                              {itm.item_name} [{itm.item_code}]
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {grnItems.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                      <Plus className="w-8 h-8 text-slate-350 mb-2" />
                      <p className="text-xs font-semibold text-slate-500">Checklist is empty</p>
                      {selectedPOId ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">The matched PO has no pending items to inward.</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">Add items from the dropdown on the top right, or select a Purchase Order to load items automatically.</p>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden font-medium">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                            <th className="px-4 py-3">Item Name [SKU]</th>
                            <th className="px-4 py-3">Received Qty</th>
                            <th className="px-4 py-3">Rate (₹)</th>
                            <th className="px-4 py-3">Subtotal</th>
                            {!selectedPOId && <th className="px-4 py-3 text-right">Remove</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {grnItems.map(itm => {
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
                                    value={itm.quantity_received}
                                    onChange={e => updateGRNItemQty(itm.item_id, Number(e.target.value))}
                                    min={1}
                                    required
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold"
                                    value={itm.rate === 0 ? "" : itm.rate}
                                    onChange={e => updateGRNItemRate(itm.item_id, Number(e.target.value))}
                                    min={0}
                                    step="any"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  ₹{(itm.quantity_received * itm.rate).toLocaleString("en-IN")}
                                </td>
                                {!selectedPOId && (
                                  <td className="px-4 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeGRNItem(itm.item_id)}
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
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

      {/* GRN DETAIL VIEW MODAL */}
      {selectedGRN && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Goods Receipt Note (GRN) details</span>
                <h2 className="text-base font-black text-slate-800 mt-0.5">{selectedGRN.grn_number}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Supplier: {selectedGRN.inventory_suppliers.supplier_name}</p>
              </div>
              <button
                onClick={() => setSelectedGRN(null)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block mb-0.5">Total Amount</span>
                  <span className="font-black text-[#4DA8DA] text-sm">₹{Number(selectedGRN.total_amount).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Invoice Number</span>
                  <span className="text-slate-700 font-bold">{selectedGRN.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Date Inwarded</span>
                  <span className="text-slate-700">{new Date(selectedGRN.receipt_date).toLocaleDateString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Linked PO</span>
                  <span className="text-slate-700 font-mono font-bold">
                    {selectedGRN.po_id ? purchaseOrders.find(po => po.id === selectedGRN.po_id)?.po_number || "Yes" : "None (Direct)"}
                  </span>
                </div>
              </div>

              {selectedGRN.remarks && (
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1">Remarks:</span>
                  {selectedGRN.remarks}
                </div>
              )}

              {/* Items checklist */}
              <div className="space-y-2 font-medium">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inflowed Items Checklist:</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px] sticky top-0">
                        <th className="px-4 py-3">Item Details</th>
                        <th className="px-4 py-3">Rate (₹)</th>
                        <th className="px-4 py-3">Qty Received</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGRN.inventory_grn_items.map(gi => (
                        <tr key={gi.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{gi.inventory_items.item_name}</div>
                            <div className="text-[9px] font-mono text-slate-400">{gi.inventory_items.item_code}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-650">₹{Number(gi.rate).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{gi.quantity_received}</td>
                          <td className="px-4 py-3 text-slate-400">{gi.inventory_items.unit}</td>
                          <td className="px-4 py-3 font-black text-slate-700">₹{Number(gi.amount).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-end">
              <button
                onClick={() => setSelectedGRN(null)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
