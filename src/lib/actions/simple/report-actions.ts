"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber, computeTuitionAndAncillary, computeTermBreakdown } from "./shared";
import { serializeDecimal } from "../../utils/serialization";
import { revalidatePath } from "next/cache";

export type CollectionSortKey = "dateDesc" | "dateAsc" | "amountDesc" | "amountAsc" | "nameAsc" | "nameDesc";

/** Collection report for a date range — the daily/period cash-up sheet. */
export async function getCollectionReport(params: {
  from: string;
  to: string;
  paymentMode?: string;
  feeHead?: string;
  collectedBy?: string;
  className?: string;
  branchId?: string;
  manualReceiptNumber?: string;
  q?: string;
  sortBy?: CollectionSortKey;
}) {
  try {
    const identity = await requireIdentity();
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    // Built separately (not spread inline) because className and q both need
    // to filter on `student` — spreading two `student` keys into one object
    // would have the second silently clobber the first instead of ANDing.
    const studentWhere: any = {};
    if (params.className) studentWhere.academic = { class: { name: params.className } };
    if (params.q) {
      studentWhere.OR = [
        { firstName: { contains: params.q, mode: "insensitive" } },
        { lastName: { contains: params.q, mode: "insensitive" } },
        { admissionNumber: { contains: params.q, mode: "insensitive" } },
      ];
    }

    const collections = await prisma.collection.findMany({
      where: {
        // Explicit schoolId: DEVELOPER/PLATFORM_ADMIN identities bypass the
        // tenancy extension's auto-scoping (see dashboard-actions.ts note),
        // so every query here must filter by school itself, not rely on it.
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(params.paymentMode && params.paymentMode !== "all" ? { paymentMode: params.paymentMode } : {}),
        ...(params.collectedBy ? { collectedBy: params.collectedBy } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(params.manualReceiptNumber ? { bookReceiptNo: { contains: params.manualReceiptNumber, mode: "insensitive" } } : {}),
        ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    });

    let rows = collections.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      receiptNumber: c.receiptNumber,
      bookReceiptNo: c.bookReceiptNo,
      studentName: [c.student.firstName, c.student.lastName].filter(Boolean).join(" "),
      admissionNumber: c.student.admissionNumber,
      amountPaid: toNumber(c.amountPaid),
      paymentMode: c.paymentMode,
      paymentDate: c.paymentDate,
      collectedBy: c.collectedBy,
      feeHead: (c.allocatedTo as any)?.feeHead ?? null,
    }));

    if (params.feeHead) rows = rows.filter((r) => r.feeHead === params.feeHead);

    const sortBy = params.sortBy ?? "dateDesc";
    const cmp = {
      dateDesc: (a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
      dateAsc: (a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
      amountDesc: (a: any, b: any) => b.amountPaid - a.amountPaid,
      amountAsc: (a: any, b: any) => a.amountPaid - b.amountPaid,
      nameAsc: (a: any, b: any) => a.studentName.localeCompare(b.studentName),
      nameDesc: (a: any, b: any) => b.studentName.localeCompare(a.studentName),
    }[sortBy];
    rows.sort(cmp);

    const totalsByMode: Record<string, number> = {};
    for (const c of rows) totalsByMode[c.paymentMode] = (totalsByMode[c.paymentMode] || 0) + c.amountPaid;
    const grandTotal = Object.values(totalsByMode).reduce((a: number, b: number) => a + b, 0);

    return {
      success: true as const,
      data: serializeDecimal({ rows, totalsByMode, grandTotal, count: rows.length }),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the report." };
  }
}

/** Distinct staff names ("collected by") and fee heads seen in Collection rows, for filter dropdowns. */
export async function getCollectionFilterOptions() {
  try {
    const identity = await requireIdentity();
    const collections = await prisma.collection.findMany({
      where: { schoolId: identity.schoolId, status: "Success", isDeleted: false },
      select: { collectedBy: true, allocatedTo: true, paymentMode: true },
    });
    const collectors = [...new Set(collections.map((c) => c.collectedBy).filter(Boolean))].sort();
    const feeHeads = [...new Set(collections.map((c) => (c.allocatedTo as any)?.feeHead).filter(Boolean))].sort();
    const paymentModes = [...new Set(collections.map((c) => c.paymentMode).filter(Boolean))].sort();
    return { success: true as const, data: { collectors, feeHeads, paymentModes } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load filter options." };
  }
}

/**
 * Applied by the Collection report's "View as Excel" grid. Deliberately only
 * touches the manual receipt # and "collected by" name — correcting a typo
 * or linking a paper receipt after the fact is safe; the amount, mode, and
 * date of a real payment are not editable here (Collection rows are treated
 * as an immutable financial record everywhere else in this app too).
 */
export async function bulkUpdateCollectionFields(
  rows: { id: string; changes: Partial<{ bookReceiptNo: string; collectedBy: string }> }[]
) {
  try {
    const identity = await requireIdentity();
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const row of rows) {
      try {
        const data: Record<string, any> = {};
        if (row.changes.bookReceiptNo !== undefined) data.bookReceiptNo = row.changes.bookReceiptNo.trim() || null;
        if (row.changes.collectedBy !== undefined) data.collectedBy = row.changes.collectedBy.trim();
        await prisma.collection.update({ where: { id: row.id, schoolId: identity.schoolId } as any, data });
        results.push({ id: row.id, success: true });
      } catch (error: any) {
        results.push({ id: row.id, success: false, error: error.message });
      }
    }

    const failed = results.filter((r) => !r.success);
    revalidatePath("/simple/reports/collection");
    return {
      success: failed.length === 0,
      saved: results.length - failed.length,
      failed: failed.length,
      errors: failed.map((f) => `${f.id}: ${f.error}`),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not save changes.", saved: 0, failed: rows.length, errors: [] };
  }
}

export type DuesSortKey = "balanceDesc" | "balanceAsc" | "nameAsc" | "nameDesc" | "totalFeeDesc" | "totalFeeAsc" | "paidDesc" | "paidAsc";

/** Every student with a balance still owed, highest first (by default). */
export async function getPendingDuesReport(params: {
  className?: string;
  branchId?: string;
  minBalance?: number;
  termFilter?: import("./student-actions").TermFilter;
  q?: string;
  sortBy?: DuesSortKey;
} = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const where: any = {
      schoolId: identity.schoolId,
      isDeleted: false,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(params.className ? { academic: { class: { name: params.className } } } : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { admissionNumber: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // Fetched per-student (not a groupBy aggregate) so term-wise paid amounts
    // can be derived the same way listStudents/getStudentBalance do — one
    // shared computeTermBreakdown, not a second diverging calculation.
    const students = await prisma.student.findMany({
      where,
      include: {
        financial: { include: { components: true } },
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, allocatedTo: true } },
      },
    });

    let rows = students
      .map((s) => {
        const { tuition, ancillary } = computeTuitionAndAncillary(s.financial as any);
        const extra = (s.financial?.components ?? [])
          .filter((c) => c.isApplicable)
          .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
        const totalCharges = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;
        const paid = s.collections.reduce((sum, c) => sum + toNumber(c.amountPaid), 0);
        const balance = totalCharges - paid;
        const termBreakdown = computeTermBreakdown(s.financial as any, s.collections);
        return {
          id: s.id,
          name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          firstName: s.firstName,
          lastName: s.lastName ?? "",
          admissionNumber: s.admissionNumber,
          className: s.academic?.class?.name ?? null,
          branchName: s.branch?.name ?? null,
          parentName: s.family?.fatherName ?? "",
          parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
          totalCharges,
          paid,
          balance,
          termBreakdown,
        };
      })
      .filter((r) => r.balance > 0);

    if (params.minBalance) rows = rows.filter((r) => r.balance >= params.minBalance!);

    const termFilter = params.termFilter ?? "all";
    if (termFilter === "partial") rows = rows.filter((r) => r.paid > 0 && r.balance > 0);
    if (termFilter === "term1-due") rows = rows.filter((r) => r.termBreakdown.term1.status === "due" || r.termBreakdown.term1.status === "partial");
    if (termFilter === "term1-paid") rows = rows.filter((r) => r.termBreakdown.term1.status === "paid");
    if (termFilter === "term2-due") rows = rows.filter((r) => r.termBreakdown.term2.status === "due" || r.termBreakdown.term2.status === "partial");
    if (termFilter === "term2-paid") rows = rows.filter((r) => r.termBreakdown.term2.status === "paid");
    if (termFilter === "term3-due") rows = rows.filter((r) => r.termBreakdown.term3.status === "due" || r.termBreakdown.term3.status === "partial");
    if (termFilter === "term3-paid") rows = rows.filter((r) => r.termBreakdown.term3.status === "paid");

    const sortBy = params.sortBy ?? "balanceDesc";
    const cmp = {
      balanceDesc: (a: any, b: any) => b.balance - a.balance,
      balanceAsc: (a: any, b: any) => a.balance - b.balance,
      nameAsc: (a: any, b: any) => a.name.localeCompare(b.name),
      nameDesc: (a: any, b: any) => b.name.localeCompare(a.name),
      totalFeeDesc: (a: any, b: any) => b.totalCharges - a.totalCharges,
      totalFeeAsc: (a: any, b: any) => a.totalCharges - b.totalCharges,
      paidDesc: (a: any, b: any) => b.paid - a.paid,
      paidAsc: (a: any, b: any) => a.paid - b.paid,
    }[sortBy];
    rows.sort(cmp);

    const totalDue = rows.reduce((sum, r) => sum + r.balance, 0);

    return { success: true as const, data: { rows, totalDue, count: rows.length } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load pending dues." };
  }
}

/**
 * Individual/page search for the Fees domain — matches a receipt number OR
 * a manual (paper) receipt number, and returns every match (not just the
 * first): a manual receipt sometimes covers more than one Collection row
 * (e.g. one paper receipt for both tuition and transport in the same
 * visit), so a single match would silently hide the others.
 */
export async function lookupReceipt(query: string) {
  try {
    const identity = await requireIdentity();
    const q = query.trim();
    if (!q) return { success: true as const, data: [] };

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        OR: [{ receiptNumber: { contains: q, mode: "insensitive" } }, { bookReceiptNo: { contains: q, mode: "insensitive" } }],
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { paymentDate: "desc" },
      take: 20,
    });

    return {
      success: true as const,
      data: collections.map((collection) =>
        serializeDecimal({
          id: collection.id,
          receiptNumber: collection.receiptNumber,
          bookReceiptNo: collection.bookReceiptNo,
          studentName: [collection.student.firstName, collection.student.lastName].filter(Boolean).join(" "),
          admissionNumber: collection.student.admissionNumber,
          amountPaid: collection.amountPaid,
          paymentMode: collection.paymentMode,
          paymentReference: collection.paymentReference,
          paymentDate: collection.paymentDate,
          collectedBy: collection.collectedBy,
          studentId: collection.studentId,
        })
      ),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Lookup failed." };
  }
}

/** One receipt's full detail for the printable receipt view — exact receiptNumber match only. */
export async function getReceiptByNumber(receiptNumber: string) {
  try {
    const identity = await requireIdentity();
    const collection = await prisma.collection.findFirst({
      where: { schoolId: identity.schoolId, receiptNumber, isDeleted: false },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
            academic: { select: { class: { select: { name: true } }, section: { select: { name: true } } } },
            family: { select: { fatherName: true } },
          },
        },
        school: { select: { name: true, address: true, phone: true } },
        branch: { select: { name: true, address: true } },
      },
    });
    if (!collection) return { success: false as const, error: "No receipt found with that number." };

    return {
      success: true as const,
      data: serializeDecimal({
        receiptNumber: collection.receiptNumber,
        bookReceiptNo: collection.bookReceiptNo,
        amountPaid: collection.amountPaid,
        paymentMode: collection.paymentMode,
        paymentReference: collection.paymentReference,
        paymentDate: collection.paymentDate,
        collectedBy: collection.collectedBy,
        feeHead: (collection.allocatedTo as any)?.feeHead ?? null,
        studentName: [collection.student.firstName, collection.student.lastName].filter(Boolean).join(" "),
        admissionNumber: collection.student.admissionNumber,
        className: collection.student.academic?.class?.name ?? null,
        sectionName: collection.student.academic?.section?.name ?? null,
        fatherName: collection.student.family?.fatherName ?? null,
        schoolName: collection.school?.name ?? null,
        schoolAddress: collection.school?.address ?? null,
        schoolPhone: collection.school?.phone ?? null,
        branchName: collection.branch?.name ?? null,
        branchAddress: collection.branch?.address ?? null,
      }),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load receipt." };
  }
}

/** Sequential list of every receipt issued in a range — an audit register, ordered strictly by receipt number, for cross-checking against the physical receipt book. */
export async function getReceiptRegisterReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { receiptNumber: "asc" },
    });

    const rows = collections.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      receiptNumber: c.receiptNumber,
      bookReceiptNo: c.bookReceiptNo,
      studentName: [c.student.firstName, c.student.lastName].filter(Boolean).join(" "),
      admissionNumber: c.student.admissionNumber,
      amountPaid: toNumber(c.amountPaid),
      paymentMode: c.paymentMode,
      paymentDate: c.paymentDate,
    }));
    const total = rows.reduce((s, r) => s + r.amountPaid, 0);

    return { success: true as const, data: serializeDecimal({ rows, total, count: rows.length }) };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the receipt register." };
  }
}

