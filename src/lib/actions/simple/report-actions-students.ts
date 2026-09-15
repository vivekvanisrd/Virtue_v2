"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber, computeTuitionAndAncillary } from "./shared";
import { serializeDecimal } from "../../utils/serialization";

const MANAGER_ROLES = new Set(["OWNER", "DEVELOPER", "PLATFORM_ADMIN"]);

/** Students admitted in a date range — uses academic.admissionDate (the real admission date field), not the DB row's createdAt. */
export async function getNewAdmissionsReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        academic: { admissionDate: { gte: from, lte: to } },
      },
      include: {
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
      },
      orderBy: { academic: { admissionDate: "asc" } },
    });

    const rows = students.map((s) => ({
      id: s.id,
      name: [s.firstName, s.lastName].filter(Boolean).join(" "),
      admissionNumber: s.admissionNumber,
      admissionDate: s.academic?.admissionDate ?? null,
      className: s.academic?.class?.name ?? null,
      branchName: s.branch?.name ?? null,
      parentName: s.family?.fatherName ?? "",
      parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
    }));

    return { success: true as const, data: serializeDecimal({ rows, count: rows.length }) };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load new admissions." };
  }
}

/** Full active roster with contact info and current fee status — the "give me the whole list" export. */
export async function getStudentMasterReport(params: { branchId?: string; className?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(params.className ? { academic: { class: { name: params.className } } } : {}),
      },
      include: {
        financial: { include: { components: true } },
        academic: { include: { class: true, section: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true } },
      },
      orderBy: { firstName: "asc" },
    });

    const rows = students.map((s) => {
      const { tuition, ancillary } = computeTuitionAndAncillary(s.financial as any);
      const extra = (s.financial?.components ?? [])
        .filter((c) => c.isApplicable)
        .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
      const totalCharges = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;
      const paid = s.collections.reduce((sum, c) => sum + toNumber(c.amountPaid), 0);
      return {
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        admissionNumber: s.admissionNumber,
        gender: s.gender ?? "",
        className: s.academic?.class?.name ?? null,
        sectionName: s.academic?.section?.name ?? null,
        branchName: s.branch?.name ?? null,
        parentName: s.family?.fatherName ?? "",
        parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
        totalCharges,
        paid,
        balance: totalCharges - paid,
      };
    });

    return { success: true as const, data: { rows, count: rows.length } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the student master list." };
  }
}

/** Class-summary numbers rolled up one level further — one row per branch, side by side. Owner/Developer only (a STAFF/PRINCIPAL identity only ever sees their own branch, so this collapses to one row for them). */
export async function getBranchSummaryReport() {
  try {
    const identity = await requireIdentity();

    const students = await prisma.student.findMany({
      where: { schoolId: identity.schoolId, isDeleted: false },
      include: {
        financial: { include: { components: true } },
        branch: { select: { name: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, paymentMode: true } },
      },
    });

    const byBranch = new Map<string, { branchName: string; studentCount: number; committed: number; collected: number; cash: number; online: number }>();
    for (const s of students) {
      const branchName = s.branch?.name ?? "(No branch)";
      if (!byBranch.has(branchName)) byBranch.set(branchName, { branchName, studentCount: 0, committed: 0, collected: 0, cash: 0, online: 0 });
      const row = byBranch.get(branchName)!;

      const { tuition, ancillary } = computeTuitionAndAncillary(s.financial as any);
      const extra = (s.financial?.components ?? [])
        .filter((c) => c.isApplicable)
        .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
      const committed = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;

      row.studentCount += 1;
      row.committed += committed;
      for (const c of s.collections) {
        const amt = toNumber(c.amountPaid);
        row.collected += amt;
        if (c.paymentMode === "Cash") row.cash += amt;
        else row.online += amt;
      }
    }

    const rows = [...byBranch.values()]
      .map((r) => ({ ...r, dues: r.committed - r.collected }))
      .sort((a, b) => a.branchName.localeCompare(b.branchName));

    const grandTotal = rows.reduce(
      (acc, r) => ({
        studentCount: acc.studentCount + r.studentCount,
        committed: acc.committed + r.committed,
        collected: acc.collected + r.collected,
        dues: acc.dues + r.dues,
      }),
      { studentCount: 0, committed: 0, collected: 0, dues: 0 }
    );

    return { success: true as const, data: { rows, grandTotal } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the branch summary." };
  }
}

/** Active students with no FinancialRecord, or a FinancialRecord with zero tuition set — a setup-gap finder, not a payment report: these students can't be billed until someone fills in their fee details. */
export async function getRevenueLeakageReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: {
        financial: true,
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
      },
    });

    const rows = students
      .filter((s) => !s.financial || toNumber(s.financial.tuitionFee) === 0)
      .map((s) => ({
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        admissionNumber: s.admissionNumber,
        className: s.academic?.class?.name ?? null,
        branchName: s.branch?.name ?? null,
        parentName: s.family?.fatherName ?? "",
        parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
        hasFinancialRecord: Boolean(s.financial),
      }));

    return { success: true as const, data: { rows, count: rows.length } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the revenue leakage report." };
  }
}

