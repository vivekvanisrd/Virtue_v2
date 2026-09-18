"use server";

/**
 * Staff attendance for /simple — a thin, tenancy-aware view over the SAME
 * StaffAttendance data the legacy biometric pipeline already writes to
 * (src/app/api/iclock/cdata/route.ts), plus a manual-correction path for
 * staff without a working biometric punch yet (the school's second device
 * isn't attached at time of writing). Reuses the legacy aggregation function
 * (getMonthlyStaffAttendanceSummary) rather than re-deriving present/absent/
 * late counts independently — see that function's own fix history for the
 * "HALF_DAY" vs "half-day" casing bug this module would otherwise inherit.
 */

import prisma from "../../prisma";
import { requireIdentity } from "./shared";
import { getMonthlyStaffAttendanceSummary } from "../attendance-actions";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);
const VIEWER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN", "PRINCIPAL"]);

function displayName(s: { firstName: string; lastName: string }) {
  return [s.firstName, s.lastName].filter(Boolean).join(" ");
}

/**
 * Per-staff monthly present/absent/late/half-day counts for one branch, plus
 * a day-level breakdown for the drill-down view.
 */
export async function getBranchAttendanceSummary(params: { month: number; year: number; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    if (!VIEWER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only Owner, Developer, Platform Admin, or Principal can view staff attendance." };
    }

    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    if (!effectiveBranchId) {
      return { success: false as const, error: "No branch to show — pick a branch." };
    }

    const staffList = await prisma.staff.findMany({
      where: { schoolId: identity.schoolId, branchId: effectiveBranchId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, staffCode: true, role: true },
      orderBy: { firstName: "asc" },
    });

    const summaryResult = await getMonthlyStaffAttendanceSummary(params.month, params.year, effectiveBranchId);
    if (!summaryResult.success) {
      return { success: false as const, error: (summaryResult as any).error || "Could not load attendance." };
    }
    const summary = (summaryResult as any).summary as Record<
      string,
      { present: number; absent: number; lwp: number; lateCount: number; days: Record<string, { status: string; checkIn: string | null; checkOut: string | null; isLate: boolean }> }
    >;

    const rows = staffList.map((s) => ({
      staffId: s.id,
      name: displayName(s),
      staffCode: s.staffCode,
      role: s.role,
      present: summary[s.id]?.present ?? 0,
      absent: summary[s.id]?.absent ?? 0,
      lwp: summary[s.id]?.lwp ?? 0,
      lateCount: summary[s.id]?.lateCount ?? 0,
      days: summary[s.id]?.days ?? {},
    }));

    return { success: true as const, data: { branchId: effectiveBranchId, canPickBranch, rows } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load staff attendance." };
  }
}

/**
 * Marks or corrects one staff member's one day. Upserts on the existing
 * @@unique([staffId, date]) constraint — a day with zero punches has no
 * existing row at all, so this must be able to create, not just update.
 */
export async function correctAttendanceDay(input: {
  staffId: string;
  date: string; // "YYYY-MM-DD"
  status: "Present" | "Absent" | "Late" | "Half-Day";
  checkIn?: string | null; // "HH:mm"
  checkOut?: string | null;
  remarks?: string;
}) {
  try {
    const identity = await requireIdentity();
    if (!VIEWER_ROLES.has(identity.role)) {
      return { success: false as const, error: "Only Owner, Developer, Platform Admin, or Principal can correct attendance." };
    }

    const canPickBranch = MANAGER_ROLES.has(identity.role);
    // The tenancy extension strips the scalar schoolId/branchId off every
    // RETURNED row for every role (a documented gotcha in this codebase) —
    // read the branch id off the nested relation's own id instead, never
    // off Staff.branchId directly, or this always comes back undefined.
    const staff = await prisma.staff.findFirst({
      where: { id: input.staffId, schoolId: identity.schoolId },
      select: { id: true, branch: { select: { id: true } } },
    });
    if (!staff) {
      return { success: false as const, error: "Staff member not found." };
    }
    const staffBranchId = staff.branch?.id ?? null;
    if (!canPickBranch && staffBranchId !== identity.branchId) {
      return { success: false as const, error: "That staff member is not in your branch." };
    }

    const dateOnly = new Date(`${input.date}T00:00:00`);
    const buildTime = (t: string | null | undefined) => {
      if (!t) return null;
      const [hh, mm] = t.split(":").map(Number);
      const d = new Date(dateOnly);
      d.setHours(hh || 0, mm || 0, 0, 0);
      return d;
    };

    await prisma.staffAttendance.upsert({
      where: { staffId_date: { staffId: staff.id, date: dateOnly } },
      update: {
        status: input.status,
        checkIn: buildTime(input.checkIn),
        checkOut: buildTime(input.checkOut),
        isOverridden: true,
        overriddenAt: new Date(),
        overriddenBy: identity.name || identity.role,
        remarks: input.remarks || null,
      },
      create: {
        staffId: staff.id,
        date: dateOnly,
        status: input.status,
        checkIn: buildTime(input.checkIn),
        checkOut: buildTime(input.checkOut),
        schoolId: identity.schoolId,
        branchId: staffBranchId,
        isOverridden: true,
        overriddenAt: new Date(),
        overriddenBy: identity.name || identity.role,
        remarks: input.remarks || null,
      },
    });

    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not save the correction." };
  }
}