/** One day's full cash-up sheet: every collection that day, cash/online split, staff-wise. */
export async function getDayBookReport(params: { date: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.date + "T00:00:00");
    const to = new Date(params.date + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { paymentDate: "asc" },
    });

    const rows = collections.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      receiptNumber: c.receiptNumber,
      studentName: [c.student.firstName, c.student.lastName].filter(Boolean).join(" "),
      admissionNumber: c.student.admissionNumber,
      amountPaid: toNumber(c.amountPaid),
      paymentMode: c.paymentMode,
      feeHead: (c.allocatedTo as any)?.feeHead ?? null,
      collectedBy: c.collectedBy,
      paymentDate: c.paymentDate,
    }));

    const cash = rows.filter((r) => r.paymentMode === "Cash").reduce((s, r) => s + r.amountPaid, 0);
    const online = rows.filter((r) => r.paymentMode !== "Cash").reduce((s, r) => s + r.amountPaid, 0);
    const byStaff: Record<string, number> = {};
    for (const r of rows) byStaff[r.collectedBy || "—"] = (byStaff[r.collectedBy || "—"] || 0) + r.amountPaid;

    return {
      success: true as const,
      data: serializeDecimal({ rows, cash, online, total: cash + online, count: rows.length, byStaff }),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the day book." };
  }
}