/** How much concession was given, by discount type — uptake and total value per scheme. */
export async function getDiscountUtilizationReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const discounts = await prisma.discount.findMany({
      where: {
        schoolId: identity.schoolId,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: {
        discountType: { select: { name: true } },
        financialRecord: { select: { student: { select: { firstName: true, lastName: true, admissionNumber: true, isDeleted: true } } } },
      },
    });

    const active = discounts.filter((d) => !d.financialRecord.student.isDeleted);
    const byType = new Map<string, { typeName: string; studentCount: number; totalAmount: number }>();
    for (const d of active) {
      const typeName = d.discountType.name;
      if (!byType.has(typeName)) byType.set(typeName, { typeName, studentCount: 0, totalAmount: 0 });
      const row = byType.get(typeName)!;
      row.studentCount += 1;
      row.totalAmount += toNumber(d.amount);
    }

    const rows = [...byType.values()].sort((a, b) => b.totalAmount - a.totalAmount);
    const grandTotal = rows.reduce((s, r) => s + r.totalAmount, 0);
    const detailRows = active.map((d) => ({
      studentName: [d.financialRecord.student.firstName, d.financialRecord.student.lastName].filter(Boolean).join(" "),
      admissionNumber: d.financialRecord.student.admissionNumber,
      typeName: d.discountType.name,
      amount: toNumber(d.amount),
      status: d.status,
    }));

    return { success: true as const, data: { rows, grandTotal, detailRows } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load discount utilization." };
  }
}

/** Students with a transport fee set: fee expected vs collected. Note: this ERP doesn't yet store a per-student stop/route assignment, so stop names aren't available here — only the fee amount. */
export async function getTransportFeeReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = MANAGER_ROLES.has(identity.role);
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        financial: { transportFee: { gt: 0 } },
      },
      include: {
        financial: true,
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, allocatedTo: true } },
      },
    });

    const rows = students.map((s) => {
      const expected = toNumber(s.financial?.transportFee);
      const collected = s.collections
        .filter((c) => (c.allocatedTo as any)?.feeHead === "Transport Fee")
        .reduce((sum, c) => sum + toNumber(c.amountPaid), 0);
      return {
        id: s.id,
        name: [s.firstName, s.lastName].filter(Boolean).join(" "),
        admissionNumber: s.admissionNumber,
        className: s.academic?.class?.name ?? null,
        branchName: s.branch?.name ?? null,
        expected,
        collected,
        balance: expected - collected,
      };
    });

    const grandTotal = { expected: rows.reduce((s, r) => s + r.expected, 0), collected: rows.reduce((s, r) => s + r.collected, 0) };
    return { success: true as const, data: { rows, grandTotal, count: rows.length } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the transport fee report." };
  }
}
