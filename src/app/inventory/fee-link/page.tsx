"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Link2, Copy, CheckCheck, Share2, User, Phone,
  IndianRupee, FileText, BookOpen, Loader2, RefreshCw, Sparkles
} from "lucide-react";
import Link from "next/link";

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

export default function InventoryGeneratePayLinkPage() {
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
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#4DA8DA] transition-all text-xs font-semibold";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Payment Link Generator</h2>
          <p className="text-slate-500 text-xs mt-1">Generate secure checkout links and share QR codes for parent bookstore payments</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {!result ? (
          /* ─── FORM ─── */
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                <Link2 className="w-4.5 h-4.5 text-[#4DA8DA]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">New Payment Link</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Provide student & billing details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Name */}
              <div>
                <label className={labelClass}>Student Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-9`} placeholder="Full name of student" value={form.studentName} onChange={set("studentName")} required />
                </div>
              </div>

              {/* Parent Name */}
              <div>
                <label className={labelClass}>Parent Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-9`} placeholder="Father / Mother name" value={form.parentName} onChange={set("parentName")} required />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Parent Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-9`} placeholder="10-digit mobile number" value={form.phone} onChange={set("phone")} required maxLength={15} type="tel" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={labelClass}>Amount (₹) *</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input className={`${inputClass} pl-9`} placeholder="e.g. 5000" value={form.amount} onChange={set("amount")} required type="number" min="1" step="any" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description / Reason (optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input className={`${inputClass} pl-9`} placeholder="e.g. Class 5 Textbooks, Notebooks, Drawing Kit" value={form.description} onChange={set("description")} />
              </div>
            </div>

            {/* Pending Items */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#FF9933]" />
                  Pending Books / Items Checklist
                </span>
              </label>
              <textarea
                className={`${inputClass} resize-none h-20`}
                placeholder="List books or items pending to be given to the student.&#10;e.g. Science Textbook, Lab Manual, ID Card, Drawing Kit"
                value={form.pendingItems}
                onChange={set("pendingItems")}
              />
              <p className="text-slate-450 text-[10px] mt-1.5">This list will display as an acknowledgement checklist for parents during payment checkout.</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4DA8DA] hover:bg-[#3c97c9] disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating Secure Gateway...</> : <><Sparkles className="w-4 h-4 text-[#FF9933]" /> Generate Payment Link</>}
            </button>

            {/* Internal navigation links */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100">
              <Link href="/inventory/fee-link/status" className="text-slate-500 hover:text-[#4DA8DA] text-xs font-bold uppercase tracking-wider transition-colors">Check Payment Status</Link>
              <span className="text-slate-200 font-bold">•</span>
              <Link href="/inventory/fee-link/owner" className="text-slate-500 hover:text-[#4DA8DA] text-xs font-bold uppercase tracking-wider transition-colors">Owner Admin Dashboard</Link>
            </div>
          </form>
        ) : (
          /* ─── SUCCESS STATE ─── */
          <div className="animate-scale-in">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Success banner */}
              <div className="bg-emerald-50/50 border-b border-emerald-100 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-5.5 h-5.5 text-emerald-600" />
                </div>
                <h2 className="text-base font-black text-slate-800">Checkout Link Created!</h2>
                <p className="text-emerald-700 text-xs font-bold mt-1">
                  {form.studentName} · ₹{parseFloat(form.amount).toLocaleString("en-IN")}
                  {result.isMock && <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full border border-amber-200 font-bold uppercase tracking-wider">Demo Mode</span>}
                </p>
              </div>

              <div className="p-8 space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 shadow-inner">
                    <QRCodeSVG value={result.shareableUrl} size={180} includeMargin={false} level="M" />
                  </div>
                </div>

                {/* Shareable Link */}
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 text-center">Shareable URL</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-slate-600 text-[10px] flex-1 truncate font-mono font-semibold">{result.shareableUrl}</span>
                    <button onClick={copyLink} className="shrink-0 text-slate-455 hover:text-[#4DA8DA] transition-colors cursor-pointer">
                      {copied ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button onClick={copyLink} className="flex items-center justify-center gap-2 bg-[#4DA8DA] hover:bg-[#3c97c9] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-[#4DA8DA]/10 cursor-pointer">
                    {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied Link!" : "Copy URL Link"}
                  </button>
                  <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 bg-[#FF9933] hover:bg-[#eb8c28] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-[#FF9933]/10 cursor-pointer">
                    <Share2 className="w-4 h-4" />
                    Share WhatsApp
                  </button>
                </div>

                <button onClick={reset} className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-650 hover:text-slate-800 hover:bg-slate-50 font-bold py-3 rounded-xl transition-all text-xs cursor-pointer">
                  <RefreshCw className="w-4 h-4" />
                  Generate Another Payment Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
