"use client";

import { useState } from "react";
import { Shield, Phone, BookOpen, Loader2, AlertCircle, IndianRupee } from "lucide-react";

type PaymentData = {
  studentName: string;
  parentName: string;
  amount: number;
  description: string | null;
  pendingItems: string | null;
  razorpayShortUrl: string;
  status: string;
  isMock: boolean;
};

type Props = { token: string };

type Step = "phone" | "details" | "redirecting";

export default function ParentPayClient({ token }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PaymentData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [paying, setPaying] = useState(false);

  async function verifyPhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fee-link/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, phone }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Something went wrong."); return; }
      if (!json.valid) { setError(json.error || "Phone number does not match."); return; }
      if (json.status === "PAID") { setError("This payment has already been completed."); return; }
      setData(json);
      if (!json.pendingItems) {
        setAcknowledged(true);
      } else {
        setAcknowledged(false);
      }
      setStep("details");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePay() {
    if (!data || !acknowledged) return;
    setPaying(true);

    if (data.isMock) {
      // Demo mode: simulate payment
      await fetch("/api/fee-link/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      window.location.href = `/fee-pay/thank-you?status=success&token=${token}`;
    } else {
      window.location.href = data.razorpayShortUrl;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up">

        {/* ── STEP 1: Phone Verify ── */}
        {step === "phone" && (
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-8 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">Verify Identity</h1>
              <p className="text-indigo-200 text-sm mt-2">Enter the phone number used during admission to proceed with payment</p>
            </div>

            <form onSubmit={verifyPhone} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                  <input
                    type="tel"
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-200 rounded-2xl text-slate-900 text-lg font-semibold tracking-wide focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-300"
                    placeholder="10-digit number"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base"
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</> : "Verify & Continue →"}
              </button>

              <p className="text-center text-slate-400 text-xs">Your phone number is used only for identity verification. No OTP is sent.</p>
            </form>
          </div>
        )}

        {/* ── STEP 2: Payment Details + Pending Items ── */}
        {step === "details" && data && (
          <div className="space-y-4 animate-fade-up">
            {/* Payment Card */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Payment Details</p>
                <p className="text-white font-black text-xl mt-1">{data.studentName}</p>
                <p className="text-slate-400 text-sm">Parent: {data.parentName}</p>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <IndianRupee className="w-5 h-5 text-indigo-500" />
                  <span className="text-3xl font-black text-indigo-700">{Number(data.amount).toLocaleString("en-IN")}</span>
                </div>
                {data.description && <p className="text-slate-500 text-sm">{data.description}</p>}
                {data.isMock && (
                  <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-amber-700 text-xs font-bold">⚠️ Demo Mode — No real payment will be charged</p>
                  </div>
                )}
              </div>
            </div>

            {/* Included Bookstore Items */}
            {data.pendingItems && (
              <div className="bg-sky-50/50 border-2 border-sky-200 rounded-3xl p-6 animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4DA8DA] flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-sky-950 text-sm">Included Bookstore Items</p>
                    <p className="text-sky-600 text-xs">Following items are included in the kit. Please check before leaving the counter.</p>
                  </div>
                </div>
                <div className="bg-white/70 rounded-2xl p-4">
                  <p className="text-sky-900 font-semibold text-sm leading-relaxed">{data.pendingItems}</p>
                </div>

                {/* Acknowledge Checkbox */}
                <button
                  type="button"
                  onClick={() => setAcknowledged(a => !a)}
                  className="flex items-start gap-3 mt-4 text-left w-full group"
                >
                  <div className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 transition-all flex items-center justify-center ${acknowledged ? "bg-sky-500 border-sky-500" : "border-sky-400 bg-white group-hover:border-sky-500"}`}>
                    {acknowledged && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sky-900 text-sm font-medium">I confirm that these items are included in my kit and I will verify them at the counter.</span>
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={paying || (!!data.pendingItems && !acknowledged)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-indigo-200"
            >
              {paying
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                : <><IndianRupee className="w-5 h-5" /> {data.isMock ? "Simulate Payment (Demo)" : `Pay ₹${Number(data.amount).toLocaleString("en-IN")}`}</>}
            </button>

            {data.pendingItems && !acknowledged && (
              <p className="text-center text-slate-400 text-xs">Please acknowledge the pending items above to proceed.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
