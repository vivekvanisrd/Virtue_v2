"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * 🏛️ SOVEREIGN PAYMENT VERIFICATION (Core Logic)
 */
function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Securing and verifying your payment...");
  
  useEffect(() => {
    const paymentId   = searchParams.get("razorpay_payment_id");
    const linkId      = searchParams.get("razorpay_payment_link_id");
    const referenceId = searchParams.get("razorpay_payment_link_reference_id");
    const linkStatus  = searchParams.get("razorpay_payment_link_status");
    const signature   = searchParams.get("razorpay_signature");

    if (!paymentId || !linkId || referenceId === null || !linkStatus || !signature) {
      setStatus("error");
      setMessage("Invalid payment link callback parameters.");
      return;
    }

    const verifyUrl = `/api/payments/verify?razorpay_payment_id=${encodeURIComponent(paymentId)}&razorpay_payment_link_id=${encodeURIComponent(linkId)}&razorpay_payment_link_reference_id=${encodeURIComponent(referenceId)}&razorpay_payment_link_status=${encodeURIComponent(linkStatus)}&razorpay_signature=${encodeURIComponent(signature)}`;

    fetch(verifyUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.recorded || data.status === "already_recorded") {
          setStatus("success");
          setMessage("Payment Confirmed! Redirecting to your receipt...");
          
          setTimeout(() => {
            router.replace(`/receipt/${data.receiptNumber}`);
          }, 1500);
        } else {
          setStatus("error");
          setMessage(data.message || data.error || "Payment verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("A network error occurred while verifying your payment.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white max-w-sm w-full rounded-3xl p-8 shadow-2xl shadow-slate-200/50 flex flex-col items-center">
      {status === "loading" && (
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border-4 border-slate-100 animate-pulse">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      )}
      
      {status === "success" && (
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-6 animate-in zoom-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
      )}
      
      {status === "error" && (
        <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-rose-500" />
        </div>
      )}

      <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">
        {status === "loading" && "Confirming Payment"}
        {status === "success" && "Transaction Verified"}
        {status === "error" && "Verification Error"}
      </h1>
      
      <p className="text-sm font-bold text-slate-500 max-w-[250px] leading-relaxed">
        {message}
      </p>
    </div>
  );
}

/**
 * 👑 PRIMARY EXPORT (Wrapped in Suspense for Production Build)
 */
export default function PaymentVerifyPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <Suspense fallback={
        <div className="bg-white max-w-sm w-full rounded-3xl p-8 shadow-2xl shadow-slate-200/50 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border-4 border-slate-100 animate-pulse">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">Initializing...</h1>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
