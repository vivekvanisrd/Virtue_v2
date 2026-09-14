"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listMyBranches, listClassesForBranch, createStudent } from "@/lib/actions/simple/student-actions";

type Branch = { id: string; name: string; code: string };
type Class = { id: string; name: string };

export function AddStudentForm() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [canPickBranch, setCanPickBranch] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [classes, setClasses] = useState<Class[]>([]);
  const [classId, setClassId] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [tuitionFee, setTuitionFee] = useState("");
  const [admissionFee, setAdmissionFee] = useState("");
  const [transportFee, setTransportFee] = useState("");
  const [concession, setConcession] = useState("");

  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listMyBranches().then((res) => {
      if (!res.success) return;
      setBranches(res.data);
      setCanPickBranch(res.canPickBranch);
      const initial = res.myBranchId || res.data[0]?.id || "";
      setBranchId(initial);
    });
  }, []);

  useEffect(() => {
    if (!branchId) {
      setClasses([]);
      return;
    }
    listClassesForBranch(branchId).then((res) => {
      if (res.success) setClasses(res.data);
    });
  }, [branchId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setMessage({ kind: "error", text: "Student name is required." });
      return;
    }
    startTransition(async () => {
      const res = await createStudent({
        firstName,
        lastName,
        branchId,
        classId: classId || undefined,
        parentName,
        parentPhone,
        tuitionFee: Number(tuitionFee) || 0,
        admissionFee: Number(admissionFee) || 0,
        transportFee: Number(transportFee) || 0,
        concession: Number(concession) || 0,
      });
      if (res.success) {
        setMessage({ kind: "success", text: `Added — admission number ${res.admissionNumber}.` });
        setTimeout(() => router.push(`/simple/students/${res.studentId}`), 700);
      } else {
        setMessage({ kind: "error", text: res.error || "Could not add this student." });
      }
    });
  }

  const branchName = branches.find((b) => b.id === branchId)?.name;

  return (
    <form onSubmit={submit} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, display: "grid", gap: 16, maxWidth: 560 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} autoFocus />
        </Field>
        <Field label="Last name (optional)">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Branch">
          {canPickBranch ? (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} style={inputStyle}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ ...inputStyle, background: "#f9fafb", color: "#6b7280" }}>{branchName || "Your branch"}</div>
          )}
        </Field>
        <Field label="Class (optional)">
          <select value={classId} onChange={(e) => setClassId(e.target.value)} style={inputStyle}>
            <option value="">— Not set —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Parent name (optional)">
          <input value={parentName} onChange={(e) => setParentName(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Parent phone (optional)">
          <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Fees</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Annual tuition fee (₹)">
            <input type="number" min={0} value={tuitionFee} onChange={(e) => setTuitionFee(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Concession (₹, optional)">
            <input type="number" min={0} value={concession} onChange={(e) => setConcession(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Admission fee (₹, optional)">
            <input type="number" min={0} value={admissionFee} onChange={(e) => setAdmissionFee(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Transport fee (₹, optional)">
            <input type="number" min={0} value={transportFee} onChange={(e) => setTransportFee(e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

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
        {isPending ? "Saving…" : "Add student"}
      </button>

      {message && (
        <p style={{ margin: 0, fontWeight: 600, color: message.kind === "success" ? "#15803d" : "#b91c1c" }}>{message.text}</p>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>
      {children}
    </label>
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
