"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  Loader2,
  History,
  Calendar,
  CreditCard,
  User,
  ArrowRight,
  TrendingUp,
  Coins
} from "lucide-react";

type PaymentRecord = {
  id: string;
  payment_date: string;
  amount_paid: number;
  payment_mode: string;
  reference_number: string | null;
  remarks: string | null;
  created_by: string;
  inventory_suppliers: {
    supplier_name: string;
    contact_person: string | null;
    phone: string | null;
  };
};

type SupplierSummary = {
  supplier_id: string;
  supplier_name: string;
  contact_person: string | null;
  phone: string | null;
  total_grn_amount: number;
  total_paid_amount: number;
  outstanding_balance: number;
};

type AcademicYear = {
  id: string;
  name: string;
  isCurrent: boolean;
};

const PAYMENT_MODES = ["Bank Transfer", "UPI", "Cheque", "Cash", "Draft"];

export default function SupplierPaymentsPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  
  // Data lists
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModeFilter, setSelectedModeFilter] = useState("All");

  // Modal / Payment form states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      fetchPaymentsAndSummary();
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

  async function fetchPaymentsAndSummary() {
    if (!academicYearId) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/inventory/suppliers/payments?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (res.ok) {
        setPaymentHistory(data.payments || []);
        setSupplierSummary(data.summary || []);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load supplier payment ledgers.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenPaymentModal(supplierId: string = "") {
    setError("");
    setSuccess("");
    setSelectedSupplierId(supplierId);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setAmountPaid("");
    setPaymentMode(PAYMENT_MODES[0]);
    setReferenceNumber("");
    setRemarks("");
    setIsOpen(true);
  }

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedSupplierId) {
      setError("Please select a supplier.");
      return;
    }

    const payVal = Number(amountPaid);
    if (isNaN(payVal) || payVal <= 0) {
      setError("Amount paid must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/suppliers/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          payment_date: paymentDate,
          amount_paid: payVal,
          payment_mode: paymentMode,
          reference_number: referenceNumber.trim() || null,
          remarks: remarks.trim() || null,
          academic_year_id: academicYearId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit supplier payment.");
      }

      setSuccess("Supplier payment logged successfully!");
      setIsOpen(false);
      fetchPaymentsAndSummary();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Aggregate Metrics
  const totalGRNInvoiced = supplierSummary.reduce((acc, curr) => acc + curr.total_grn_amount, 0);
  const totalPaidToSuppliers = supplierSummary.reduce((acc, curr) => acc + curr.total_paid_amount, 0);
  const totalOutstandingAP = supplierSummary.reduce((acc, curr) => acc + curr.outstanding_balance, 0);

  // Filters & Searches
  const filteredSummary = supplierSummary.filter(sup =>
    searchQuery === "" ||
    sup.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sup.contact_person && sup.contact_person.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredHistory = paymentHistory.filter(pay => {
    const matchesSearch =
      searchQuery === "" ||
      pay.inventory_suppliers?.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pay.reference_number && pay.reference_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMode = selectedModeFilter === "All" || pay.payment_mode === selectedModeFilter;

    return matchesSearch && matchesMode;
  });

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";

  if (loading && supplierSummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#4DA8DA]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Compiling accounts payable...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Supplier Payments (AP)</h2>
          <p className="text-slate-500 text-xs mt-1">Manage accounts payable, record supplier bank disbursements, and check outstanding procurement balances</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Total Outstanding Payable */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-6 rounded-3xl border border-slate-800 text-white flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Accounts Payable Balance</span>
            <span className="text-3xl font-black text-[#4DA8DA]">₹{totalOutstandingAP.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Total outstanding supplier due</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Coins className="w-6 h-6 text-[#4DA8DA]" />
          </div>
        </div>

        {/* Metric 2: Total Disbursements Paid */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Paid Disbursements (YTD)</span>
            <span className="text-3xl font-black text-slate-800">₹{totalPaidToSuppliers.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">Disbursed to bank/UPI accounts</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Metric 3: Total Purchases (GRNs) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-sans">Total Procurement Value</span>
            <span className="text-3xl font-black text-slate-800">₹{totalGRNInvoiced.toLocaleString("en-IN")}</span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-1">Sum of active Goods Receipts (GRN)</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 gap-4">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { key: "summary", label: "Supplier Balances (AP)", icon: Receipt },
            { key: "history", label: "Disbursement History Logs", icon: History },
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
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 rounded-t-xl flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-[#4DA8DA] text-[#4DA8DA] bg-sky-50/20"
                    : "border-transparent text-slate-400 hover:text-slate-650"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleOpenPaymentModal()}
          className="bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#4DA8DA]/10 self-start sm:self-auto mb-2"
        >
          <Plus className="w-4 h-4" /> Record Supplier Payment
        </button>
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

      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex-1 relative">
          <input
            type="text"
            className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all font-semibold"
            placeholder={
              activeTab === "summary"
                ? "Search suppliers by name..."
                : "Search by supplier name or reference..."
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
        </div>

        {activeTab === "history" && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Payment Mode:</label>
            <select
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4DA8DA]"
              value={selectedModeFilter}
              onChange={e => setSelectedModeFilter(e.target.value)}
            >
              <option value="All">All Modes</option>
              {PAYMENT_MODES.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">

        {/* ── TAB 1: Balances AP Summary Grid ── */}
        {activeTab === "summary" && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="px-6 py-4">Supplier name</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4 text-right">Total GRN (Purchases)</th>
                    <th className="px-6 py-4 text-right">Total Disbursed (Paid)</th>
                    <th className="px-6 py-4 text-right">Outstanding balance</th>
                    <th className="px-6 py-4 text-right">AP Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                  {filteredSummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold">
                        No suppliers with active invoice summary
                      </td>
                    </tr>
                  ) : (
                    filteredSummary.map(sup => {
                      const balance = sup.outstanding_balance;
                      let badge = (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[9px]">
                          Settled
                        </span>
                      );

                      if (balance > 0) {
                        badge = (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[9px] animate-pulse">
                            Payable
                          </span>
                        );
                      }

                      return (
                        <tr key={sup.supplier_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {sup.supplier_name}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            <div className="flex flex-col">
                              <span>{sup.contact_person || "—"}</span>
                              <span className="text-[10px] font-mono">{sup.phone || "No phone"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-800">
                            ₹{sup.total_grn_amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                            ₹{sup.total_paid_amount.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-right font-black text-slate-850 text-sm">
                            ₹{balance.toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {badge}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(sup.supplier_id)}
                              disabled={balance <= 0}
                              className="bg-slate-50 border border-slate-200 hover:border-[#4DA8DA] hover:text-[#4DA8DA] disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-400 text-slate-650 px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              Disburse Payment <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: Payment logs ── */}
        {activeTab === "history" && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                    <th className="px-6 py-4">Payment date</th>
                    <th className="px-6 py-4">Supplier name</th>
                    <th className="px-6 py-4">Amount disbursed</th>
                    <th className="px-6 py-4">Payment mode</th>
                    <th className="px-6 py-4">Reference txn id</th>
                    <th className="px-6 py-4">Remarks / Notes</th>
                    <th className="px-6 py-4">Logged by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No supplier disbursements logged in audit history
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map(pay => (
                      <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800 whitespace-nowrap">
                          {new Date(pay.payment_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {pay.inventory_suppliers?.supplier_name}
                        </td>
                        <td className="px-6 py-4 text-emerald-600 font-black text-sm">
                          ₹{Number(pay.amount_paid).toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-bold">
                          <span className="bg-slate-50 border border-slate-250/60 px-2 py-0.5 rounded-full text-[10px]">
                            {pay.payment_mode}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-550 truncate max-w-[150px]">
                          {pay.reference_number || "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate font-medium">
                          {pay.remarks || "—"}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-400 uppercase text-[9px] tracking-wider">
                          {pay.created_by.slice(0, 10)}...
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

      {/* Record Payment Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                  <Coins className="w-4.5 h-4.5 text-[#4DA8DA]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Record supplier payment</h3>
                  <p className="text-[9px] text-slate-450 uppercase font-black tracking-widest">Disburse accounts payable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Select Supplier */}
              <div>
                <label className={labelClass}>Supplier *</label>
                <select
                  className={inputClass}
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Supplier</option>
                  {supplierSummary.map(sup => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>
                      {sup.supplier_name} (Balance: ₹{sup.outstanding_balance.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className={labelClass}>Amount Paid (INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputClass}
                  placeholder="E.g., 5000"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  required
                />
              </div>

              {/* Mode & Date Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Payment Mode *</label>
                  <select
                    className={inputClass}
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    required
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Payment Date *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className={labelClass}>Reference Number (Txn ID)</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="UTR Number / Cheque Number / Transaction Hash"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                />
              </div>

              {/* Remarks */}
              <div>
                <label className={labelClass}>Remarks / Notes</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="Log bank details or voucher reference remarks..."
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedSupplierId || !amountPaid}
                className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#4DA8DA]/10"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Log Payment Record"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
