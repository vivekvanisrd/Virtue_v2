"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";

/**
 * RazorpayCallbackHandler
 *
 * Mounts invisibly in the dashboard layout.
 * When Razorpay redirects back to /dashboard?tab=finance&status=success,
 * it detects the razorpay_* params, calls /api/payments/verify, and
 * shows a floating toast with the result.
 *
 * After processing, it cleans the URL params (replaceState) so a refresh
 * doesn't re-trigger the call.
 */
export function RazorpayCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  type ToastState =
    | { type: "loading"; message: string }
    | { type: "success"; message: string; receipt?: string }
    | { type: "error"; message: string }
    | null;

  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const paymentId   = searchParams.get("razorpay_payment_id");
    const linkId      = searchParams.get("razorpay_payment_link_id");
    const referenceId = searchParams.get("razorpay_payment_link_reference_id");
    const linkStatus  = searchParams.get("razorpay_payment_link_status");
    const signature   = searchParams.get("razorpay_signature");

    // Only act when all Razorpay callback params are present
    if (!paymentId || !linkId || !referenceId || !linkStatus || !signature) return;

    // Remove the razorpay params from the URL immediately so a page refresh
    // doesn't double-process. Keep other params (tab, etc.) intact.
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("razorpay_payment_id");
    cleanUrl.searchParams.delete("razorpay_payment_link_id");
    cleanUrl.searchParams.delete("razorpay_payment_link_reference_id");
    cleanUrl.searchParams.delete("razorpay_payment_link_status");
    cleanUrl.searchParams.delete("razorpay_signature");
    cleanUrl.searchParams.delete("status");
    window.history.replaceState({}, "", cleanUrl.toString());

    // Show loading toast
    setToast({ type: "loading", message: "Confirming your payment with Razorpay..." });

    const verifyUrl = `/api/payments/verify?razorpay_payment_id=${encodeURIComponent(paymentId)}&razorpay_payment_link_id=${encodeURIComponent(linkId)}&razorpay_payment_link_reference_id=${encodeURIComponent(referenceId)}&razorpay_payment_link_status=${encodeURIComponent(linkStatus)}&razorpay_signature=${encodeURIComponent(signature)}`;

    fetch(verifyUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.recorded || data.status === "already_recorded") {
          setToast({
            type: "success",
            message: data.status === "already_recorded"
              ? "Payment already recorded in ledger."
              : "Payment confirmed & recorded in ledger!",
            receipt: data.receiptNumber,
          });
        } else if (data.status === "verified_no_student") {
          setToast({
            type: "error",
            message: "Payment verified but student link missing — needs manual entry.",
          });
        } else {
          setToast({
            type: "error",
            message: data.error || "Could not verify payment. Please check the audit log.",
          });
        }
      })
      .catch(() => {
        setToast({
          type: "error",
          message: "Network error while verifying payment. Check audit log.",
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div
        className={`
          relative flex items-start gap-4 p-5 rounded-2xl shadow-2xl min-w-[320px] max-w-[420px]
          border backdrop-blur-sm
          ${toast.type === "success" ? "bg-emerald-950/95 border-emerald-800/60 text-white" : ""}
          ${toast.type === "error"   ? "bg-rose-950/95 border-rose-800/60 text-white"    : ""}
          ${toast.type === "loading" ? "bg-slate-950/95 border-slate-700/60 text-white"  : ""}
        `}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {toast.type === "error"   && <XCircle      className="w-5 h-5 text-rose-400"    />}
          {toast.type === "loading" && <Loader2      className="w-5 h-5 text-slate-400 animate-spin" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-50 mb-1">
            {toast.type === "success" ? "Razorpay · Payment Confirmed" : ""}
            {toast.type === "error"   ? "Razorpay · Action Needed"     : ""}
            {toast.type === "loading" ? "Razorpay · Verifying..."       : ""}
          </p>
          <p className="text-sm font-bold leading-snug">{toast.message}</p>
          {toast.type === "success" && toast.receipt && (
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {toast.receipt.includes(',') ? "Receipts: " : "Receipt #"}{toast.receipt}
            </p>
          )}
        </div>

        {/* Dismiss */}
        {toast.type !== "loading" && (
          <button
            onClick={() => setToast(null)}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Auto-dismiss for success */}
        {toast.type === "success" && (
          <AutoDismiss onDismiss={() => setToast(null)} durationMs={8000} />
        )}
      </div>
    </div>
  );
}

/** Progress bar that auto-dismisses the toast after N ms */
function AutoDismiss({ onDismiss, durationMs }: { onDismiss: () => void; durationMs: number }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [onDismiss, durationMs]);

  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-800/40 rounded-b-2xl overflow-hidden">
      <div
        className="h-full bg-emerald-400/60 rounded-full"
        style={{
          animation: `shrink ${durationMs}ms linear forwards`,
        }}
      />
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}
