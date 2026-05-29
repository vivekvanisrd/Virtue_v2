"use client";

import { useState, Suspense } from "react";
import { Phone, Search, CheckCircle2, Clock, XCircle, BookOpen, ArrowLeft, FileText, IndianRupee } from "lucide-react";

type PaymentLinkStatusRecord = {
  token: string;
  studentName: string;
  parentName: string;
  amount: number;
  status: string;
  pendingItems: string | null;
  description: string | null;
  createdAt: string;
  paidAt: string | null;
  feedbackRating: string | null;
};

const feedbackEmoji: Record<string, string> = { GREAT: "😊", OKAY: "😐", POOR: "😞" };

function StatusBadge({ status }: { status: string }) {
  if (status === "PAID") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
      <CheckCircle2 className="w-3.5 h-3.5" /> Paid
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
      <Clock className="w-3.5 h-3.5" /> Pending
    </span>
  );
}

function StatusChecker() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<PaymentLinkStatusRecord[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotFound(false);
    setRecords(null);
    try {
      const res = await fetch(`/api/fee-link/status?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.found) setRecords(data.records);
      else setNotFound(true);
    } catch {
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-start p-4 pt-16 relative overflow-hidden">
      {/* Subtle Sky Blue & Saffron Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#4DA8DA]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF9933]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative w-full max-w-lg animate-fade-up">
        <a href="/fee-link" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#4DA8DA] text-sm mb-8 font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Generator
        </a>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#DDDDDD] shadow-sm mb-4">
            <Search className="w-8 h-8 text-[#4DA8DA]" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Payment Status</h1>
          <p className="text-slate-500 text-sm mt-1">PaVa-EDUX Administration Portal</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-[#DDDDDD] p-6 mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone or Receipt / Ref ID</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-[#DDDDDD] rounded-xl focus:outline-none focus:border-[#4DA8DA] focus:ring-2 focus:ring-[#4DA8DA]/20 text-slate-800 text-sm transition-all"
                placeholder="Enter mobile number, receipt ID, or Ref ID"
                value={query}
                onChange={e => setQuery(e.target.value)}
                required
                maxLength={50}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-[#4DA8DA]/10"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        </form>

        {/* Not Found */}
        {notFound && (
          <div className="bg-white rounded-3xl border border-[#DDDDDD] shadow-sm p-8 text-center animate-fade-up">
            <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold">No records found</p>
            <p className="text-slate-400 text-sm mt-1">No payment link found matching this phone number or receipt/reference ID.</p>
          </div>
        )}

        {/* Results */}
        {records && records.length > 0 && (
          <div className="space-y-4 animate-fade-up">
            {records.map((r, i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#DDDDDD] shadow-md overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{r.studentName}</p>
                      <p className="text-slate-500 text-sm">{r.parentName}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-[#4DA8DA]">₹{Number(r.amount).toLocaleString("en-IN")}</span>
                    {r.feedbackRating && (
                      <span className="text-xl" title={r.feedbackRating}>{feedbackEmoji[r.feedbackRating] || ""}</span>
                    )}
                  </div>

                  {r.description && <p className="text-slate-600 text-sm mt-2">{r.description}</p>}

                  {r.pendingItems && (
                    <div className="mt-3 bg-sky-50/50 border border-sky-100 rounded-xl px-3 py-2">
                      <p className="text-sky-700 text-xs font-bold flex items-center gap-1 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-[#FF9933]" /> Included Items
                      </p>
                      <p className="text-sky-600 text-xs">{r.pendingItems}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#DDDDDD]">
                    <span className="text-slate-400 text-xs">Created: {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    {r.paidAt && <span className="text-emerald-600 text-xs font-semibold">Paid: {new Date(r.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#DDDDDD]/60 flex items-center justify-end gap-2">
                    {r.status === "PAID" ? (
                      <a
                        href={`/receipt/${r.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/10 flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> View Receipt
                      </a>
                    ) : (
                      <a
                        href={`/fee-pay/${r.token}`}
                        className="px-4 py-2 bg-[#4DA8DA] hover:bg-[#3c97c9] text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-[#4DA8DA]/10 flex items-center gap-1.5"
                      >
                        <IndianRupee className="w-3.5 h-3.5" /> Pay Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#4DA8DA]/30 border-t-[#4DA8DA] rounded-full animate-spin" /></div>}>
      <StatusChecker />
    </Suspense>
  );
}
