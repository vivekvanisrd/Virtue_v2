"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, TrendingUp, Users, CheckCircle2, Clock, BookOpen, Download, ArrowLeft, X, Copy, ExternalLink, Check, FileText, IndianRupee, Loader2 } from "lucide-react";
import Link from "next/link";

type PaymentLinkRecord = {
  id: string; token: string; student_name: string; parent_name: string;
  phone: string; amount: number; description: string | null; pending_items: string | null;
  razorpay_short_url: string | null; status: string; paid_at: string | null;
  feedback_rating: string | null; feedback_note: string | null; created_at: string;
  razorpay_payment_id?: string | null; payment_method?: string | null; payment_details?: string | null;
};

type Summary = { total: number; paid: number; pending: number; totalAmount: number; collected: number };

const EMOJI: Record<string, string> = { GREAT: "😊 Great", OKAY: "😐 Okay", POOR: "😞 Poor" };

function exportCSV(records: PaymentLinkRecord[]) {
  const headers = ["Student Name","Parent Name","Phone","Amount","Status","Transaction ID","Payment Method","Payment Details","Description","Included Items","Created","Paid At","Feedback"];
  const rows = records.map(r => [
    r.student_name, r.parent_name, r.phone, r.amount,
    r.status, r.razorpay_payment_id || "", r.payment_method || "", r.payment_details || "", r.description || "", r.pending_items || "",
    new Date(r.created_at).toLocaleDateString("en-IN"),
    r.paid_at ? new Date(r.paid_at).toLocaleString("en-IN") : "",
    r.feedback_rating ? EMOJI[r.feedback_rating] || r.feedback_rating : "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,"'")}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `fee-payments-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryOwnerDashboardPage() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<PaymentLinkRecord[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<PaymentLinkRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleCopy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fee-link/all?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unauthorized");
      setRecords(data.records);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = records?.filter(r =>
    search === "" ||
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.parent_name.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search)
  ) || [];

  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";
  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";

  if (!records) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Owner Admin Dashboard</h2>
            <p className="text-slate-500 text-xs mt-1">Review Bookstore payment link volumes, Razorpay transaction collections, and customer feedback logs</p>
          </div>
          <div>
            <Link href="/inventory/fee-link" className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-850 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Link Generator
            </Link>
          </div>
        </div>

        <div className="max-w-md mx-auto pt-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
              <Lock className="w-8 h-8 text-[#4DA8DA]" />
            </div>
            <h3 className="text-sm font-black text-slate-800">Secure Access Needed</h3>
            <p className="text-slate-400 text-xs mt-1">Please enter the Owner Admin passcode to view sales ledger</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div>
              <label className={labelClass}>Owner Security Passcode *</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className={`${inputClass} pr-10`}
                  placeholder="Enter owner passcode"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-650"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-[#4DA8DA]/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Identity"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Owner Admin Dashboard</h2>
          <p className="text-slate-500 text-xs mt-1">Review Bookstore payment link volumes, Razorpay transaction collections, and customer feedback logs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(records)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
          >
            <Download className="w-3.5 h-3.5" /> Export Ledger CSV
          </button>
          <button
            onClick={() => {
              setRecords(null);
              setPassword("");
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-650 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            Lock Dashboard
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Sales Links</span>
              <span className="text-3xl font-black text-slate-800">{summary.total}</span>
              <span className="text-[10px] text-slate-400 block mt-1">Generated YTD</span>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 p-6 rounded-3xl border border-slate-800 text-white flex justify-between items-center shadow-sm">
            <div>
              <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block mb-1">Total Collected (Paid)</span>
              <span className="text-3xl font-black text-[#4DA8DA]">₹{summary.collected.toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-slate-400 block mt-1">From {summary.paid} paid orders</span>
            </div>
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#4DA8DA]" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pending Amount</span>
              <span className="text-3xl font-black text-slate-850">₹{(summary.totalAmount - summary.collected).toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-slate-400 block mt-1">From {summary.pending} pending links</span>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Conversion Rate</span>
              <span className="text-3xl font-black text-slate-800">
                {summary.total > 0 ? ((summary.paid / summary.total) * 100).toFixed(1) : 0}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Orders paid vs generated</span>
            </div>
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#4DA8DA]" />
            </div>
          </div>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-800">Bookstore Payments Ledger</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detailed view of student checkout payments</p>
          </div>
          <div className="w-64 relative">
            <input
              type="text"
              className={inputClass}
              placeholder="Search by student, parent, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Parent Info</th>
                <th className="px-4 py-3.5">Book Kit</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Date Created</th>
                <th className="px-4 py-3.5">Feedback</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-450">No payments match filters or search queries</td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.student_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{r.parent_name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{r.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-550 max-w-[120px] truncate" title={r.description || "School Book Kit"}>
                      {r.description || "School Book Kit"}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-bold">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        r.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {r.feedback_rating ? (
                        <span className="text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                          {EMOJI[r.feedback_rating] || r.feedback_rating}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="bg-slate-50 border border-slate-250 hover:border-[#4DA8DA] hover:text-[#4DA8DA] text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
                      >
                        Inspect Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspect Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4.5 h-4.5 text-[#4DA8DA]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">Transaction Details</h3>
                  <p className="text-[9px] text-slate-450 uppercase font-black tracking-widest">Inspect payment information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold uppercase transition-colors"
              >
                Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs font-semibold text-slate-650">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Student Name</span>
                  <span className="text-slate-900 font-bold">{selectedRecord.student_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Parent Name</span>
                  <span className="text-slate-900 font-bold">{selectedRecord.parent_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Phone Number</span>
                  <span className="text-slate-800 font-mono">{selectedRecord.phone}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Amount</span>
                  <span className="text-slate-900 font-black">₹{selectedRecord.amount.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block ${
                    selectedRecord.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selectedRecord.status}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Created Date</span>
                  <span className="text-slate-650">{new Date(selectedRecord.created_at).toLocaleString("en-IN")}</span>
                </div>
              </div>

              {selectedRecord.paid_at && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Payment Date</span>
                    <span className="text-emerald-700 font-black">{new Date(selectedRecord.paid_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Transaction ID</span>
                    <span className="text-slate-800 font-mono">{selectedRecord.razorpay_payment_id || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Payment Method</span>
                    <span className="text-slate-800 uppercase">{selectedRecord.payment_method || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Payment Details</span>
                    <span className="text-slate-800 truncate block max-w-[150px]">{selectedRecord.payment_details || "—"}</span>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedRecord.description && (
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                  <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Description</span>
                  <span className="text-slate-700 font-medium">{selectedRecord.description}</span>
                </div>
              )}

              {/* Included Items list */}
              {selectedRecord.pending_items && (
                <div className="bg-sky-50/30 border border-sky-100 rounded-xl p-3">
                  <span className="text-[9px] text-sky-950/60 uppercase block mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[#FF9933]" /> Included / Pending Items checklist
                  </span>
                  <span className="text-sky-950 font-medium">{selectedRecord.pending_items}</span>
                </div>
              )}

              {/* Feedback Notes */}
              {selectedRecord.feedback_rating && (
                <div className="border-t border-slate-100 pt-3 space-y-1">
                  <span className="text-[9px] text-slate-450 uppercase block font-bold">Customer Feedback Notes</span>
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                    <span>Rating:</span>
                    <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                      {EMOJI[selectedRecord.feedback_rating] || selectedRecord.feedback_rating}
                    </span>
                  </div>
                  {selectedRecord.feedback_note && (
                    <p className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-medium italic text-slate-550 mt-1.5">
                      "{selectedRecord.feedback_note}"
                    </p>
                  )}
                </div>
              )}

              {/* Actions Copy Link */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase">Token: {selectedRecord.token}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(`http://localhost:3000/fee-pay/${selectedRecord.token}`, "link")}
                    className="text-[#4DA8DA] hover:text-[#3c97c9] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === "link" ? "Copied Checkout URL!" : "Copy Pay URL"}
                  </button>
                  <span className="text-slate-200">•</span>
                  <a
                    href={`/receipt/${selectedRecord.token}`}
                    target="_blank"
                    className="text-slate-500 hover:text-slate-800 font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                  >
                    Official Receipt <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
