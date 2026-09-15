import { listFeeMaster } from "@/lib/actions/simple/fee-master-actions";
import { listMyBranches, listDistinctClassNames } from "@/lib/actions/simple/student-actions";
import { FeeMasterForm } from "@/components/simple/FeeMasterForm";
import { FeeMasterTable } from "@/components/simple/FeeMasterTable";

export default async function FeeMasterPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const [result, branchesRes, classesRes] = await Promise.all([
    listFeeMaster(undefined, sp.q || undefined),
    listMyBranches(),
    listDistinctClassNames(),
  ]);

  const branches = branchesRes.success ? branchesRes.data : [];
  const rows = result.success ? result.data : [];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Fee Master</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
          The standard fee for each class. When a class is picked while adding a student, this fee auto-fills — staff can still edit it per student.
        </p>
      </div>

      <FeeMasterForm branches={branches} classes={[]} />

      <form method="GET" style={{ display: "flex", gap: 10 }}>
        <input
          type="text"
          name="q"
          defaultValue={sp.q || ""}
          placeholder="Search by class name…"
          style={{ flex: 1, maxWidth: 320, fontSize: 14, padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", color: "#111827" }}
        />
        <button type="submit" style={{ fontSize: 14, fontWeight: 600, padding: "9px 16px", borderRadius: 8, border: "none", background: "#2563eb", color: "#ffffff", cursor: "pointer" }}>
          Search
        </button>
      </form>

      {!result.success ? (
        <p style={{ color: "#b91c1c" }}>{result.error}</p>
      ) : (
        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <FeeMasterTable rows={rows} />
        </div>
      )}
    </div>
  );
}
