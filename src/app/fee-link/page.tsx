"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Link2, Copy, CheckCheck, Share2, User, Phone,
  IndianRupee, FileText, BookOpen, Loader2, RefreshCw, Sparkles
} from "lucide-react";

type FormData = {
  studentName: string;
  parentName: string;
  phone: string;
  amount: string;
  description: string;
  pendingItems: string;
};

type Result = {
  token: string;
  shareableUrl: string;
  razorpayShortUrl: string;
  isMock: boolean;
};

const INIT: FormData = { studentName: "", parentName: "", phone: "", amount: "", description: "", pendingItems: "" };

export default function AdminGeneratePage() {
  const [form, setForm] = useState<FormData>(INIT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/fee-link/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: form.studentName,
          parentName: form.parentName,
          phone: form.phone,
          amount: form.amount,
          description: form.description,
          pendingItems: form.pendingItems,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create link");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    if (!result) return;
    const msg = `Hello ${form.parentName}, please click the link below to complete the fee payment for ${form.studentName}.\n\n${result.shareableUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function reset() {
    setResult(null);
    setForm(INIT);
    setError("");
  }

  const inputClass =
    "w-full bg-white border border-[#DDDDDD] rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4DA8DA] focus:ring-2 focus:ring-[#4DA8DA]/20 transition-all text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2";

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Sky Blue & Saffron Background Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#4DA8DA]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF9933]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="relative w-full max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#DDDDDD] shadow-sm mb-4">
            <Link2 className="w-8 h-8 text-[#4DA8DA]" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Payment Link Generator</h1>
          <p className="text-slate-500 text-sm mt-1">PaVa-EDUX Administration Portal</p>
        </div>

        {!result ? (
          /* ─── FORM ─── */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-[#DDDDDD] p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Name */}
              <div>
                <label className={labelClass}>Student Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-10`} placeholder="Full name of student" value={form.studentName} onChange={set("studentName")} required />
                </div>
              </div>

              {/* Parent Name */}
              <div>
                <label className={labelClass}>Parent Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-10`} placeholder="Father / Mother name" value={form.parentName} onChange={set("parentName")} required />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Parent Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-10`} placeholder="10-digit mobile number" value={form.phone} onChange={set("phone")} required maxLength={15} type="tel" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={labelClass}>Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-10`} placeholder="e.g. 5000" value={form.amount} onChange={set("amount")} required type="number" min="1" step="any" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description / Reason (optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input className={`${inputClass} pl-10`} placeholder="e.g. Class 5 Textbooks, Notebooks, Drawing Kit" value={form.description} onChange={set("description")} />
              </div>
            </div>

            {/* Pending Items */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#FF9933]" />
                  Pending Books / Items
                </span>
              </label>
              <textarea
                className={`${inputClass} resize-none h-24`}
                placeholder="List books or items pending to be given to the student.&#10;e.g. Science Textbook, Lab Manual, ID Card, Drawing Kit"
                value={form.pendingItems}
                onChange={set("pendingItems")}
              />
              <p className="text-slate-400 text-xs mt-1.5">This will be shown to the parent before they pay, with an acknowledgement checkbox.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-md shadow-[#4DA8DA]/20 transition-all flex items-center justify-center gap-2 text-base"
            >
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</> : <><Sparkles className="w-5 h-5 text-[#FF9933]" /> Generate Payment Link</>}
            </button>

            {/* Navigation links */}
            <div className="flex items-center justify-center gap-6 pt-2 border-t border-[#DDDDDD]">
              <a href="/fee-link/status" className="text-slate-500 hover:text-[#4DA8DA] text-xs font-semibold transition-colors">Check Status</a>
              <span className="text-slate-300">•</span>
              <a href="/fee-link/owner" className="text-slate-500 hover:text-[#4DA8DA] text-xs font-semibold transition-colors">Owner Dashboard</a>
            </div>
          </form>
        ) : (
          /* ─── SUCCESS STATE ─── */
          <div className="animate-scale-in">
            <div className="bg-white rounded-3xl shadow-xl border border-[#DDDDDD] overflow-hidden">
              {/* Success banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border-b border-emerald-100 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800">Link Created!</h2>
                <p className="text-emerald-700 text-sm font-semibold mt-1">
                  {form.studentName} · ₹{parseFloat(form.amount).toLocaleString("en-IN")}
                  {result.isMock && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full border border-amber-200">Demo Mode</span>}
                </p>
              </div>

              <div className="p-8 space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-[#F5F5F5] rounded-2xl p-4 border border-[#DDDDDD] shadow-inner">
                    <QRCodeSVG value={result.shareableUrl} size={200} includeMargin={false} level="M" />
                  </div>
                </div>

                {/* Shareable Link */}
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2 text-center">Shareable Link</p>
                  <div className="bg-[#F5F5F5] border border-[#DDDDDD] rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-slate-600 text-sm flex-1 truncate font-mono text-xs">{result.shareableUrl}</span>
                    <button onClick={copyLink} className="shrink-0 text-slate-500 hover:text-[#4DA8DA] transition-colors">
                      {copied ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyLink} className="flex items-center justify-center gap-2 bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-[#4DA8DA]/10">
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                  <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 bg-[#FF9933] hover:bg-[#eb8c28] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-[#FF9933]/10">
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>

                <button onClick={reset} className="w-full flex items-center justify-center gap-2 border border-[#DDDDDD] text-slate-600 hover:text-slate-800 hover:bg-[#F5F5F5] font-semibold py-3 rounded-xl transition-all">
                  <RefreshCw className="w-4 h-4" />
                  Generate Another Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
