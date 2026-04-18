"use client";

import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, XCircle, Loader2, Terminal,
  CreditCard, RefreshCw, ChevronRight, Zap,
  IndianRupee, User, Hash, AlertTriangle
} from "lucide-react";

declare global {
  interface Window { Razorpay: any; }
}

type LogEntry = { time: string; msg: string; type: "info" | "success" | "error" | "warn" };

export default function TestPayPage() {
  const [amount, setAmount] = useState("1");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("Test Student");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const addLog = (msg: string, type: LogEntry["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-IN", { hour12: false });
    setLogs(prev => [...prev, { time, msg, type }]);
  };

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Load Razorpay JS
  useEffect(() => {
    if (!document.getElementById("razorpay-checkout-js")) {
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => addLog("✅ Razorpay Checkout JS loaded", "success");
      script.onerror = () => addLog("❌ Failed to load Razorpay JS", "error");
      document.head.appendChild(script);
    } else {
      addLog("✅ Razorpay Checkout JS already present", "success");
    }
    addLog(`🔑 Using Key: ${razorpayKey?.slice(0, 15)}...`, "info");
    addLog("Ready. Enter amount and click PAY NOW.", "info");
  }, []);

  const handlePay = async () => {
    if (!window.Razorpay) {
      addLog("❌ Razorpay JS not loaded yet. Please wait.", "error");
      return;
    }
    if (!razorpayKey) {
      addLog("❌ NEXT_PUBLIC_RAZORPAY_KEY_ID is missing!", "error");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // ── Step 1: Create order ──
      addLog(`Creating Razorpay order for ₹${amount}...`, "info");
      const orderRes = await fetch("/api/test-pay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          studentId: studentId || "TEST_STUDENT",
          studentName,
        }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.orderId) {
        addLog(`❌ Order creation failed: ${orderData.error}`, "error");
        setLoading(false);
        return;
      }
      addLog(`✅ Order created: ${orderData.orderId} (₹${orderData.amount / 100})`, "success");

      // ── Step 2: Open Razorpay checkout ──
      addLog("Opening Razorpay checkout...", "info");

      const rzp = new window.Razorpay({
        key: razorpayKey,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: "INR",
        name: "Virtue ERP – Test Lab",
        description: `Test Payment ₹${amount}`,
        image: "",
        prefill: {
          name: studentName,
          email: "test@virtue.edu",
          contact: "9999999999",
        },
        notes: {
          studentId: studentId || "TEST_STUDENT",
          studentName,
          source: "TEST_PAY_LAB",
        },
        theme: { color: "#0f172a" },

        // ── SUCCESS HANDLER ──
        handler: async (response: any) => {
          addLog("🎉 Razorpay returned SUCCESS callback!", "success");
          addLog(`   payment_id: ${response.razorpay_payment_id}`, "success");
          addLog(`   order_id:   ${response.razorpay_order_id}`, "success");
          addLog(`   signature:  ${response.razorpay_signature.slice(0, 20)}...`, "success");

          addLog("Calling /api/test-pay/verify to record in DB...", "info");

          const verifyRes = await fetch("/api/test-pay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyData = await verifyRes.json();

          // Show server-side debug steps in console
          (verifyData.log || []).forEach((l: string) => addLog(`  SERVER: ${l}`, l.startsWith("❌") ? "error" : l.startsWith("⚠️") ? "warn" : "info"));

          if (verifyData.success) {
            addLog(`✅✅ RECORDED IN DB! Receipt: ${verifyData.receipt}`, "success");
            setResult(verifyData);
          } else {
            addLog(`❌ DB record failed: ${verifyData.error}`, "error");
            setResult({ ...verifyData, failed: true });
          }
          setLoading(false);
        },

        // ── MODAL DISMISS HANDLER ──
        modal: {
          ondismiss: () => {
            addLog("⚠️ User CLOSED the payment modal (no payment made).", "warn");
            setLoading(false);
          },
        },
      });

      // ── FAILURE HANDLER ──
      rzp.on("payment.failed", (response: any) => {
        addLog(`❌ Payment FAILED: ${response.error?.description || "Unknown"}`, "error");
        addLog(`   Code: ${response.error?.code}`, "error");
        addLog(`   Reason: ${response.error?.reason}`, "error");
        setResult({ failed: true, error: response.error?.description });
        setLoading(false);
      });

      rzp.open();

    } catch (err: any) {
      addLog(`💥 Unexpected error: ${err.message}`, "error");
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setLogs([]);
    addLog("Reset. Ready for new test.", "info");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0f0f1a] px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Virtue ERP</p>
          <h1 className="text-sm font-bold text-white">Razorpay Payment Test Lab</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest">Live DB Connected</span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">

        {/* ── Left: Controls ── */}
        <div className="space-y-4">

          {/* Config Card */}
          <div className="bg-[#12121e] border border-white/8 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/70">Payment Config</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Amount (₹)</label>
                <div className="flex items-center gap-2 bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3">
                  <IndianRupee className="w-4 h-4 text-white/30" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-white text-lg font-bold outline-none"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Student ID <span className="text-white/20">(optional — leave blank for pure test)</span></label>
                <div className="flex items-center gap-2 bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3">
                  <Hash className="w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm font-bold outline-none"
                    placeholder="e.g. cmabcd1234..."
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1 block">Display Name</label>
                <div className="flex items-center gap-2 bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3">
                  <User className="w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="flex-1 bg-transparent text-white text-sm font-bold outline-none"
                    placeholder="Test Student"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handlePay}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl transition-all active:scale-95"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> PROCESSING...</>
                  : <><Zap className="w-4 h-4" /> PAY ₹{amount} NOW</>
                }
              </button>
              <button
                onClick={reset}
                className="px-4 py-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                title="Reset"
              >
                <RefreshCw className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                This uses your <strong>TEST</strong> Razorpay keys. Use Razorpay test card: <strong>4111 1111 1111 1111</strong>, any future expiry, any CVV.
              </p>
            </div>
          </div>

          {/* Result Card */}
          {result && (
            <div className={`border rounded-2xl p-5 ${result.failed ? "bg-rose-950/40 border-rose-500/30" : "bg-emerald-950/40 border-emerald-500/30"}`}>
              <div className="flex items-center gap-3 mb-4">
                {result.failed
                  ? <XCircle className="w-6 h-6 text-rose-400" />
                  : <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                }
                <div>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">
                    {result.failed ? "Payment Failed" : "Payment Recorded ✅"}
                  </p>
                  <p className="text-base font-black">
                    {result.failed ? result.error || "Unknown failure" : `Receipt #${result.receipt}`}
                  </p>
                </div>
              </div>
              {!result.failed && (
                <div className="space-y-1.5 text-[11px]">
                  {[
                    ["Amount", `₹${result.amount}`],
                    ["Payment ID", result.paymentId],
                    ["Order ID", result.orderId],
                    ["Method", result.paymentMethod || "—"],
                    ["Bank RRN", result.bankRrn || "—"],
                    ["Student", result.studentName],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between opacity-80">
                      <span className="text-white/40 uppercase tracking-wider">{k}</span>
                      <span className="text-white font-mono text-right max-w-[55%] truncate">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Debug Console ── */}
        <div className="bg-[#0d0d14] border border-white/8 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "500px" }}>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#12121e] border-b border-white/5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest text-white/50">Live Debug Console</span>
            <div className="ml-auto text-[10px] text-white/20">{logs.length} entries</div>
          </div>

          <div
            ref={logRef}
            className="flex-1 overflow-y-auto p-4 space-y-1.5 text-[11px] leading-relaxed"
          >
            {logs.length === 0 && (
              <p className="text-white/20 italic">Waiting for events...</p>
            )}
            {logs.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-white/20 flex-shrink-0 select-none">{entry.time}</span>
                <span className={
                  entry.type === "success" ? "text-emerald-400" :
                  entry.type === "error"   ? "text-rose-400"    :
                  entry.type === "warn"    ? "text-amber-400"   :
                  "text-white/70"
                }>
                  {entry.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center pb-8 text-[10px] text-white/20">
        Writes to <span className="text-white/40">Collection</span> table in your actual Supabase DB &middot; Fully isolated from ERP UI
      </div>
    </div>
  );
}
