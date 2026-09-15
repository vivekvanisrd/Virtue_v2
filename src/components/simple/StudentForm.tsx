"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listMyBranches, listClassesForBranch, createStudent, updateStudent } from "@/lib/actions/simple/student-actions";
import { getFeeStructureForClass, listDiscountTypes, listSectionsForClass } from "@/lib/actions/simple/fee-master-actions";

type Branch = { id: string; name: string; code: string };
type Class = { id: string; name: string };
type Section = { id: string; name: string };
type DiscountType = { id: string; name: string; amount: number | null; percentage: number | null };
type FeeOption = { feeStructureId: string; sectionId: string | null; sectionName: string | null; tuitionFee: number; admissionFee: number; transportFee: number };

function money(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export type StudentFormValues = {
  firstName: string;
  lastName: string;
  gender: string;
  branchId: string;
  classId: string;
  sectionId: string;
  parentName: string;
  parentPhone: string;
  tuitionFee: string;
  concession: string;
  admissionFee: string;
  transportFee: string;
};

const EMPTY_VALUES: StudentFormValues = {
  firstName: "",
  lastName: "",
  gender: "",
  branchId: "",
  classId: "",
  sectionId: "",
  parentName: "",
  parentPhone: "",
  tuitionFee: "",
  concession: "",
  admissionFee: "",
  transportFee: "",
};

export function StudentForm({
  mode,
  studentId,
  initialValues,
}: {
  mode: "add" | "edit";
  studentId?: string;
  initialValues?: Partial<StudentFormValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<StudentFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [canPickBranch, setCanPickBranch] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [feeOptions, setFeeOptions] = useState<FeeOption[]>([]);
  const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
  const [discountTypeId, setDiscountTypeId] = useState("");
  const [feeStructureId, setFeeStructureId] = useState<string | undefined>(undefined);
  const [classFeeNote, setClassFeeNote] = useState<string | null>(null);
  // Tracks whether the fee fields hold a value the STAFF typed (or a saved
  // record's existing value, in edit mode) vs. one the Fee Master auto-filled
  // — only auto-filled values get silently replaced when the class/section
  // selection changes; anything the user actually typed is left alone.
  const feesUserEdited = useRef(Boolean(initialValues?.tuitionFee || initialValues?.admissionFee || initialValues?.transportFee));
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof StudentFormValues>(key: K, value: string) {
    if (key === "tuitionFee" || key === "admissionFee" || key === "transportFee") {
      feesUserEdited.current = true;
    }
    setValues((v) => ({ ...v, [key]: value }));
  }

  useEffect(() => {
    listMyBranches().then((res) => {
      if (!res.success) return;
      setBranches(res.data);
      setCanPickBranch(res.canPickBranch);
      if (!initialValues?.branchId) {
        const initial = res.myBranchId || res.data[0]?.id || "";
        setValues((v) => ({ ...v, branchId: initial }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!values.branchId) {
      setClasses([]);
      return;
    }
    listClassesForBranch(values.branchId).then((res) => {
      if (res.success) setClasses(res.data);
    });
    listDiscountTypes(values.branchId).then((res) => {
      if (res.success) setDiscountTypes(res.data.filter((d) => d.isActive));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.branchId]);

  // A class can have more than one Fee Master entry (e.g. two sections
  // priced differently) — load both the section list and this class's fee
  // option(s) whenever the class changes. Only clear a previously-picked
  // section when the class actually changes after mount (not on the first
  // render), so editing an existing student doesn't wipe their saved section.
  const prevClassId = useRef(values.classId);
  useEffect(() => {
    if (!values.classId) {
      setSections([]);
      setFeeOptions([]);
      prevClassId.current = values.classId;
      return;
    }
    listSectionsForClass(values.classId).then((res) => {
      if (res.success) setSections(res.data);
    });
    if (values.branchId) {
      getFeeStructureForClass(values.branchId, values.classId).then((res) => {
        setFeeOptions(res.success ? res.data : []);
      });
    }
    if (prevClassId.current !== values.classId) {
      setValues((v) => ({ ...v, sectionId: "" }));
    }
    prevClassId.current = values.classId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.classId, values.branchId]);

  // Auto-populate fees from the Fee Master — only fills in fields that are
  // still empty/zero, so it never silently overwrites numbers the user (or a
  // saved record, in edit mode) already set. When a class has more than one
  // fee option (by section), wait for a section to be picked before filling.
  useEffect(() => {
    if (feeOptions.length === 0) {
      setFeeStructureId(undefined);
      setClassFeeNote(null);
      return;
    }
    const singleClassWide = feeOptions.length === 1 && !feeOptions[0].sectionId ? feeOptions[0] : null;
    const matchingForSection = values.sectionId ? feeOptions.find((o) => o.sectionId === values.sectionId) : null;
    const option = singleClassWide || matchingForSection;

    if (!option) {
      setFeeStructureId(undefined);
      setClassFeeNote(`This class has ${feeOptions.length} different fees by section — pick a section above to auto-fill.`);
      return;
    }
    setFeeStructureId(option.feeStructureId);
    setClassFeeNote(
      `Class standard fee${option.sectionName ? ` (Section ${option.sectionName})` : ""} — Tuition ${money(option.tuitionFee)}${option.admissionFee ? ` + Admission ${money(option.admissionFee)}` : ""}${option.transportFee ? ` + Transport ${money(option.transportFee)}` : ""}`
    );
    if (!feesUserEdited.current) {
      setValues((v) => ({
        ...v,
        tuitionFee: String(option.tuitionFee || ""),
        admissionFee: String(option.admissionFee || ""),
        transportFee: String(option.transportFee || ""),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeOptions, values.sectionId]);

  function applyDiscountChoice(id: string) {
    setDiscountTypeId(id);
    const type = discountTypes.find((d) => d.id === id);
    if (!type) return;
    const tuition = Number(values.tuitionFee) || 0;
    const amount = type.amount != null ? type.amount : type.percentage != null ? Math.round((type.percentage / 100) * tuition) : 0;
    set("concession", String(amount));
  }

  const committedFee = Math.max((Number(values.tuitionFee) || 0) - (Number(values.concession) || 0), 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.firstName.trim()) {
      setMessage({ kind: "error", text: "Student name is required." });
      return;
    }
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      gender: values.gender || undefined,
      branchId: values.branchId,
      classId: values.classId || undefined,
      sectionId: values.sectionId || undefined,
      parentName: values.parentName,
      parentPhone: values.parentPhone,
      tuitionFee: Number(values.tuitionFee) || 0,
      admissionFee: Number(values.admissionFee) || 0,
      transportFee: Number(values.transportFee) || 0,
      concession: Number(values.concession) || 0,
    };

    startTransition(async () => {
      if (mode === "add") {
        const res = await createStudent({ ...payload, feeStructureId, discountTypeId: discountTypeId || undefined });
        if (res.success) {
          setMessage({ kind: "success", text: `Added — admission number ${res.admissionNumber}.` });
          setTimeout(() => router.push(`/simple/students/${res.studentId}`), 700);
        } else {
          setMessage({ kind: "error", text: res.error || "Could not add this student." });
        }
      } else {
        const res = await updateStudent(studentId!, payload);
        if (res.success) {
          setMessage({ kind: "success", text: "Saved." });
          router.refresh();
          setTimeout(() => router.push(`/simple/students/${studentId}`), 500);
        } else {
          setMessage({ kind: "error", text: res.error || "Could not save changes." });
        }
      }
    });
  }

  const branchName = branches.find((b) => b.id === values.branchId)?.name;

  return (
    <form onSubmit={submit} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, display: "grid", gap: 16, maxWidth: 560 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="First name">
          <input value={values.firstName} onChange={(e) => set("firstName", e.target.value)} style={inputStyle} autoFocus />
        </Field>
        <Field label="Last name (optional)">
          <input value={values.lastName} onChange={(e) => set("lastName", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Gender (optional)">
          <select value={values.gender} onChange={(e) => set("gender", e.target.value)} style={inputStyle}>
            <option value="">— Not set —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Class (optional)">
          <select value={values.classId} onChange={(e) => set("classId", e.target.value)} style={inputStyle}>
            <option value="">— Not set —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {sections.length > 0 && (
        <Field label={feeOptions.length > 1 ? "Section (needed to auto-fill the right fee)" : "Section (optional)"}>
          <select value={values.sectionId} onChange={(e) => set("sectionId", e.target.value)} style={inputStyle}>
            <option value="">— Not set —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Branch">
        {canPickBranch ? (
          <select value={values.branchId} onChange={(e) => set("branchId", e.target.value)} style={inputStyle}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Parent name (optional)">
          <input value={values.parentName} onChange={(e) => set("parentName", e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Parent phone (optional)">
          <input value={values.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, display: "grid", gap: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>Fees</div>
        {classFeeNote && <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>{classFeeNote} — auto-filled from the Fee Master, edit freely below.</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Annual tuition fee (₹)">
            <input type="number" min={0} value={values.tuitionFee} onChange={(e) => set("tuitionFee", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Admission fee (₹, optional)">
            <input type="number" min={0} value={values.admissionFee} onChange={(e) => set("admissionFee", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Transport fee (₹, optional)">
            <input type="number" min={0} value={values.transportFee} onChange={(e) => set("transportFee", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Apply a discount (optional)">
            <select value={discountTypeId} onChange={(e) => applyDiscountChoice(e.target.value)} style={inputStyle}>
              <option value="">— None —</option>
              {discountTypes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.amount != null ? `(₹${d.amount})` : d.percentage != null ? `(${d.percentage}%)` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Concession (₹, optional — auto-filled by the discount above)">
            <input type="number" min={0} value={values.concession} onChange={(e) => set("concession", e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "#374151" }}>Committed (payable) fee</span>
          <strong style={{ color: "#15803d" }}>{money(committedFee)}</strong>
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
        {isPending ? "Saving…" : mode === "add" ? "Add student" : "Save changes"}
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
