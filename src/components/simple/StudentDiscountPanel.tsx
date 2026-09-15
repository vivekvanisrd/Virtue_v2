"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyDiscountToStudent, removeDiscountFromStudent, listDiscountTypes } from "@/lib/actions/simple/fee-master-actions";

type Discount = { id: string; name: string; amount: number; reason: string | null; status: string };
type DiscountType = { id: string; name: string; amount: number | null; percentage: number | null };

function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function StudentDiscountPanel({ studentId, branchId, discounts }: { studentId: string; branchId: string; discounts: Discount[] }) {
  const [types, setTypes] = useState<DiscountType[]>([]);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    listDiscountTypes(branchId).then((res) => {
      if (res.success) setTypes(res.data.filter((d) => d.isActive));
    });
  }, [branchId]);

  function apply() {
    if (!selected) return;
    startTransition(async () => {
      const res = await applyDiscountToStudent({ studentId, discountTypeId: selected });
      if (res.success) {
        setMessage({ kind: "success", text: `Applied — ₹${res.amount}.` });
        setSelected("");
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not apply." });
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await removeDiscountFromStudent(id, studentId);
      if (res.success) {
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not remove." });
      }
    });
  }

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 12 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#111827" }}>Discounts</h2>

      {discounts.length === 0 ? (
        <p style={{ color: "#6b7280", margin: 0 }}>No discounts applied.</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {discounts.map((d, i) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
              <span>
                <span style={{ color: "#9ca3af", marginRight: 6 }}>{i + 1}.</span>
                {d.name} <span style={{ color: "#9ca3af" }}>({d.status})</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <strong>{money(d.amount)}</strong>
                <button onClick={() => remove(d.id)} disabled={isPending} style={removeButtonStyle}>Remove</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={inputStyle}>
          <option value="">— Apply a discount —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.amount != null ? `(₹${t.amount})` : t.percentage != null ? `(${t.percentage}%)` : ""}
            </option>
          ))}
        </select>
        <button onClick={apply} disabled={isPending || !selected} style={buttonStyle}>{isPending ? "Saving…" : "Apply"}</button>
      </div>
      {message && <p style={{ margin: 0, fontWeight: 600, color: message.kind === "success" ? "#15803d" : "#b91c1c" }}>{message.text}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = { fontSize: 14, padding: "9px 10px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" };
const buttonStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, padding: "9px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" };
const removeButtonStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" };
