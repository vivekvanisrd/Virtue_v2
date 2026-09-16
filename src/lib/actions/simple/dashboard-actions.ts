"use server";

import prisma from "../../prisma";
import { requireIdentity, toNumber } from "./shared";
import { getPendingDuesReport } from "./report-actions";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function getDashboardSummary() {
  try {
    const identity = await requireIdentity();
    const now = new Date();

    // IMPORTANT: DEVELOPER/PLATFORM_ADMIN identities bypass the tenancy
    // extension's automatic schoolId injection entirely (by design, for
    // platform-wide maintenance access) — see prisma-tenancy.ts. That means
    // every query in this module must filter by identity.schoolId EXPLICITLY;
    // relying on auto-scoping silently returns data across every school in
    // the database for those roles, which is exactly the leak this comment
    // is here to prevent from recurring.
    const schoolId = identity.schoolId;

    const [todayCollections, monthCollections, studentCount, duesReport] = await Promise.all([
      prisma.collection.aggregate({
        where: { schoolId, status: "Success", isDeleted: false, paymentDate: { gte: startOfDay(now) } },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.collection.aggregate({
        where: { schoolId, status: "Success", isDeleted: false, paymentDate: { gte: startOfMonth(now) } },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.student.count({ where: { schoolId, isDeleted: false } }),
      getPendingDuesReport(),
    ]);

    // NOTE: the tenancy sanitizer strips `branchId` off any RETURNED row (see
    // recursiveSanitize in prisma-tenancy.ts) — that includes groupBy results.
    // So a per-branch breakdown has to come from one set of calls per known
    // branch (branchId as a *filter* is untouched), not a groupBy read-back.
    let branchStats:
      | {
          id: string;
          name: string;
          todayTotal: number;
          todayCount: number;
          monthTotal: number;
          monthCount: number;
          studentCount: number;
          pendingDuesTotal: number;
          pendingDuesCount: number;
        }[]
      | null = null;
    if (identity.role === "OWNER" || identity.role === "DEVELOPER") {
      // See student-actions.ts note: Branch.status casing is inconsistent, and
      // an empty `where` is rejected outright as an "ambiguous query" by the
      // tenancy extension, hence the NOT clause below.
      const branchRows = await prisma.branch.findMany({
        where: { schoolId, NOT: { status: { equals: "Inactive", mode: "insensitive" } } },
        select: { id: true, name: true },
      });
      branchStats = await Promise.all(
        branchRows.map(async (b) => {
          const [today, month, count, dues] = await Promise.all([
            prisma.collection.aggregate({
              where: { schoolId, branchId: b.id, status: "Success", isDeleted: false, paymentDate: { gte: startOfDay(now) } },
              _sum: { amountPaid: true },
              _count: true,
            }),
            prisma.collection.aggregate({
              where: { schoolId, branchId: b.id, status: "Success", isDeleted: false, paymentDate: { gte: startOfMonth(now) } },
              _sum: { amountPaid: true },
              _count: true,
            }),
            prisma.student.count({ where: { schoolId, branchId: b.id, isDeleted: false } }),
            getPendingDuesReport({ branchId: b.id }),
          ]);
          return {
            id: b.id,
            name: b.name,
            todayTotal: toNumber(today._sum.amountPaid),
            todayCount: today._count,
            monthTotal: toNumber(month._sum.amountPaid),
            monthCount: month._count,
            studentCount: count,
            pendingDuesTotal: dues.success ? dues.data.totalDue : 0,
            pendingDuesCount: dues.success ? dues.data.count : 0,
          };
        })
      );
    }

    return {
      success: true as const,
      data: {
        todayTotal: toNumber(todayCollections._sum.amountPaid),
        todayCount: todayCollections._count,
        monthTotal: toNumber(monthCollections._sum.amountPaid),
        monthCount: monthCollections._count,
        studentCount,
        pendingDuesTotal: duesReport.success ? duesReport.data.totalDue : 0,
        pendingDuesCount: duesReport.success ? duesReport.data.count : 0,
        branchStats,
        viewerBranchId: identity.branchId ?? null,
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the dashboard." };
  }
}
