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

    const [todayCollections, monthCollections, studentCount, duesReport] = await Promise.all([
      prisma.collection.aggregate({
        where: { status: "Success", isDeleted: false, paymentDate: { gte: startOfDay(now) } },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.collection.aggregate({
        where: { status: "Success", isDeleted: false, paymentDate: { gte: startOfMonth(now) } },
        _sum: { amountPaid: true },
        _count: true,
      }),
      prisma.student.count({ where: { isDeleted: false } }),
      getPendingDuesReport(),
    ]);

    // NOTE: the tenancy sanitizer strips `branchId` off any RETURNED row (see
    // recursiveSanitize in prisma-tenancy.ts) — that includes groupBy results.
    // So a per-branch breakdown has to come from one `count` call per known
    // branch (branchId as a *filter* is untouched), not a groupBy read-back.
    let branches: { name: string; students: number }[] | null = null;
    if (identity.role === "OWNER" || identity.role === "DEVELOPER") {
      // See student-actions.ts note: Branch.status casing is inconsistent, and
      // an empty `where` is rejected outright as an "ambiguous query" by the
      // tenancy extension, hence the NOT clause below.
      const branchRows = await prisma.branch.findMany({
        where: { NOT: { status: { equals: "Inactive", mode: "insensitive" } } },
        select: { id: true, name: true },
      });
      branches = await Promise.all(
        branchRows.map(async (b) => ({
          name: b.name,
          students: await prisma.student.count({ where: { branchId: b.id, isDeleted: false } }),
        }))
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
        branches,
      },
    };
  } catch (error: any) {
    return { success: false as const, error: error.message ?? "Could not load the dashboard." };
  }
}
