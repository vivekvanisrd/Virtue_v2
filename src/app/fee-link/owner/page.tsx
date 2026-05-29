"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, TrendingUp, Users, CheckCircle2, Clock, BookOpen, Download, ArrowLeft } from "lucide-react";

type Record = {
  id: string; token: string; student_name: string; parent_name: string;
  phone: string; amount: number; description: string | null; pending_items: string | null;
  razorpay_short_url: string | null; status: string; paid_at: string | null;
  feedback_rating: string | null; feedback_note: string | null; created_at: string;
  razorpay_payment_id?: string | null; payment_method?: string | null; payment_details?: string | null;
};

type Summary = { total: number; paid: number; pending: number; totalAmount: number; collected: number };

const EMOJI: Record<string, string> = { GREAT: "😊 Great", OKAY: "😐 Okay", POOR: "😞 Poor" };

function exportCSV(records: Record[]) {
  const headers = ["Student Name","Parent Name","Phone","Amount","Status","Transaction ID","Payment Method","Payment Details","Description","Pending Items","Created","Paid At","Feedback"];
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

export default function OwnerPage() {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<Record[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");

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

  if (!records) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle Sky Blue & Saffron Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4DA8DA]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF9933]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative w-full max-w-sm animate-fade-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#DDDDDD] shadow-sm mb-4">
              <Lock className="w-8 h-8 text-[#4DA8DA]" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Owner Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">PaVa-EDUX Administration Portal</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-3xl border border-[#DDDDDD] shadow-xl shadow-slate-200/60 p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4DA8DA] pr-12 text-sm"
                  placeholder="Enter owner password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#4DA8DA]/10">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Access Dashboard"}
            </button>
          </form>
          <div className="text-center mt-4">
            <a href="/fee-link" className="text-slate-400 hover:text-[#4DA8DA] text-xs font-semibold transition-colors flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Back</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header with Sky Blue to Dark Blue gradient */}
      <div className="bg-gradient-to-r from-[#1E5F8A] to-[#4DA8DA] text-white px-6 py-8 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black">All Payment Records</h1>
              <p className="text-white/80 text-sm mt-0.5">PaVa-EDUX Administration Ledger</p>
            </div>
            <button onClick={() => exportCSV(filtered)} className="flex items-center gap-2 bg-[#FF9933] hover:bg-[#eb8c28] px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-md shadow-[#FF9933]/20">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Total Links", value: summary.total, icon: Users, color: "text-sky-100" },
                { label: "Paid", value: summary.paid, icon: CheckCircle2, color: "text-emerald-100" },
                { label: "Pending", value: summary.pending, icon: Clock, color: "text-amber-100" },
                { label: "Total Issued", value: `₹${summary.totalAmount.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-sky-100" },
                { label: "Collected", value: `₹${summary.collected.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-100" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white/10 border border-white/20 rounded-xl p-4">
                  <Icon className={`w-4 h-4 ${color} mb-1`} />
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-white/80 text-xs">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by student name, parent name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm border border-[#DDDDDD] bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4DA8DA] focus:ring-2 focus:ring-[#4DA8DA]/20"
          />
        </div>

        <div className="bg-white rounded-3xl border border-[#DDDDDD] shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-[#DDDDDD]">
                  {["Student & Parent", "Phone", "Amount", "Status", "Transaction Details", "Pending Items", "Feedback", "Timeline"].map(h => (
                    <th key={h} className="text-left px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDDDD]/50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">No records found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{r.student_name}</span>
                        <span className="text-xs text-slate-400 font-medium">{r.parent_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-mono text-xs">{r.phone}</td>
                    <td className="px-4 py-4 font-black text-[#4DA8DA] whitespace-nowrap">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-4">
                      {r.status === "PAID"
                        ? <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">✓ Paid</span>
                        : <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">Pending</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {r.razorpay_payment_id ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-slate-700 font-bold">{r.razorpay_payment_id}</span>
                          {r.payment_method && (
                            <span className="text-[10px] text-slate-400 font-medium capitalize">
                              {r.payment_method}: {r.payment_details}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 max-w-[180px]">
                      {r.pending_items ? (
                        <span className="text-amber-700 text-xs flex items-start gap-1"><BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#FF9933]" />{r.pending_items}</span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {r.feedback_rating ? (
                        <span title={r.feedback_note || ""} className="text-lg cursor-default">
                          {r.feedback_rating === "GREAT" ? "😊" : r.feedback_rating === "OKAY" ? "😐" : "😞"}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          Created: {new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>
                        {r.paid_at && (
                          <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid: {new Date(r.paid_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-[#DDDDDD] bg-slate-50 text-xs text-slate-400">
              Showing {filtered.length} of {records.length} records
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
