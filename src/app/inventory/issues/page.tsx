"use client";

import { useState, useEffect } from "react";
import {
  Search, CheckCircle, AlertTriangle, Loader2, Sparkles, User, Users,
  BookOpen, Plus, Trash2, History, Calendar, HelpCircle, FileText, ArrowRight, ShieldCheck, CheckCircle2, QrCode
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

type IssueRecord = {
  id: string;
  issue_date: string;
  issue_type: string;
  student_id: string | null;
  class_id: string | null;
  remarks: string | null;
  created_by: string;
  inventory_issue_items: {
    quantity: number;
    inventory_items: {
      item_code: string;
      item_name: string;
      unit: string;
    };
  }[];
};

type ReservationItem = {
  id: string;
  item_id: string;
  quantity: number;
  status: string;
  item_code: string;
  item_name: string;
  unit: string;
};

type PaymentLink = {
  token: string;
  student_name: string;
  parent_name: string;
  phone: string;
  amount: number;
  description: string;
  status: string;
  paid_at: string | null;
  razorpay_payment_id: string | null;
  payment_method: string | null;
  payment_details: string | null;
};

export default function IssuesPage() {
  const [activeTab, setActiveTab] = useState<"online" | "student" | "class" | "history">("online");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");

  // Tab 1: Fulfill Online Order
  const [tokenInput, setTokenInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentLink | null>(null);
  const [reservedItems, setReservedItems] = useState<ReservationItem[]>([]);

  // Tab 2: Manual Student Issue
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [issueItems, setIssueItems] = useState<{ item_id: string; quantity: number; unit_price?: number }[]>([]);
  const [isCreditIssue, setIsCreditIssue] = useState(false);

  // Tab 3: Class-wise Issue
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkSectionId, setBulkSectionId] = useState("");
  const [bulkItems, setBulkItems] = useState<{ item_id: string; quantity: number }[]>([]);

  // Tab 4: History Logs
  const [issuesHistory, setIssuesHistory] = useState<IssueRecord[]>([]);

  useEffect(() => {
    fetchMetadata();
    fetchHistory();
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
      const res = await fetch(`/api/inventory/issues?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) setIssuesHistory(data.issues || []);
    } catch {
      console.warn("Failed to load issue history logs.");
    }
  }

  // Fetch student roster dynamically when searching or changing class/section filters
  useEffect(() => {
    if (activeTab === "student") {
      loadStudents();
    }
  }, [selectedClassId, selectedSectionId, studentSearch, activeTab]);

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

  // Tab 1: Lookup Online Receipt Token
  async function handleLookupOnlineReceipt(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!tokenInput.trim()) return;

    setError("");
    setSuccess("");
    setPaymentDetails(null);
    setReservedItems([]);
    setLookupLoading(true);

    try {
      const res = await fetch(`/api/inventory/issues/fulfill?token=${tokenInput.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      setPaymentDetails(data.paymentLink);
      setReservedItems(data.reservations || []);
    } catch (err: any) {
      setError(err.message || "Could not find a valid payment record matching this token.");
    } finally {
      setLookupLoading(false);
    }
  }

  // Tab 1: Fulfill Online Receipt
  async function handleFulfillOnlineReceipt() {
    if (!paymentDetails || reservedItems.length === 0 || !academicYearId) return;

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/inventory/issues/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: paymentDetails.token,
          academic_year_id: academicYearId,
          remarks: `Counter fulfillment of online Bookstore purchase Ref: ${paymentDetails.token}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fulfillment transaction failed.");

      setSuccess(`Online order for student ${paymentDetails.student_name} fulfilled successfully! Live stock updated.`);
      setPaymentDetails(null);
      setReservedItems([]);
      setTokenInput("");
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during fulfillment.");
    } finally {
      setSubmitting(false);
    }
  }

  // Tab 2: Manual Student Issue Submit
  async function handleManualStudentIssue(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedStudentId || issueItems.length === 0 || !academicYearId) {
      setError("Please select a student and add at least one item SKU.");
      return;
    }

    setSubmitting(true);
    try {
      const totalCharge = issueItems.reduce((acc, itm) => acc + (itm.quantity * (itm.unit_price || 0)), 0);
      const payload = {
        issue_date: new Date().toISOString().split("T")[0],
        issue_type: "Student",
        student_id: selectedStudentId,
        class_id: selectedClassId || null,
        section_id: selectedSectionId || null,
        academic_year_id: academicYearId,
        items: issueItems.map(itm => ({
          item_id: itm.item_id,
          quantity: itm.quantity,
          unit_price: isCreditIssue ? (itm.unit_price || 0) : 0
        })),
        is_credit_issue: isCreditIssue,
        charge_amount: isCreditIssue ? totalCharge : 0,
        remarks: isCreditIssue 
          ? `Bookstore credit issue. Charged ₹${totalCharge} to student ledger.`
          : "Manual student bookstore distribution",
      };

      const res = await fetch("/api/inventory/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error === "INSUFFICIENT_STOCK") {
          const detailStr = data.details.map((d: any) => `${d.itemName} (Available: ${d.available}, Requested: ${d.requested})`).join(", ");
          throw new Error(`Insufficient stock for: ${detailStr}`);
        }
        throw new Error(data.error || "Failed to log issue.");
      }

      setSuccess(isCreditIssue 
        ? `Manual stock issue saved successfully and posted ₹${totalCharge} charge to student ledger!`
        : "Manual stock issue saved successfully!"
      );
      setIssueItems([]);
      setSelectedStudentId("");
      setIsCreditIssue(false);
      fetchHistory();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Helper: Adding items to manual issue lists
  function addManualIssueItem(itemId: string) {
    if (!itemId) return;
    if (issueItems.some(i => i.item_id === itemId)) return;
    setIssueItems([...issueItems, { item_id: itemId, quantity: 1, unit_price: 0 }]);
  }

  function updateManualIssueItemQty(itemId: string, qty: number) {
    setIssueItems(issueItems.map(i => i.item_id === itemId ? { ...i, quantity: qty } : i));
  }

  function updateManualIssueItemPrice(itemId: string, price: number) {
    setIssueItems(issueItems.map(i => i.item_id === itemId ? { ...i, unit_price: price } : i));
  }

  function removeManualIssueItem(itemId: string) {
    setIssueItems(issueItems.filter(i => i.item_id !== itemId));
  }

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Stock Issues & Distribution</h2>
          <p className="text-slate-500 text-xs mt-1">Verify receipts, fulfill online orders, and issue textbooks/uniforms to students</p>
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
          { key: "online", label: "Verify Online Order", icon: QrCode },
          { key: "student", label: "Manual Issue (Student)", icon: User },
          { key: "history", label: "Distribution Logs", icon: History },
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

        {/* ── Tab 1: Fulfill Online Order ── */}
        {activeTab === "online" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form Column */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <QrCode className="w-4.5 h-4.5 text-[#4DA8DA]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Scan or Enter Token</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bookstore Receipt Lookup</p>
                  </div>
                </div>

                <form onSubmit={handleLookupOnlineReceipt} className="space-y-4">
                  <div>
                    <label className={labelClass}>Receipt Token ID</label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        className={`${inputClass} pl-10`}
                        placeholder="Paste receipt token UUID here..."
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value)}
                        required
                        disabled={lookupLoading || submitting}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={lookupLoading || submitting || !tokenInput.trim()}
                    className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {lookupLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Looking up...
                      </>
                    ) : (
                      "Verify Payment Status"
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Receipt Details Column */}
            <div className="lg:col-span-2 space-y-4">
              {!paymentDetails && !lookupLoading && (
                <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-16 text-center shadow-inner flex flex-col items-center justify-center">
                  <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
                  <h4 className="font-bold text-slate-700">Receipt Verification Desk</h4>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm">Enter the parent checkout receipt token on the left to pull payment status, verify items, and execute inventory stock release.</p>
                </div>
              )}

              {paymentDetails && (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-scale-in">
                  {/* Status Banner */}
                  <div className={`px-6 py-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    paymentDetails.status === "PAID"
                      ? "bg-emerald-50/50 border-emerald-100 text-emerald-800"
                      : "bg-amber-50/50 border-amber-100 text-amber-800"
                  }`}>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
                        {paymentDetails.status === "PAID" ? (
                          <>
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                            Payment Confirmed (PAID)
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
                            Payment Pending
                          </>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Receipt ID: {paymentDetails.token}</p>
                    </div>
                    {paymentDetails.paid_at && (
                      <span className="text-xs font-semibold text-slate-500">
                        Paid: {new Date(paymentDetails.paid_at).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-medium">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Student Name</span>
                        <span className="font-bold text-slate-800">{paymentDetails.student_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Parent Name</span>
                        <span className="font-bold text-slate-800">{paymentDetails.parent_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Parent Phone</span>
                        <span className="font-mono text-slate-700">{paymentDetails.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Amount Paid</span>
                        <span className="font-black text-[#4DA8DA] text-sm">₹{paymentDetails.amount.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    {/* Items Checklist */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Reserved Stock Items Checklist:</h4>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                              <th className="px-4 py-3">Item Code</th>
                              <th className="px-4 py-3">Item Name</th>
                              <th className="px-4 py-3">Quantity</th>
                              <th className="px-4 py-3">Unit</th>
                              <th className="px-4 py-3">Fulfillment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {reservedItems.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3 font-mono text-slate-500">{item.item_code}</td>
                                <td className="px-4 py-3 text-slate-800">{item.item_name}</td>
                                <td className="px-4 py-3 font-bold text-slate-750">{item.quantity}</td>
                                <td className="px-4 py-3 text-slate-400">{item.unit}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    item.status === "Reserved"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Actions */}
                    {paymentDetails.status === "PAID" && reservedItems.some(i => i.status === "Reserved") && (
                      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-sky-950 flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verify & Release Stock
                          </p>
                          <p className="text-[11px] text-sky-700 font-medium">Verify that the correct uniform sizes or grade books are selected and ready for hand-off before clicking Fulfill.</p>
                        </div>
                        <button
                          onClick={handleFulfillOnlineReceipt}
                          disabled={submitting}
                          className="shrink-0 bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-[#4DA8DA]/10 transition-all flex items-center gap-1.5"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                            </>
                          ) : (
                            <>
                              Fulfill & Deduct Stock
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {paymentDetails.status === "PAID" && !reservedItems.some(i => i.status === "Reserved") && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500" /> All items for this payment record have already been fulfilled.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 2: Manual Student Issue ── */}
        {activeTab === "student" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-1 space-y-4">
              <form onSubmit={handleManualStudentIssue} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5 text-[#4DA8DA]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Issue Target</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select Student</p>
                  </div>
                </div>

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
                    placeholder="Enter student name or admission number..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Target Student *</label>
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
                  {searchingStudents && <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin text-[#4DA8DA]" /> Finding students...</p>}
                </div>

                {/* Credit Issue Toggle */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Credit Issue</span>
                      <span className="text-[10px] text-slate-400 font-medium">Charge items directly to student's ledger</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isCreditIssue}
                        onChange={e => setIsCreditIssue(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4DA8DA]"></div>
                    </label>
                  </div>
                  
                  {isCreditIssue && (
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-400">Total Charge:</span>
                      <span className="font-black text-slate-800 text-sm">
                        ₹{issueItems.reduce((acc, itm) => acc + (itm.quantity * (itm.unit_price || 0)), 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedStudentId || issueItems.length === 0}
                  className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Manual Issue"}
                </button>
              </form>
            </div>

            {/* Items Catalog Selector Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Issue Items List</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Select products and configure quantities</p>
                  </div>
                  <div className="w-64 relative">
                    <select
                      className={inputClass}
                      value=""
                      onChange={e => addManualIssueItem(e.target.value)}
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

                {issueItems.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
                    <Plus className="w-8 h-8 text-slate-350 mb-2" />
                    <p className="text-xs font-semibold text-slate-500">List is empty</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select items from the dropdown on the top right to build the issue transaction.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                          <th className="px-4 py-3">Item Code</th>
                          <th className="px-4 py-3">Item Name</th>
                          <th className="px-4 py-3">Quantity</th>
                          {isCreditIssue && <th className="px-4 py-3">Unit Price (₹)</th>}
                          <th className="px-4 py-3">Unit</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {issueItems.map(itm => {
                          const dbItem = items.find(i => i.id === itm.item_id);
                          return (
                            <tr key={itm.item_id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-mono text-slate-500">{dbItem?.item_code}</td>
                              <td className="px-4 py-3 text-slate-800">{dbItem?.item_name}</td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                                  value={itm.quantity}
                                  onChange={e => updateManualIssueItemQty(itm.item_id, Number(e.target.value))}
                                  min={1}
                                  required
                                />
                              </td>
                              {isCreditIssue && (
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                                    value={itm.unit_price || 0}
                                    onChange={e => updateManualIssueItemPrice(itm.item_id, Number(e.target.value))}
                                    min={0}
                                    required
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3 text-slate-400">{dbItem?.unit}</td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeManualIssueItem(itm.item_id)}
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

        {/* ── Tab 3: History logs ── */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">Issue Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Student ID (Ref)</th>
                    <th className="px-6 py-4">Items Summary</th>
                    <th className="px-6 py-4">Remarks</th>
                    <th className="px-6 py-4">Logged By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {issuesHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No issue records found in ledger</td>
                    </tr>
                  ) : (
                    issuesHistory.map(issue => (
                      <tr key={issue.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                          {new Date(issue.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] border ${
                            issue.issue_type === "Student"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {issue.issue_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-500 truncate max-w-[120px]">
                          {issue.student_id || "Class-wise"}
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="flex flex-col gap-0.5">
                            {issue.inventory_issue_items.map((ii, idx) => (
                              <span key={idx} className="text-slate-600">
                                • {ii.inventory_items?.item_name || "Item"} x <strong className="text-slate-800">{ii.quantity}</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{issue.remarks || "—"}</td>
                        <td className="px-6 py-4 font-bold text-slate-500 uppercase text-[9px] tracking-wider">
                          {issue.created_by.slice(0, 8)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {issuesHistory.length > 0 && (
              <div className="px-6 py-3 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-200">
                Showing {issuesHistory.length} transaction entries
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
