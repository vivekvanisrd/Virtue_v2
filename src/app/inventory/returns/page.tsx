"use client";

import { useState, useEffect } from "react";
import {
  Search, CheckCircle, AlertTriangle, Loader2, Sparkles, User,
  Plus, Trash2, History, RefreshCw, Undo, HelpCircle, ShieldCheck
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

type ClassSection = {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
};

type Student = {
  id: string;
  name: string;
  admissionNo: string;
  classId: string;
  sectionId: string;
};

type ReturnRecord = {
  id: string;
  return_date: string;
  return_type: string;
  student_id: string | null;
  remarks: string | null;
  created_by: string;
  inventory_return_items: {
    quantity: number;
    status: string;
    exchange_quantity: number | null;
    inventory_items: {
      item_code: string;
      item_name: string;
      unit: string;
    };
    exchange_item: {
      item_code: string;
      item_name: string;
      unit: string;
    } | null;
  }[];
};

type DraftReturnItem = {
  item_id: string;
  quantity: number;
  status: "Restocked" | "Damaged/Discarded";
  exchange_item_id?: string;
  exchange_quantity?: number;
  isExchange: boolean;
  unit_price: number; // for refund calc
};

export default function ReturnsPage() {
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");

  // Return Transaction Form
  const [returnType, setReturnType] = useState<"Student" | "Walk-in">("Student");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [remarks, setRemarks] = useState("");
  
  // Return items draft list
  const [returnItems, setReturnItems] = useState<DraftReturnItem[]>([]);
  
  // Ledger refund state
  const [refundLedger, setRefundLedger] = useState(false);

  // Return Logs History
  const [returnsHistory, setReturnsHistory] = useState<ReturnRecord[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchHistory();
    }
  }, [academicYearId]);

  async function fetchMetadata() {
    setLoading(true);
    try {
      const itemRes = await fetch("/api/inventory/items");
      const itemData = await itemRes.json();
      if (itemRes.ok) setItems(itemData.items || []);

      const metaRes = await fetch("/api/inventory/metadata");
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        setAcademicYears(metaData.academicYears || []);
        setClasses(metaData.classes || []);
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

  async function fetchHistory() {
    if (!academicYearId) return;
    try {
      const res = await fetch(`/api/inventory/returns?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setReturnsHistory(data.returns || []);
    } catch {
      console.warn("Failed to load returns history logs.");
    }
  }

  // Load students roster
  useEffect(() => {
    if (returnType === "Student") {
      loadStudents();
    }
  }, [selectedClassId, selectedSectionId, studentSearch, returnType]);

  async function loadStudents() {
    if (!selectedClassId && !studentSearch) {
      setStudents([]);
      return;
    }
    setSearchingStudents(true);
    try {
      let url = `/api/inventory/metadata?students=true&classId=${selectedClassId}&sectionId=${selectedSectionId}`;
      if (studentSearch) {
        url += `&q=${encodeURIComponent(studentSearch)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setStudents(data.students || []);
    } catch {
      console.warn("Failed to load students list.");
    } finally {
      setSearchingStudents(false);
    }
  }

  // Form Submit Handler
  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (returnType === "Student" && !selectedStudentId) {
      setError("Please select a student record.");
      return;
    }

    if (returnItems.length === 0) {
      setError("Please add at least one item being returned.");
      return;
    }

    setSubmitting(true);
    try {
      const totalRefund = returnItems.reduce((acc, itm) => acc + (itm.quantity * itm.unit_price), 0);
      const payload = {
        return_date: new Date().toISOString().split("T")[0],
        return_type: returnType,
        student_id: returnType === "Student" ? selectedStudentId : null,
        academic_year_id: academicYearId,
        remarks: remarks || `Customer ${returnType.toLowerCase()} return desk`,
        refund_ledger: returnType === "Student" ? refundLedger : false,
        refund_amount: refundLedger ? totalRefund : 0,
        items: returnItems.map(itm => ({
          item_id: itm.item_id,
          quantity: itm.quantity,
          status: itm.status,
          exchange_item_id: itm.isExchange ? itm.exchange_item_id : null,
          exchange_quantity: itm.isExchange ? itm.exchange_quantity : null,
        })),
      };

      const res = await fetch("/api/inventory/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "INSUFFICIENT_EXCHANGE_STOCK") {
          const detailStr = data.details.map((d: any) => `${d.itemName} (Available: ${d.available}, Requested: ${d.requested})`).join(", ");
          throw new Error(`Insufficient stock for exchange items: ${detailStr}`);
        }
        throw new Error(data.error || "Failed to submit return.");
      }

      setSuccess("Return transaction logged successfully! Stock levels updated.");
      setReturnItems([]);
      setSelectedStudentId("");
      setRemarks("");
      setRefundLedger(false);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Draft List Helpers
  function addReturnDraftItem(itemId: string) {
    if (!itemId) return;
    if (returnItems.some(i => i.item_id === itemId)) return;
    setReturnItems([...returnItems, {
      item_id: itemId,
      quantity: 1,
      status: "Restocked",
      isExchange: false,
      unit_price: 0
    }]);
  }

  function updateReturnQty(itemId: string, qty: number) {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { ...i, quantity: qty } : i));
  }

  function updateReturnStatus(itemId: string, status: "Restocked" | "Damaged/Discarded") {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { ...i, status } : i));
  }

  function toggleExchangeItem(itemId: string, isExchange: boolean) {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { 
      ...i, 
      isExchange, 
      exchange_item_id: isExchange ? "" : undefined, 
      exchange_quantity: isExchange ? 1 : undefined 
    } : i));
  }

  function setExchangeItemId(itemId: string, exchange_item_id: string) {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { ...i, exchange_item_id } : i));
  }

  function setExchangeItemQty(itemId: string, exchange_quantity: number) {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { ...i, exchange_quantity } : i));
  }

  function setRefundUnitPrice(itemId: string, price: number) {
    setReturnItems(returnItems.map(i => i.item_id === itemId ? { ...i, unit_price: price } : i));
  }

  function removeReturnDraftItem(itemId: string) {
    setReturnItems(returnItems.filter(i => i.item_id !== itemId));
  }

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-55/35 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading returns desk...</p>
      </div>
    );
  }

  const calculatedTotalRefund = returnItems.reduce((acc, itm) => acc + (itm.quantity * itm.unit_price), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Returns & Exchanges Desk</h2>
          <p className="text-slate-500 text-xs mt-1">Process textbook returns, uniform size swaps, and log student ledger reversals</p>
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

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
        {[
          { key: "create", label: "Log Return / Exchange", icon: Undo },
          { key: "history", label: "Returns History Log", icon: History },
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
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-55/35"
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
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> {success}
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" /> {error}
        </div>
      )}

      {/* Tab Contents */}
      <div className="space-y-6">

        {/* ── Tab 1: Log Return / Exchange ── */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form Column */}
            <div className="lg:col-span-1 space-y-4">
              <form onSubmit={handleSubmitReturn} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <Undo className="w-4.5 h-4.5 text-[#4DA8DA]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Return Details</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer context</p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Customer Group</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => { setReturnType("Student"); setSelectedStudentId(""); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        returnType === "Student" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReturnType("Walk-in"); setSelectedStudentId(""); setRefundLedger(false); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        returnType === "Walk-in" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      Walk-in
                    </button>
                  </div>
                </div>

                {returnType === "Student" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Class / Grade</label>
                        <select
                          className={inputClass}
                          value={selectedClassId}
                          onChange={e => {
                            setSelectedClassId(e.target.value);
                            setSelectedSectionId("");
                            setSelectedStudentId("");
                          }}
                        >
                          <option value="">All Classes</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Section</label>
                        <select
                          className={inputClass}
                          value={selectedSectionId}
                          onChange={e => {
                            setSelectedSectionId(e.target.value);
                            setSelectedStudentId("");
                          }}
                          disabled={!selectedClassId}
                        >
                          <option value="">All Sections</option>
                          {classes.find(c => c.id === selectedClassId)?.sections.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Search Student</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Enter student name..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Select Student *</label>
                      <select
                        className={inputClass}
                        value={selectedStudentId}
                        onChange={e => setSelectedStudentId(e.target.value)}
                        required
                        disabled={searchingStudents}
                      >
                        <option value="" disabled>Select Student</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.admissionNo})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className={labelClass}>Remarks / Reasons</label>
                  <textarea
                    rows={2}
                    className={inputClass}
                    placeholder="E.g., Size swap or wrong kit issued..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>

                {/* Ledger reversal options */}
                {returnType === "Student" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Ledger Reversal</span>
                        <span className="text-[10px] text-slate-400 font-medium">Issue credit note to tuition balance</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={refundLedger}
                          onChange={e => setRefundLedger(e.target.checked)}
                          disabled={calculatedTotalRefund <= 0}
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4DA8DA]"></div>
                      </label>
                    </div>
                    {refundLedger && (
                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Total Credit Value:</span>
                        <span className="font-black text-[#4DA8DA] text-sm">₹{calculatedTotalRefund.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || (returnType === "Student" && !selectedStudentId) || returnItems.length === 0}
                  className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Return Session"}
                </button>
              </form>
            </div>

            {/* Items Listing/Configurator Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Returned items</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure return status and exchange replacement swaps</p>
                  </div>
                  <div className="w-64 relative">
                    <select
                      className={inputClass}
                      value=""
                      onChange={e => addReturnDraftItem(e.target.value)}
                    >
                      <option value="" disabled>+ Add Item being returned</option>
                      {items.map(itm => (
                        <option key={itm.id} value={itm.id}>
                          {itm.item_name} [{itm.item_code}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {returnItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                    <Undo className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">No items added</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Choose products returned by the parent from the dropdown on the top right.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returnItems.map(itm => {
                      const dbItem = items.find(i => i.id === itm.item_id);
                      return (
                        <div key={itm.item_id} className="border border-slate-200 rounded-2xl p-4 space-y-4 bg-slate-50/20">
                          {/* Item header */}
                          <div className="flex items-start justify-between border-b border-slate-100 pb-2.5 gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{dbItem?.item_name}</h4>
                              <p className="text-[9px] font-mono text-slate-400">{dbItem?.item_code} • {dbItem?.unit}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeReturnDraftItem(itm.item_id)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            {/* Qty returned */}
                            <div>
                              <label className={labelClass}>Quantity Returned</label>
                              <input
                                type="number"
                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold"
                                value={itm.quantity}
                                onChange={e => updateReturnQty(itm.item_id, Number(e.target.value))}
                                min={1}
                                required
                              />
                            </div>

                            {/* Status Condition */}
                            <div>
                              <label className={labelClass}>Stock Destination</label>
                              <select
                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold"
                                value={itm.status}
                                onChange={e => updateReturnStatus(itm.item_id, e.target.value as any)}
                              >
                                <option value="Restocked">Restock (Add to Live)</option>
                                <option value="Damaged/Discarded">Damaged (Discard)</option>
                              </select>
                            </div>

                            {/* Refund rate per unit */}
                            {returnType === "Student" && refundLedger && (
                              <div>
                                <label className={labelClass}>Refund Unit Price (₹)</label>
                                <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold animate-fade-in"
                                  value={itm.unit_price}
                                  onChange={e => setRefundUnitPrice(itm.item_id, Number(e.target.value))}
                                  min={0}
                                  required
                                />
                              </div>
                            )}

                            {/* Exchange Switch */}
                            <div className="flex flex-col justify-end pb-1.5">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-500 text-[11px] leading-none">
                                <input
                                  type="checkbox"
                                  className="rounded text-[#4DA8DA] border-slate-300 focus:ring-[#4DA8DA]"
                                  checked={itm.isExchange}
                                  onChange={e => toggleExchangeItem(itm.item_id, e.target.checked)}
                                />
                                Exchange size / Swap SKU
                              </label>
                            </div>
                          </div>

                          {/* Exchange Config Section */}
                          {itm.isExchange && (
                            <div className="bg-sky-50/30 border border-sky-100/40 rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3.5 animate-scale-in text-xs font-semibold">
                              <div>
                                <label className="block text-[9px] font-bold text-sky-950 uppercase tracking-widest mb-1">Swap Replacement SKU *</label>
                                <select
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-sky-950"
                                  value={itm.exchange_item_id || ""}
                                  onChange={e => setExchangeItemId(itm.item_id, e.target.value)}
                                  required
                                >
                                  <option value="" disabled>Select swap item</option>
                                  {items.map(i => (
                                    <option key={i.id} value={i.id}>{i.item_name} [{i.item_code}]</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-sky-950 uppercase tracking-widest mb-1">Exchange Out Qty</label>
                                <input
                                  type="number"
                                  className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-sky-950"
                                  value={itm.exchange_quantity || 1}
                                  onChange={e => setExchangeItemQty(itm.item_id, Number(e.target.value))}
                                  min={1}
                                  required
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Returns History Log ── */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">Session Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Student ID (Ref)</th>
                    <th className="px-6 py-4">Returned Items Detail</th>
                    <th className="px-6 py-4">Remarks</th>
                    <th className="px-6 py-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {returnsHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No returned records logged</td>
                    </tr>
                  ) : (
                    returnsHistory.map(ret => (
                      <tr key={ret.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                          {new Date(ret.return_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                            ret.return_type === "Student"
                              ? "bg-[#4DA8DA]/10 text-[#4DA8DA] border-[#4DA8DA]/25"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {ret.return_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-500 truncate max-w-[120px]">
                          {ret.student_id || "Walk-in Customer"}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-col gap-1.5">
                            {ret.inventory_return_items.map((ri, idx) => (
                              <div key={idx} className="text-slate-650 flex flex-col">
                                <span>
                                  • {ri.inventory_items?.item_name} x <strong>{ri.quantity}</strong> ({ri.status})
                                </span>
                                {ri.exchange_item && (
                                  <span className="text-[10px] text-sky-600 font-bold ml-3.5 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin-slow" /> Swapped for: {ri.exchange_item.item_name} x {ri.exchange_quantity}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{ret.remarks || "—"}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                          {ret.created_by.slice(0, 10)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
