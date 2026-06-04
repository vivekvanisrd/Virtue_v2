"use client";

import { useState } from "react";
import { Phone, Search, CheckCircle2, Clock, BookOpen, ArrowLeft, FileText, IndianRupee, Loader2 } from "lucide-react";
import Link from "next/link";

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
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Paid
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
      <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Pending
    </span>
  );
}

export default function InventoryStatusCheckerPage() {
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

  const inputClass =
    "w-full bg-slate-55/35 border border-slate-205 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all font-semibold";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Payment Status Check</h2>
          <p className="text-slate-500 text-xs mt-1">Check current status of generated bookstore payment links by student or transaction info</p>
        </div>
        <div>
          <Link href="/inventory/fee-link" className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-slate-850 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Link Generator
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <Search className="w-4.5 h-4.5 text-[#4DA8DA]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Search Records</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Find transactions by details</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Phone, Student Name, or Reference ID</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Enter mobile number, student name, or receipt ID"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  required
                  maxLength={50}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-[#4DA8DA]/10 cursor-pointer text-xs uppercase"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold">{error}</div>
          )}
        </form>

        {/* Not Found */}
        {notFound && (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
            <XCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h3 className="text-sm font-black text-slate-800">No Records Found</h3>
            <p className="text-slate-400 text-xs mt-1">No payment links matching "{query}" could be found in the database.</p>
          </div>
        )}

        {/* Results */}
        {records && records.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{records.length} records found</h3>
            {records.map(rec => (
              <div key={rec.token} className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm animate-scale-in">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{rec.studentName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Parent: {rec.parentName}</p>
                  </div>
                  <StatusBadge status={rec.status} />
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Amount</span>
                    <span className="text-slate-800 text-sm font-black">₹{Number(rec.amount).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Created Date</span>
                    <span className="text-slate-650 font-semibold">{new Date(rec.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  {rec.paidAt && (
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase block mb-0.5">Paid Timestamp</span>
                      <span className="text-emerald-700 font-black">{new Date(rec.paidAt).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>

                {/* description */}
                {rec.description && (
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs font-semibold">
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Description</span>
                    <span className="text-slate-700">{rec.description}</span>
                  </div>
                )}

                {/* Included Items */}
                {rec.pendingItems && (
                  <div className="bg-sky-50/30 border border-sky-100 rounded-xl p-3 text-xs font-semibold">
                    <span className="text-[9px] text-sky-950/60 uppercase block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-[#FF9933]" /> Listed Items Checklist
                    </span>
                    <span className="text-sky-950 font-medium">{rec.pendingItems}</span>
                  </div>
                )}

                {/* Feedback */}
                {rec.feedbackRating && (
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-[9px] text-slate-400 uppercase font-black">Parent Experience Feedback:</span>
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className="text-base">{feedbackEmoji[rec.feedbackRating] || "💬"}</span>
                      {rec.feedbackRating}
                    </span>
                  </div>
                )}

                {/* Receipt Quicklink */}
                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs">
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">Token: {rec.token.slice(0, 8)}...</span>
                  <a
                    href={`/receipt/${rec.token}`}
                    target="_blank"
                    className="text-[#4DA8DA] hover:text-[#3c97c9] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                  >
                    View Official Receipt <FileText className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple layout wrapper for SVG component evaluation if needed
function XCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}
