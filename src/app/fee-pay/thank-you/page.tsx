"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Lock, Unlock, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { BookReceipt } from "@/components/finance/BookReceipt";

const EMOJI = [
  { key: "GREAT", icon: "😊", label: "Great", color: "border-emerald-300 bg-emerald-50 hover:bg-emerald-100" },
  { key: "OKAY",  icon: "😐", label: "Okay",  color: "border-slate-300  bg-slate-50  hover:bg-slate-100" },
  { key: "POOR",  icon: "😞", label: "Poor",  color: "border-rose-300   bg-rose-50   hover:bg-rose-100" },
];

function ThankYouContent() {
  const sp = useSearchParams();
  const status = sp.get("status");
  const token  = sp.get("token");

  const [linkData, setLinkData] = useState<any>(null);
  const [rating, setRating] = useState("");
  const [note, setNote]     = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const isPaid      = status === "success";
  const isCancelled = status === "cancelled";
  const isError     = status === "error";

  // Auto-fetch paid link details to compile receipt off-screen
  useEffect(() => {
    if (!token || !isPaid) return;
    
    // Poll or fetch the status to make sure webhook has updated it, or get immediate local callback state
    supabase
      .from("fee_payment_links")
      .select("*")
      .eq("token", token)
      .single()
      .then(({ data }) => {
        if (data) {
          setLinkData(data);
        }
      });
  }, [token, isPaid]);

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
                  Thank you. Your receipt is downloading automatically in the background. Please provide feedback below to complete the flow.
                </p>
              </div>
            </div>

            {/* Hidden off-screen receipt generator for background auto-download */}
            {linkData && (
              <div className="absolute opacity-0 pointer-events-none -left-[9999px] -top-[9999px]" style={{ width: "210mm", height: "297mm" }}>
                <BookReceipt linkData={linkData} autoDownloadOverride={true} />
              </div>
            )}

            {/* Feedback Card */}
            {!feedbackDone ? (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 animate-fade-up space-y-5">
                
                {/* Visual Lock/Unlock Banner */}
                {(!rating || !note.trim()) ? (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
                    <Lock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-black text-amber-950 uppercase tracking-wide">
                        Receipt Download Status / రశీదు డౌన్‌లోడ్ సమాచారం
                      </p>
                      <p className="text-xs md:text-sm font-bold text-amber-900 leading-normal">
                        📥 Your receipt is <span className="bg-amber-200 px-1 py-0.5 rounded text-amber-950 font-black">downloading in the background</span>. Please fill in the experience form below. If you don't have any issues, simply write <span className="underline">"None"</span> or <span className="underline">"Good"</span>.
                      </p>
                      <p className="text-xs md:text-sm font-bold text-amber-900 leading-normal border-t border-amber-200/60 pt-1.5">
                        📥 మీ రశీదు <span className="bg-amber-200 px-1 py-0.5 rounded text-amber-950 font-black">బ్యాక్‌గ్రౌండ్‌లో డౌన్‌లోడ్ అవుతోంది</span>. దయచేసి క్రింద మీ అభిప్రాయాన్ని తెలియజేయండి. ఎలాంటి సమస్యలు లేకపోతే <span className="underline">"None"</span> లేదా <span className="underline">"Good"</span> అని రాయండి.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                    <Unlock className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-emerald-950 uppercase tracking-wide">Feedback Ready to Submit / అభిప్రాయం సిద్ధంగా ఉంది</p>
                      <p className="text-xs md:text-sm font-bold text-emerald-800 mt-1">Click the button below to submit your feedback.</p>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <h2 className="text-base font-black text-slate-800">How was your experience?</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Feedback is required to complete the payment flow</p>
                </div>

                <div className="flex justify-center gap-3">
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

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                    <span>Feedback & Comments (Mandatory / తప్పనిసరి) *</span>
                    {note.trim().length > 0 && <span className="text-emerald-600">✓ Filled</span>}
                  </label>
                  <textarea
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-500 resize-none h-20 transition-all focus:ring-4 focus:ring-indigo-100"
                    placeholder="e.g. Good, None, or write comments if any..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                {feedbackError && <p className="text-red-500 text-xs text-center font-bold">⚠️ {feedbackError}</p>}

                <div>
                  {(!rating || !note.trim()) ? (
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-400 font-bold py-4 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                    >
                      <Lock className="w-4 h-4" />
                      Enter Feedback to Complete
                    </button>
                  ) : (
                    <button
                      onClick={submitFeedback}
                      disabled={submitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Submit Feedback & Complete
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center animate-scale-in space-y-4">
                <p className="text-3xl">🎉</p>
                <p className="font-bold text-slate-800">Feedback Submitted!</p>
                <p className="text-slate-400 text-sm">Thank you. Your receipt has been downloaded successfully.</p>
                <a
                  href={`/receipt/${encodeURIComponent(token || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 mx-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Receipt Details
                </a>
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
