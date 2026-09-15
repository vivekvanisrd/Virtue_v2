"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions/simple/fee-actions";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/actions/simple/payment-modes";

const FEE_HEADS = ["Term 1", "Term 2", "Term 3", "Admission Fee", "Transport Fee", "General"];

export function CollectPaymentForm({ studentId, balance }: { studentId: string; balance: number }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("Cash");
  const [reference, setReference] = useState("");
  const [manualReceiptNumber, setManualReceiptNumber] = useState("");
  const [feeHead, setFeeHead] = useState("Term 1");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [lastReceiptNumber, setLastReceiptNumber] = useState<string | null>(null);
  // Set once an entered amount exceeds the balance due — holds the form until
  // the user explicitly confirms it's a real advance payment, rather than a
  // fat-fingered extra zero. An in-page banner rather than window.confirm()
  // so it matches the rest of this UI's own styling and isn't at the mercy of
  // whatever host/webview the app is opened in.
  const [pendingOverpay, setPendingOverpay] = useState<{ amount: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save(numericAmount: number) {
    startTransition(async () => {
      const res = await recordPayment({
        studentId,
        amount: numericAmount,
        mode,
        reference: reference || undefined,
        feeHead,
        manualReceiptNumber: manualReceiptNumber || undefined,
      });
      if (res.success) {
        setMessage({ kind: "success", text: `Saved — receipt ${res.receiptNumber}.` });
        setLastReceiptNumber(res.receiptNumber);
        setAmount("");
        setReference("");
        setManualReceiptNumber("");
        setPendingOverpay(null);
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not save this payment." });
        setPendingOverpay(null);
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setMessage({ kind: "error", text: "Enter an amount greater than zero." });
      return;
    }
    if (mode !== "Cash" && !reference.trim()) {
      setMessage({ kind: "error", text: `Enter a transaction reference / ID for a ${mode} payment.` });
      return;
    }
    // Balance due is known ahead of time (passed in as a prop) — catches a
    // fat-fingered extra zero before it becomes a real, immutable Collection
    // row. Not a hard block: legitimate advance payments do happen.
    if (balance > 0 && numericAmount > balance) {
      setMessage(null);
      setPendingOverpay({ amount: numericAmount });
      return;
    }
    save(numericAmount);
  }

  return (
    <form
      onSubmit={submit}
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gap: 14,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Collect a payment</h2>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 14, color: "#374151" }}>Amount (₹)</span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setPendingOverpay(null);
          }}
          placeholder={balance > 0 ? String(balance) : "0"}
          style={inputStyle}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Paid by</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)} style={inputStyle}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>For</span>
          <select value={feeHead} onChange={(e) => setFeeHead(e.target.value)} style={inputStyle}>
            {FEE_HEADS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mode !== "Cash" && (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Reference / Transaction ID — {mode}</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={
              mode === "Cheque" ? "Cheque number" : mode === "Card" ? "Approval / auth code" : "UPI ref / UTR / transaction ID"
            }
            style={inputStyle}
          />
        </label>
      )}

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 14, color: "#374151" }}>Manual (paper) receipt # — if you also wrote one (optional)</span>
        <input value={manualReceiptNumber} onChange={(e) => setManualReceiptNumber(e.target.value)} style={inputStyle} />
      </label>

      {pendingOverpay ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 14, display: "grid", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: "#92400e", fontWeight: 600 }}>
            This is ₹{pendingOverpay.amount.toLocaleString("en-IN")}, more than the ₹{balance.toLocaleString("en-IN")} balance due. Save it anyway as an advance payment?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(pendingOverpay.amount)}
              style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#b45309", color: "#ffffff", cursor: isPending ? "default" : "pointer" }}
            >
              {isPending ? "Saving…" : "Yes, save as advance"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setPendingOverpay(null)}
              style={{ fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: isPending ? "default" : "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: "14px 16px",
            borderRadius: 10,
            border: "none",
            background: isPending ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            cursor: isPending ? "default" : "pointer",
          }}
        >
          {isPending ? "Saving…" : "Save payment"}
        </button>
      )}

      {message && (
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            color: message.kind === "success" ? "#15803d" : "#b91c1c",
          }}
        >
          {message.text}
          {message.kind === "success" && lastReceiptNumber && (
            <>
              {" "}
              <a
                href={`/simple/receipts/${lastReceiptNumber}/print`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#2563eb", textDecoration: "underline" }}
              >
                View / print receipt
              </a>
            </>
          )}
        </p>
      )}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  fontSize: 16,
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  color: "#111827",
  background: "#ffffff",
};
