"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDiscountType } from "@/lib/actions/simple/fee-master-actions";

type Branch = { id: string; name: string };

export function DiscountTypeForm({ branches }: { branches: Branch[] }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"amount" | "percentage">("amount");
  const [value, setValue] = useState("");
  const [branchId, setBranchId] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setMessage({ kind: "error", text: "Name is required." });
      return;
    }
    startTransition(async () => {
      const res = await saveDiscountType({ name, kind, value: Number(value) || 0, branchId: branchId || undefined });
      if (res.success) {
        setMessage({ kind: "success", text: "Saved." });
        setName("");
        setValue("");
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not save." });
      }
    });
  }

  return (
    <form onSubmit={submit} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>Add a discount type</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sibling Concession" style={inputStyle} />
        </Field>
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value as "amount" | "percentage")} style={inputStyle}>
            <option value="amount">Fixed amount (₹)</option>
            <option value="percentage">Percentage (%)</option>
          </select>
        </Field>
        <Field label={kind === "amount" ? "Amount (₹)" : "Percentage (%)"}>
          <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Branch (optional — leave blank for all)">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={inputStyle}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <button type="submit" disabled={isPending} style={buttonStyle}>{isPending ? "Saving…" : "Save discount type"}</button>
      </div>
      {message && <p style={{ margin: 0, fontWeight: 600, color: message.kind === "success" ? "#15803d" : "#b91c1c" }}>{message.text}</p>}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = { fontSize: 14, padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827", background: "#ffffff" };
const buttonStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, padding: "10px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" };
