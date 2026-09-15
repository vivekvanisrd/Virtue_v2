import { StudentForm } from "@/components/simple/StudentForm";

export default function AddStudentPage() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Add a student</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>Just the essentials — you can add more details later.</p>
      </div>
      <StudentForm mode="add" />
    </div>
  );
}