/** Collections grouped by payment mode, with a day-by-day trend for the range. */
export async function getPaymentModeReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      select: { amountPaid: true, paymentMode: true, paymentDate: true },
    });

    const totalsByMode: Record<string, number> = {};
    const countsByMode: Record<string, number> = {};
    const byDay = new Map<string, { date: string; cash: number; online: number }>();
    for (const c of collections) {
      const amt = toNumber(c.amountPaid);
      totalsByMode[c.paymentMode] = (totalsByMode[c.paymentMode] || 0) + amt;
      countsByMode[c.paymentMode] = (countsByMode[c.paymentMode] || 0) + 1;
      const day = c.paymentDate.toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { date: day, cash: 0, online: 0 });
      const row = byDay.get(day)!;
      if (c.paymentMode === "Cash") row.cash += amt;
      else row.online += amt;
    }

    const dailyRows = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
    const grandTotal = Object.values(totalsByMode).reduce((a, b) => a + b, 0);

    return { success: true as const, data: { totalsByMode, countsByMode, grandTotal, dailyRows } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the payment mode report." };
  }
}

/** Collections grouped by fee head (Tuition/Admission/Transport/General) — revenue split by category. */
export async function getFeeHeadLedgerReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      select: { amountPaid: true, paymentMode: true, allocatedTo: true },
    });

    const byHead = new Map<string, { feeHead: string; cash: number; online: number; total: number; count: number }>();
    for (const c of collections) {
      const head = (c.allocatedTo as any)?.feeHead || "General";
      if (!byHead.has(head)) byHead.set(head, { feeHead: head, cash: 0, online: 0, total: 0, count: 0 });
      const row = byHead.get(head)!;
      const amt = toNumber(c.amountPaid);
      row.total += amt;
      row.count += 1;
      if (c.paymentMode === "Cash") row.cash += amt;
      else row.online += amt;
    }

    const rows = [...byHead.values()].sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return { success: true as const, data: { rows, grandTotal } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the fee head ledger." };
  }
}

