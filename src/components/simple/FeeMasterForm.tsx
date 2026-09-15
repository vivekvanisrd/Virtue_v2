"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFeeMaster, listSectionsForClass } from "@/lib/actions/simple/fee-master-actions";
import { listClassesForBranch } from "@/lib/actions/simple/student-actions";

type Branch = { id: string; name: string };
type Class = { id: string; name: string };
type Section = { id: string; name: string };

export function FeeMasterForm({ branches, classes: initialClasses }: { branches: Branch[]; classes: Class[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [classes, setClasses] = useState<Class[]>(initialClasses);
  const [classId, setClassId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    if (!branchId) return;
    listClassesForBranch(branchId).then((res) => {
      if (res.success) setClasses(res.data);
    });
  }, [branchId]);

  useEffect(() => {
    setSectionId("");
    if (!classId) {
      setSections([]);
      return;
    }
    listSectionsForClass(classId).then((res) => {
      if (res.success) setSections(res.data);
    });
  }, [classId]);
  const [tuitionFee, setTuitionFee] = useState("");
  const [admissionFee, setAdmissionFee] = useState("");
  const [transportFee, setTransportFee] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !classId) {
      setMessage({ kind: "error", text: "Pick a branch and a class." });
      return;
    }
    startTransition(async () => {
      const res = await saveFeeMaster({
        branchId,
        classId,
        sectionId: sectionId || undefined,
        tuitionFee: Number(tuitionFee) || 0,
        admissionFee: Number(admissionFee) || 0,
        transportFee: Number(transportFee) || 0,
      });
      if (res.success) {
        setMessage({ kind: "success", text: "Saved." });
        setTuitionFee("");
        setAdmissionFee("");
        setTransportFee("");
        setClassId("");
        setSectionId("");
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error || "Could not save." });
      }
    });
  }

  return (
    <form onSubmit={submit} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, display: "grid", gap: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#111827" }}>Set a class fee</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Field label="Branch">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={inputStyle}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Class">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={inputStyle}>
            <option value="">— Select —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        {sections.length > 0 && (
          <Field label="Section (leave blank for one fee across the whole class)">
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} style={inputStyle}>
              <option value="">— Whole class —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Annual tuition fee (₹)">
          <input type="number" min={0} value={tuitionFee} onChange={(e) => setTuitionFee(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Admission fee (₹, optional)">
          <input type="number" min={0} value={admissionFee} onChange={(e) => setAdmissionFee(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Transport fee (₹, optional)">
          <input type="number" min={0} value={transportFee} onChange={(e) => setTransportFee(e.target.value)} style={inputStyle} />
        </Field>
      </div>
      <div>
        <button type="submit" disabled={isPending} style={buttonStyle}>{isPending ? "Saving…" : "Save class fee"}</button>
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
