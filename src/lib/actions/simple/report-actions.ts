"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber, computeTuitionAndAncillary } from "./shared";
import { serializeDecimal } from "../../utils/serialization";

export type CollectionSortKey = "dateDesc" | "dateAsc" | "amountDesc" | "amountAsc" | "nameAsc" | "nameDesc";

/** Collection report for a date range — the daily/period cash-up sheet. */
export async function getCollectionReport(params: {
  from: string;
  to: string;
  paymentMode?: "all" | "Cash" | "Online";
  feeHead?: string;
  collectedBy?: string;
  className?: string;
  branchId?: string;
  sortBy?: CollectionSortKey;
}) {
  try {
    const identity = await requireIdentity();
    const from = new Date(params.from + "T00:00:00");
    const to = new Date(params.to + "T23:59:59");
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const collections = await prisma.collection.findMany({
      where: {
        status: "Success",
        isDeleted: false,
        paymentDate: { gte: from, lte: to },
        ...(params.paymentMode && params.paymentMode !== "all" ? { paymentMode: params.paymentMode } : {}),
        ...(params.collectedBy ? { collectedBy: params.collectedBy } : {}),
        ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
        ...(params.className ? { student: { academic: { class: { name: params.className } } } } : {}),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    });

    let rows = collections.map((c) => ({
      id: c.id,
      receiptNumber: c.receiptNumber,
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

    const totalsByMode = rows.reduce<Record<string, number>>((acc, c) => {
      acc[c.paymentMode] = (acc[c.paymentMode] || 0) + c.amountPaid;
      return acc;
    }, {});
    const grandTotal = Object.values(totalsByMode).reduce((a, b) => a + b, 0);

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
    await requireIdentity();
    const collections = await prisma.collection.findMany({
      where: { status: "Success", isDeleted: false },
      select: { collectedBy: true, allocatedTo: true },
    });
    const collectors = [...new Set(collections.map((c) => c.collectedBy).filter(Boolean))].sort();
    const feeHeads = [...new Set(collections.map((c) => (c.allocatedTo as any)?.feeHead).filter(Boolean))].sort();
    return { success: true as const, data: { collectors, feeHeads } };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load filter options." };
  }
}

export type DuesSortKey = "balanceDesc" | "balanceAsc" | "nameAsc" | "nameDesc" | "totalFeeDesc" | "totalFeeAsc" | "paidDesc" | "paidAsc";

/** Every student with a balance still owed, highest first (by default). */
export async function getPendingDuesReport(params: {
  className?: string;
  branchId?: string;
  minBalance?: number;
  sortBy?: DuesSortKey;
} = {}) {
  try {
    const identity = await requireIdentity();
    const canPickBranch = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.role === "PLATFORM_ADMIN";
    const effectiveBranchId = canPickBranch ? params.branchId : identity.branchId;

    const where: any = {
      isDeleted: false,
      ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
      ...(params.className ? { academic: { class: { name: params.className } } } : {}),
    };

    const [students, paidByStudent] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          financial: { include: { components: true } },
          academic: { include: { class: true } },
          branch: { select: { name: true } },
        },
      }),
      prisma.collection.groupBy({
        by: ["studentId"],
        where: { status: "Success", isDeleted: false },
        _sum: { amountPaid: true },
      }),
    ]);

    const paidMap = new Map(paidByStudent.map((row) => [row.studentId, toNumber(row._sum.amountPaid)]));

    let rows = students
      .map((s) => {
        const { tuition, ancillary } = computeTuitionAndAncillary(s.financial as any);
        const extra = (s.financial?.components ?? [])
          .filter((c) => c.isApplicable)
          .reduce((sum, c) => sum + toNumber(c.baseAmount) - toNumber(c.waiverAmount) - toNumber(c.discountAmount), 0);
        const totalCharges = tuition + ancillary.reduce((sum, r) => sum + r.amount, 0) + extra;
        const paid = paidMap.get(s.id) ?? 0;
        const balance = totalCharges - paid;
        return {
          id: s.id,
          name: [s.firstName, s.lastName].filter(Boolean).join(" "),
          admissionNumber: s.admissionNumber,
          className: s.academic?.class?.name ?? null,
          branchName: s.branch?.name ?? null,
          totalCharges,
          paid,
          balance,
        };
      })
      .filter((r) => r.balance > 0);

    if (params.minBalance) rows = rows.filter((r) => r.balance >= params.minBalance!);

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

export async function lookupReceipt(query: string) {
  try {
    await requireIdentity();
    const q = query.trim();
    if (!q) return { success: true as const, data: null };

    const collection = await prisma.collection.findFirst({
      where: { receiptNumber: { contains: q, mode: "insensitive" }, isDeleted: false },
      include: { student: { select: { firstName: true, lastName: true, admissionNumber: true } } },
    });

    if (!collection) return { success: true as const, data: null };

    return {
      success: true as const,
      data: serializeDecimal({
        receiptNumber: collection.receiptNumber,
        studentName: [collection.student.firstName, collection.student.lastName].filter(Boolean).join(" "),
        admissionNumber: collection.student.admissionNumber,
        amountPaid: collection.amountPaid,
        paymentMode: collection.paymentMode,
        paymentReference: collection.paymentReference,
        paymentDate: collection.paymentDate,
        collectedBy: collection.collectedBy,
        studentId: collection.studentId,
      }),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Lookup failed." };
  }
}