/** Collections grouped by who collected them — a staff cash-handling summary, not a KPI ranking. */
export async function getCollectorPerformanceReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      select: { amountPaid: true, paymentMode: true, collectedBy: true },
    });

    const byStaff = new Map<string, { collectedBy: string; cash: number; online: number; total: number; count: number }>();
    for (const c of collections) {
      const name = c.collectedBy || "—";
      if (!byStaff.has(name)) byStaff.set(name, { collectedBy: name, cash: 0, online: 0, total: 0, count: 0 });
      const row = byStaff.get(name)!;
      const amt = toNumber(c.amountPaid);
      row.total += amt;
      row.count += 1;
      if (c.paymentMode === "Cash") row.cash += amt;
      else row.online += amt;
    }

    const rows = [...byStaff.values()].sort((a, b) => b.total - a.total);
    const grandTotal = rows.reduce((s, r) => s + r.total, 0);

    return { success: true as const, data: { rows, grandTotal } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the collector report." };
  }
}

/** Audit trail of every reversed/voided collection — who reversed what, and why it no longer counts. */
export async function getReversedCollectionsReport(params: { from: string; to: string; branchId?: string }) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");

    const collections = await prisma.collection.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "Reversed",
        paymentDate: { gte: from, lte: to },
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
      orderBy: { paymentDate: "desc" },
    });

    const rows = collections.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      receiptNumber: c.receiptNumber,
      studentName: [c.student.firstName, c.student.lastName].filter(Boolean).join(" "),
      admissionNumber: c.student.admissionNumber,
      amountPaid: toNumber(c.amountPaid),
      paymentMode: c.paymentMode,
      feeHead: (c.allocatedTo as any)?.feeHead ?? null,
      collectedBy: c.collectedBy,
      paymentDate: c.paymentDate,
      note: (c.allocatedTo as any)?.auditMeta?.note ?? null,
    }));
    const total = rows.reduce((s, r) => s + r.amountPaid, 0);

    return { success: true as const, data: serializeDecimal({ rows, total, count: rows.length }) };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load reversed collections." };
  }
}

