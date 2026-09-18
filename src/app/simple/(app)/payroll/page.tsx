import { requireIdentity } from "@/lib/actions/simple/shared";
import { listMyBranches } from "@/lib/actions/simple/student-actions";
import { PayrollClient } from "@/components/simple/PayrollClient";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

export default async function PayrollPage() {
  const identity = await requireIdentity();

  if (!MANAGER_ROLES.has(identity.role)) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Payroll</h1>
        <p style={{ color: "#b91c1c" }}>Only Owner, Developer, or Platform Admin can run payroll.</p>
      </div>
    );
  }

  const branches = await listMyBranches();

  return (
    <div style={{ display: "grid", gap: 20 }} data-tour="payroll-page">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Payroll</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
          Generate a monthly payroll draft from real attendance, review it, then finalize — every number comes from the
          same engine the school already uses, just presented simply.
        </p>
      </div>
      <PayrollClient branches={branches.success ? branches.data : []} />
    </div>
  );
}
