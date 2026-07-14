"use client";

import { useState } from "react";
import { Shield, Phone, BookOpen, Loader2, AlertCircle, IndianRupee, QrCode, CheckCircle, ChevronRight, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

type PaymentData = {
  studentName: string;
  parentName: string;
  amount: number;
  description: string | null;
  pendingItems: string | null;
  razorpayShortUrl: string;
  status: string;
  isMock: boolean;
  isUPI: boolean;
  upiVpa: string;
  upiMerchantName: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
};

type Props = { token: string };

type Step = "phone" | "details" | "upi_pay" | "bank_pay" | "redirecting";

export default function ParentPayClient({ token }: Props) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PaymentData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [paying, setPaying] = useState(false);
  const [utr, setUtr] = useState("");
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "upi_qr" | "bank_transfer">("online");

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
      if (json.status === "PENDING_VERIFICATION") { 
        window.location.href = `/fee-pay/thank-you?status=pending_verification&token=${token}`;
        return; 
      }
      
      setData(json);
      setAcknowledged(!json.pendingItems);
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

    if (paymentMethod === "online") {
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
    } else if (paymentMethod === "upi_qr") {
      setStep("upi_pay");
      setPaying(false);
    } else if (paymentMethod === "bank_transfer") {
      setStep("bank_pay");
      setPaying(false);
    }
  }

  async function submitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (utr.length !== 12) {
      setError("Please enter a valid 12-digit UPI UTR number.");
      return;
    }
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/fee-link/submit-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, utr }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit UTR.");
        setPaying(false);
        return;
      }
      window.location.href = `/fee-pay/thank-you?status=pending_verification&token=${token}`;
    } catch {
      setError("Network error. Please try again.");
      setPaying(false);
    }
  }

  const cleanUpiRef = data 
    ? `FEE-${data.studentName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}-${token.slice(0, 8).toUpperCase()}`
    : "";

  // Construct standard prefilled UPI deep link
  const upiUrl = (data && data.upiVpa) ? `upi://pay?pa=${encodeURIComponent(data.upiVpa)}&pn=${encodeURIComponent(data.upiMerchantName)}&am=${Number(data.amount).toFixed(2)}&tr=${cleanUpiRef}&tn=${encodeURIComponent(`Fees for ${data.studentName}${data.description ? ` - ${data.description}` : ""}`.substring(0, 100))}&cu=INR` : "";

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

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 space-y-6">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Select Payment Method</h4>
              
              <div className="space-y-3">
                {/* Mode 1: Online (Razorpay) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={cn(
                    "w-full p-4 border-2 rounded-2xl text-left flex items-center justify-between transition-all outline-none",
                    paymentMethod === "online" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Pay Online (Card / NetBanking / UPI)</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Instant settlement via Secure Gateway</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Mode 2: UPI QR (Zero Fee) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi_qr")}
                  className={cn(
                    "w-full p-4 border-2 rounded-2xl text-left flex items-center justify-between transition-all outline-none",
                    paymentMethod === "upi_qr" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Scan UPI QR Code (Zero Charges)</p>
                      <p className="text-[10px] text-slate-400 font-semibold">GPay / PhonePe / Paytm (requires UTR code)</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Mode 3: Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={cn(
                    "w-full p-4 border-2 rounded-2xl text-left flex items-center justify-between transition-all outline-none",
                    paymentMethod === "bank_transfer" ? "border-indigo-600 bg-indigo-50/20" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                      <IndianRupee className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">Direct Bank Transfer (NEFT / IMPS)</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Transfer directly to School Bank Account</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <button
                onClick={handlePay}
                disabled={paying || (!!data.pendingItems && !acknowledged)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-indigo-100"
              >
                {paying ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Preparing Gateway...</>
                ) : (
                  "Continue to Pay →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: UPI QR Pay Form ── */}
        {step === "upi_pay" && data && (
          <div className="space-y-4 animate-fade-up">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 flex flex-col items-center text-center space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scan & Pay via UPI</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{data.upiMerchantName}</h3>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5 font-mono">{data.upiVpa}</p>
              </div>

              {/* VPA Missing Safety Guard */}
              {!data.upiVpa ? (
                <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-2xl text-center space-y-2 w-full">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-sm font-black text-rose-800 uppercase">UPI Config Missing</h4>
                  <p className="text-xs text-rose-600 font-medium leading-relaxed">
                    This branch has not configured its UPI collection address. Please contact school administration to settle fees.
                  </p>
                </div>
              ) : (
                <>
                  {/* Confirmation Checkbox */}
                  <div className="flex items-start gap-3 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl text-left w-full">
                    <input 
                      type="checkbox" 
                      id="confirm-payment-details"
                      checked={confirmDetails}
                      onChange={e => setConfirmDetails(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="confirm-payment-details" className="text-xs font-semibold text-slate-700 leading-normal cursor-pointer select-none">
                      I confirm that I am paying <span className="text-indigo-600 font-bold">₹{Number(data.amount).toLocaleString("en-IN")}</span> for <span className="font-bold">{data.studentName}</span> {data.description ? `(${data.description})` : ""}.
                    </label>
                  </div>

                  {/* QR Code SVG or Placeholder */}
                  {!confirmDetails ? (
                    <div className="w-full max-w-[240px] aspect-square bg-slate-50 border border-slate-200 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <QrCode className="w-8 h-8 text-slate-300 animate-pulse" />
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Awaiting Confirmation</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal px-2">Confirm the amount and payment term above to unlock the dynamic QR Code.</p>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-inner relative group animate-in zoom-in-95 duration-300">
                        <QRCodeSVG value={upiUrl} size={180} />
                      </div>

                      <div>
                        <span className="text-2xl font-black text-indigo-700">₹{Number(data.amount).toLocaleString("en-IN")}</span>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">Prefilled Amount & Ref Note: FEE-{data.studentName.replace(/\s+/g, "").substring(0, 20)}</p>
                      </div>

                      {/* Direct UPI Deep Link for Mobile Users */}
                      <a 
                        href={upiUrl}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-100 animate-in fade-in duration-500"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Pay with Google Pay / PhonePe / Paytm
                      </a>
                    </>
                  )}
                </>
              )}
            </div>

            {/* UTR Entry Form */}
            <form onSubmit={submitUtr} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Enter 12-Digit Transaction Reference (UTR) *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-4 border border-slate-200 rounded-2xl text-slate-900 text-lg font-semibold tracking-wide text-center focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  placeholder="e.g. 614839201827"
                  value={utr}
                  onChange={e => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  maxLength={12}
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Required to automatically match your payment in our daily bank statements.</span>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={paying || utr.length !== 12}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting UTR...</> : "Submit UTR & Complete"}
              </button>
            </form>
          </div>
        )}

        {/* ── STEP 4: Bank Transfer Pay Form ── */}
        {step === "bank_pay" && data && (
          <div className="space-y-4 animate-fade-up">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Bank Transfer</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">School Account Details</h3>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-400 text-xs">Beneficiary Name</span>
                  <span className="font-black text-slate-900">{data.upiMerchantName || "PaVa-EDUX Academy"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-400 text-xs">Bank Name</span>
                  <span className="font-bold text-slate-700">{data.bankName || "Yes Bank Ltd"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-400 text-xs">Account Number</span>
                  <span className="font-black text-indigo-700 font-mono tracking-wider">{data.bankAccountNo || "000190100004829"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 text-xs">IFSC Code</span>
                  <span className="font-black text-indigo-700 font-mono tracking-wider">{data.bankIfsc || "YESB0000001"}</span>
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-100 p-4 rounded-xl text-left">
                <p className="text-[10px] text-cyan-800 font-bold leading-normal uppercase tracking-wider">
                  Transfer exactly <span className="font-black">₹{Number(data.amount).toLocaleString("en-IN")}</span> via IMPS / NEFT, then submit the 12-digit transaction ID (UTR) below for manual verification.
                </p>
              </div>
            </div>

            {/* UTR Entry Form */}
            <form onSubmit={submitUtr} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Enter 12-Digit Transfer Reference (UTR) *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-4 border border-slate-200 rounded-2xl text-slate-900 text-lg font-semibold tracking-wide text-center focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  placeholder="e.g. 614839201827"
                  value={utr}
                  onChange={e => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  maxLength={12}
                />
                <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Your UTR is critical for the finance team to reconcile the bank credit.</span>
              </div>

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={paying || utr.length !== 12}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {paying ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting UTR...</> : "Submit UTR & Complete"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