/** Every student currently overpaid (paid more than committed) — a real, ongoing state now that the overpayment guard warns but doesn't block advance payments. */
export async function getAdvancePaymentsReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: {
        financial: { include: { components: true } },
        academic: { include: { class: true } },
        branch: { select: { name: true } },
        family: { select: { fatherName: true, fatherPhone: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true } },
      },
    });

    const rows = students
      .map((s) => {
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
          className: s.academic?.class?.name ?? null,
          branchName: s.branch?.name ?? null,
          parentName: s.family?.fatherName ?? "",
          parentPhone: (s.family?.fatherPhone ?? "").replace(/\.0$/, ""),
          totalCharges,
          paid,
          advance: paid - totalCharges,
        };
      })
      .filter((r) => r.advance > 0)
      .sort((a, b) => b.advance - a.advance);

    const totalAdvance = rows.reduce((s, r) => s + r.advance, 0);
    return { success: true as const, data: { rows, totalAdvance, count: rows.length } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load advance payments." };
  }
}

/** Term 1/2/3 due vs paid, rolled up per class across the whole branch (not just one student). */
export async function getTermWiseCollectionReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
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
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, allocatedTo: true } },
      },
    });

    type Row = { className: string; term1Due: number; term1Paid: number; term2Due: number; term2Paid: number; term3Due: number; term3Paid: number };
    const byClass = new Map<string, Row>();
    for (const s of students) {
      const className = s.academic?.class?.name ?? "(No class)";
      if (!byClass.has(className)) byClass.set(className, { className, term1Due: 0, term1Paid: 0, term2Due: 0, term2Paid: 0, term3Due: 0, term3Paid: 0 });
      const row = byClass.get(className)!;
      const tb = computeTermBreakdown(s.financial as any, s.collections);
      row.term1Due += tb.term1.due;
      row.term1Paid += tb.term1.paid;
      row.term2Due += tb.term2.due;
      row.term2Paid += tb.term2.paid;
      row.term3Due += tb.term3.due;
      row.term3Paid += tb.term3.paid;
    }

    const rows = [...byClass.values()].sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
    return { success: true as const, data: { rows } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the term-wise report." };
  }
}

