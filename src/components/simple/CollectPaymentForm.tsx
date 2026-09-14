"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/lib/actions/simple/fee-actions";

const FEE_HEADS = ["Tuition", "Admission", "Transport", "General"];

export function CollectPaymentForm({ studentId, balance }: { studentId: string; balance: number }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"Cash" | "Online">("Cash");
  const [reference, setReference] = useState("");
  const [feeHead, setFeeHead] = useState("General");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setMessage({ kind: "error", text: "Enter an amount greater than zero." });
      return;
    }
    startTransition(async () => {
      const res = await recordPayment({
        studentId,
        amount: numericAmount,
        mode,
        reference: reference || undefined,
        feeHead,
      });
      if (res.success) {
        setMessage({ kind: "success", text: `Saved — receipt ${res.receiptNumber}.` });
        setAmount("");
        setReference("");
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not save this payment." });
      }
    });
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
          onChange={(e) => setAmount(e.target.value)}
          placeholder={balance > 0 ? String(balance) : "0"}
          style={inputStyle}
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Paid by</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as "Cash" | "Online")} style={inputStyle}>
            <option value="Cash">Cash</option>
            <option value="Online">Online / UPI</option>
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

      {mode === "Online" && (
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Transaction / UTR reference (optional)</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />
        </label>
      )}

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

      {message && (
        <p
          style={{
            margin: 0,
            fontWeight: 600,
            color: message.kind === "success" ? "#15803d" : "#b91c1c",
          }}
        >
          {message.text}
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
