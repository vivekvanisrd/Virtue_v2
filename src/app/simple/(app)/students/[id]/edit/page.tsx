import Link from "next/link";
import { getStudentForEdit } from "@/lib/actions/simple/student-actions";
import { StudentForm } from "@/components/simple/StudentForm";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getStudentForEdit(id);

  if (!result.success) {
    return (
      <div>
        <Link href="/simple/students" style={{ color: "#2563eb" }}>
          ← Back to students
        </Link>
        <p style={{ marginTop: 16, color: "#b91c1c", fontWeight: 600 }}>{result.error}</p>
      </div>
    );
  }

  const s = result.data;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <Link href={`/simple/students/${id}`} style={{ color: "#2563eb", fontSize: 14 }}>
          ← Back to {s.firstName}
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 0", color: "#111827" }}>Edit student</h1>
      </div>
      <StudentForm
        mode="edit"
        studentId={id}
        initialValues={{
          firstName: s.firstName,
          lastName: s.lastName,
          gender: s.gender,
          branchId: s.branchId,
          classId: s.classId,
          sectionId: s.sectionId,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          tuitionFee: s.tuitionFee ? String(s.tuitionFee) : "",
          concession: s.concession ? String(s.concession) : "",
          admissionFee: s.admissionFee ? String(s.admissionFee) : "",
          transportFee: s.transportFee ? String(s.transportFee) : "",
        }}
      />
    </div>
  );
}