/**
 * Per class+section rollup: committed fee, collected, dues, Term-1 collection,
 * and cash/online split — deliberately matches the exact column layout of the
 * school's own hand-kept Excel "Sheet1" (COLLECTION DETAILS) summary,
 * including its class+section granularity (e.g. "1ST A" and "1ST B" as
 * separate rows, not merged), so staff can visually check it against the
 * sheet they already trust instead of learning a new shape from scratch.
 */
export async function getClassSummaryReport(params: { branchId?: string } = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const students = await prisma.student.findMany({
      where: {
        schoolId: identity.schoolId,
        isDeleted: false,
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      },
      include: {
        financial: { include: { components: true } },
        academic: { include: { class: true, section: true } },
        collections: { where: { status: "Success", isDeleted: false }, select: { amountPaid: true, paymentMode: true, allocatedTo: true } },
      },
    });

    type Row = { className: string; studentCount: number; committed: number; collected: number; term1Collection: number; cash: number; online: number };
    const byClass = new Map<string, Row>();
    for (const s of students) {
      const base = s.academic?.class?.name ?? "(No class)";
      const className = s.academic?.section?.name ? `${base} ${s.academic.section.name}` : base;
      if (!byClass.has(className)) byClass.set(className, { className, studentCount: 0, committed: 0, collected: 0, term1Collection: 0, cash: 0, online: 0 });
      const row = byClass.get(className)!;

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
        if ((c.allocatedTo as any)?.feeHead === "Term 1") row.term1Collection += amt;
        if (c.paymentMode === "Cash") row.cash += amt;
        else row.online += amt;
      }
    }

    const rows = [...byClass.values()]
      .map((r) => ({ ...r, dues: r.committed - r.collected }))
      .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));

    const grandTotal = rows.reduce(
      (acc, r) => ({
        studentCount: acc.studentCount + r.studentCount,
        committed: acc.committed + r.committed,
        collected: acc.collected + r.collected,
        term1Collection: acc.term1Collection + r.term1Collection,
        dues: acc.dues + r.dues,
        cash: acc.cash + r.cash,
        online: acc.online + r.online,
      }),
      { studentCount: 0, committed: 0, collected: 0, term1Collection: 0, dues: 0, cash: 0, online: 0 }
    );

    const percentCollected = grandTotal.committed > 0 ? (grandTotal.collected / grandTotal.committed) * 100 : 0;
    const averagePerStudent = grandTotal.studentCount > 0 ? grandTotal.collected / grandTotal.studentCount : 0;

    return { success: true as const, data: { rows, grandTotal, percentCollected, averagePerStudent } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the class summary." };
  }
}
