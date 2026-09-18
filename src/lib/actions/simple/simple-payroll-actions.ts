"use server";

/**
 * /simple payroll — thin, role-gated wrappers around the REAL, already-live
 * payroll engine in src/lib/actions/payroll-actions.ts (attendance-linked:
 * it already consumes getMonthlyStaffAttendanceSummary and populates
 * attendedDays/lwpDays/payableDays). No payroll math is reimplemented here —
 * every number comes from that engine. This file's only job is: resolve a
 * tenancy-correct branch default, and gate every action to MANAGER_ROLES
 * (the underlying engine functions only check "is there a session," not
 * role, so /simple must enforce that itself).
 *
 * Named "simple-payroll-actions.ts" (not "payroll-actions.ts") deliberately,
 * to avoid colliding with the legacy file of the same short name.
 */

import { requireIdentity } from "./shared";
import {
  generatePayrollDraftAction,
  savePayrollDraftAction,
  finalizePayrollAction,
  syncPayrollProfessionalAction,
  markSlipAsPaidAction,
  exportBankCSVAction,
  getHistoricalPayrollRunsAction,
} from "../payroll-actions";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

async function requireManager() {
  const identity = await requireIdentity();
  if (!MANAGER_ROLES.has(identity.role)) {
    throw new Error("Only Owner, Developer, or Platform Admin can run payroll.");
  }
  return identity;
}

export async function listPayrollRuns() {
  try {
    await requireManager();
    const result: any = await getHistoricalPayrollRunsAction();
    if (!result.success) return { success: false as const, error: result.error || "Could not load payroll history." };
    return { success: true as const, data: result.data };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load payroll history." };
  }
}

/**
 * Generates (or resumes) a Draft for one branch/month. Always passes `null`
 * for totalWorkingDays — /simple never triggers the manual-override branch
 * of generatePayrollDraftAction (which requires a written justification
 * reason the legacy UI itself doesn't reliably supply) — the working-day
 * count always comes from the engine's own SchoolCalendar-based calculation.
 */
export async function generateBranchPayrollDraft(input: { month: number; year: number; branchId?: string }) {
  try {
    const identity = await requireManager();
    const effectiveBranchId = input.branchId || identity.branchId;
    if (!effectiveBranchId) {
      return { success: false as const, error: "Pick a branch to generate payroll for." };
    }
    const result: any = await generatePayrollDraftAction(input.month, input.year, null, effectiveBranchId);
    if (!result.success) return { success: false as const, error: result.error || "Could not generate the payroll draft." };
    return { success: true as const, data: result.data, message: result.message };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not generate the payroll draft." };
  }
}

export async function saveDraftEdits(payrollRunId: string, slipsUpdates: any[]) {
  try {
    await requireManager();
    const result: any = await savePayrollDraftAction(payrollRunId, slipsUpdates);
    if (!result.success) return { success: false as const, error: result.error || "Could not save the changes." };
    return { success: true as const, message: result.message };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not save the changes." };
  }
}

export async function syncDraftWithLatestProfiles(payrollRunId: string) {
  try {
    await requireManager();
    const result: any = await syncPayrollProfessionalAction(payrollRunId);
    if (!result.success) return { success: false as const, error: result.error || "Could not sync with the latest salary profiles." };
    return { success: true as const, message: result.message };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not sync with the latest salary profiles." };
  }
}

/** Posts ledger entries and seals each slip's hash — irreversible without an Owner-only unlock in the legacy engine. */
export async function finalizeBranchPayroll(payrollRunId: string) {
  try {
    await requireManager();
    const result: any = await finalizePayrollAction(payrollRunId);
    if (!result.success) return { success: false as const, error: result.error || "Could not finalize this payroll run." };
    return { success: true as const, data: result.data };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not finalize this payroll run." };
  }
}

export async function markSlipPaid(slipId: string, paymentMode: string, paymentRef: string) {
  try {
    await requireManager();
    const result: any = await markSlipAsPaidAction(slipId, paymentMode, paymentRef);
    if (!result.success) return { success: false as const, error: result.error || "Could not mark this slip as paid." };
    return { success: true as const };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not mark this slip as paid." };
  }
}

export async function exportBankFile(payrollRunId: string, format: "GENERIC" | "AXIS_INTERNAL" | "AXIS_EXTERNAL" = "GENERIC", selectedIds?: string[]) {
  try {
    await requireManager();
    const result: any = await exportBankCSVAction(payrollRunId, format, selectedIds);
    if (!result.success) return { success: false as const, error: result.error || "Could not export the bank file." };
    return { success: true as const, csvData: result.csvData as string };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not export the bank file." };
  }
}
