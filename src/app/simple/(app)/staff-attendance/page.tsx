import { requireIdentity } from "@/lib/actions/simple/shared";
import { listMyBranches } from "@/lib/actions/simple/student-actions";
import { StaffAttendanceClient } from "@/components/simple/StaffAttendanceClient";

const VIEWER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN", "PRINCIPAL"]);
const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

export default async function StaffAttendancePage() {
  const identity = await requireIdentity();

  if (!VIEWER_ROLES.has(identity.role)) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Staff attendance</h1>
        <p style={{ color: "#b91c1c" }}>Only Owner, Developer, Platform Admin, or Principal can view staff attendance.</p>
      </div>
    );
  }

  const canPickBranch = MANAGER_ROLES.has(identity.role);
  const branches = canPickBranch ? await listMyBranches() : null;

  return (
    <div style={{ display: "grid", gap: 20 }} data-tour="staff-attendance-page">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#111827" }}>Staff attendance</h1>
        <p style={{ color: "#4b5563", margin: "4px 0 0" }}>
          Monthly present/absent/late counts per staff member, sourced from the same biometric attendance data the school
          already collects — plus a way to mark or correct a day by hand for staff without a working punch yet.
        </p>
      </div>
      <StaffAttendanceClient branches={canPickBranch && branches?.success ? branches.data : []} />
    </div>
  );
}
