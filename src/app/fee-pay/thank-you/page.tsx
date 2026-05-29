"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const EMOJI = [
  { key: "GREAT", icon: "😊", label: "Great", color: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100" },
  { key: "OKAY",  icon: "😐", label: "Okay",  color: "border-slate-300  bg-slate-50  hover:bg-slate-100" },
  { key: "POOR",  icon: "😞", label: "Poor",  color: "border-rose-300   bg-rose-50   hover:bg-rose-100" },
];

function ThankYouContent() {
  const sp = useSearchParams();
  const status = sp.get("status");
  const token  = sp.get("token");

  const [rating, setRating] = useState("");
  const [note, setNote]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const isPaid      = status === "success";
  const isCancelled = status === "cancelled";
  const isError     = status === "error";

  async function submitFeedback() {
    if (!rating || !token) return;
    setSubmitting(true);
    setFeedbackError("");
    try {
      const res = await fetch("/api/fee-link/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, note }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedbackDone(true);
        if (json.receiptNumber) {
          setTimeout(() => {
            window.location.href = `/receipt/${encodeURIComponent(json.receiptNumber)}?autodownload=true`;
          }, 1200);
        }
      } else {
        throw new Error(json.error || "Failed to submit feedback.");
      }
    } catch (err: any) {
      setFeedbackError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-scale-in">

        {/* ── Error / Cancelled ── */}
        {(isError || isCancelled) && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-50 border-2 border-rose-100 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-10 h-10 text-rose-400" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              {isCancelled ? "Payment Cancelled" : "Something Went Wrong"}
            </h1>
            <p className="text-slate-400 text-sm">
              {isCancelled ? "The payment was not completed. You can close this page and try again." : "There was an issue processing your payment. Please contact the school."}
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {isPaid && (
          <div className="space-y-4">
            {/* Success Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-10 text-center">
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className="absolute w-20 h-20 rounded-full bg-white/20 pulse-ring" />
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-2xl font-black text-white">Payment Confirmed!</h1>
                <p className="text-emerald-100 text-sm mt-2">
                  Thank you. Please submit your feedback below to generate and download your receipt.
                </p>
              </div>
            </div>

            {/* Feedback Card */}
            {!feedbackDone ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-fade-up">
                <h2 className="text-base font-black text-slate-800 text-center mb-1">How was your experience?</h2>
                <p className="text-slate-400 text-xs text-center mb-5">Feedback is required to download your receipt</p>

                <div className="flex justify-center gap-3 mb-5">
                  {EMOJI.map(e => (
                    <button
                      key={e.key}
                      onClick={() => setRating(e.key)}
                      className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl border-2 transition-all ${e.color} ${rating === e.key ? "scale-110 ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                    >
                      <span className="text-3xl select-none">{e.icon}</span>
                      <span className="text-xs font-semibold text-slate-600">{e.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Pending Books & Issues
                  </label>
                  <textarea
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-500 resize-none h-20 transition-all focus:ring-4 focus:ring-indigo-100"
                    placeholder="Mention if you have any pending books, and any issues or complaints you have regarding books..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                {feedbackError && <p className="text-red-500 text-xs text-center mt-2 font-bold">⚠️ {feedbackError}</p>}

                <div className="mt-4">
                  <button
                    onClick={submitFeedback}
                    disabled={!rating || !note.trim() || submitting}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & Download Receipt"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 text-center animate-scale-in">
                <p className="text-3xl mb-2">🎉</p>
                <p className="font-bold text-slate-800">Feedback Submitted!</p>
                <p className="text-slate-400 text-sm mt-1">Generating and downloading your receipt. Please wait...</p>
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mt-4" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}

