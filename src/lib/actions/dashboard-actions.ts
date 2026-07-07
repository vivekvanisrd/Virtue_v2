"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { unstable_noStore as noStore } from "next/cache";

export async function getDashboardStatsAction() {
  noStore();
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // Define date boundaries for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasBranchContext = context.branchId && context.branchId !== 'GLOBAL';
    const branchFilter = hasBranchContext ? { branchId: context.branchId } : {};

    // Resolve active academic year
    const activeAY = await prisma.academicYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true }
    });

    if (!activeAY) {
      throw new Error("Active academic year not found.");
    }

    // 1-8. Parallel database queries via Promise.all
    const [
      studentCount,
      teacherCount,
      expectationStats,
      collectionsStatsGroup,
      dailyRevenue,
      recentCollectionsRaw,
      classes,
      voidRequests
    ] = await Promise.all([
      prisma.student.count({
        where: { schoolId: context.schoolId, status: "CONFIRMED", ...branchFilter }
      }),
      prisma.staff.count({
        where: { schoolId: context.schoolId, role: "TEACHER", ...branchFilter, status: "ACTIVE" }
      }),
      // BUG-1 FIX: Use StudentFeeComponent as the source of truth (not legacy annualTuition)
      prisma.studentFeeComponent.aggregate({
        where: {
          schoolId: context.schoolId,
          isApplicable: true,
          ...branchFilter,
          financialRecord: {
            student: {
              academic: {
                academicYear: activeAY.id
              }
            }
          }
        },
        _sum: { baseAmount: true, waiverAmount: true, discountAmount: true }
      }),
      prisma.collection.groupBy({
        by: ['paymentMode'],
        where: { schoolId: context.schoolId, status: "Success", isDeleted: false, ...branchFilter },
        _sum: { amountPaid: true, totalPaid: true }
      }),
      prisma.collection.aggregate({
        where: { 
          schoolId: context.schoolId,
          paymentDate: { gte: today },
          status: "Success",
          isDeleted: false,
          ...branchFilter
        },
        _sum: { totalPaid: true }
      }),
      prisma.collection.findMany({
        where: { schoolId: context.schoolId, status: "Success", isDeleted: false, ...branchFilter },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { paymentDate: "desc" },
        take: 5
      }),
      prisma.class.findMany({
        where: { schoolId: context.schoolId, ...branchFilter },
        select: {
          id: true,
          name: true,
          academicRecords: {
            where: { academicYear: activeAY.id },
            select: {
              student: {
                select: {
                  id: true,
                  financial: {
                    select: {
                      // Legacy fallback fields (used only when components[] is empty)
                      annualTuition: true,
                      totalDiscount: true,
                      // BUG-1 FIX: Include component-level sums for accurate per-student expected fee
                      components: {
                        where: { isApplicable: true },
                        select: {
                          baseAmount: true,
                          waiverAmount: true,
                          discountAmount: true
                        }
                      }
                    }
                  },
                  collections: {
                    where: { status: "Success", isDeleted: false },
                    select: {
                      amountPaid: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.collection.count({
        where: { 
          schoolId: context.schoolId,
          status: "VoidRequested",
          ...branchFilter
        }
      })
    ]);

    const activeYear = activeAY;

    // Financial calculations — BUG-1 FIX: derived from StudentFeeComponent sums
    const expectedBase     = Number(expectationStats._sum.baseAmount     || 0);
    const expectedWaivers  = Number(expectationStats._sum.waiverAmount   || 0);
    const expectedDiscounts= Number(expectationStats._sum.discountAmount || 0);
    const expectedNet = expectedBase - expectedWaivers - expectedDiscounts;
    
    // Parse consolidated collection stats from groupBy
    let lifetimeCollected = 0;
    let cashCollected = 0;
    let onlineCollected = 0;

    if (Array.isArray(collectionsStatsGroup)) {
      collectionsStatsGroup.forEach((group: any) => {
        const amt = Number(group._sum.amountPaid || 0);
        lifetimeCollected += Number(group._sum.totalPaid || group._sum.amountPaid || 0);
        
        if (group.paymentMode === "Cash") {
          cashCollected += amt;
        } else if (group.paymentMode === "Razorpay") {
          onlineCollected += amt;
        } else {
          // Count any other payment modes (e.g. Bank Transfer, cards) as online/other
          onlineCollected += amt;
        }
      });
    }

    const collectedToday = Number(dailyRevenue._sum.totalPaid || 0);

    // Map recent collections
    const recentCollections = recentCollectionsRaw.map((col: any) => ({
      id: col.id,
      receiptNumber: col.receiptNumber,
      studentId: col.studentId,
      studentName: col.student ? `${col.student.firstName} ${col.student.lastName}` : "Unknown Student",
      amountPaid: Number(col.amountPaid),
      totalPaid: Number(col.totalPaid),
      paymentMode: col.paymentMode,
      time: formatRelativeTime(col.paymentDate),
      user: col.collectedBy
    }));

    // Map class-wise collection & dues — BUG-1 FIX: use component sums, legacy fallback when absent
    const classStats = classes.map(cls => {
      let totalExpected = 0;
      let totalPaid = 0;
      cls.academicRecords.forEach(rec => {
        if (rec.student) {
          const st = rec.student;
          if (st.financial) {
            const comps = (st.financial as any).components as { baseAmount: any; waiverAmount: any; discountAmount: any }[] | undefined;
            if (comps && comps.length > 0) {
              // Authoritative path: sum of per-student fee components
              totalExpected += comps.reduce((sum, c) =>
                sum + Number(c.baseAmount || 0) - Number(c.waiverAmount || 0) - Number(c.discountAmount || 0), 0
              );
            } else {
              // Legacy fallback: for students without components yet
              totalExpected += Number(st.financial.annualTuition || 0) - Number(st.financial.totalDiscount || 0);
            }
          }
          totalPaid += st.collections.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);
        }
      });
      const dues = Math.max(0, totalExpected - totalPaid);
      return {
        classId: cls.id,
        className: cls.name,
        expected: totalExpected,
        collected: totalPaid,
        dues
      };
    }).filter(c => c.expected > 0)
      .sort((a, b) => b.dues - a.dues); // Sort by dues descending

    return {
      success: true,
      data: {
        studentCount,
        teacherCount,
        expectedRevenue: expectedNet,
        collectedRevenue: lifetimeCollected,
        outstandingDues: Math.max(0, expectedNet - lifetimeCollected),
        collectionRate: expectedNet > 0 ? Number(((lifetimeCollected / expectedNet) * 100).toFixed(1)) : 0,
        collectedToday: collectedToday,
        cashCollected,
        onlineCollected,
        classStats,
        recentCollections,
        voidRequests,
        academicYear: activeYear?.name || null,
        isSkeleton: !activeYear
      }
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: "Failed to load stats." };
  }
}

export async function getRecentActivitiesAction() {
  noStore();
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    const hasBranchContext = context.branchId && context.branchId !== 'GLOBAL';
    const branchFilter = hasBranchContext ? { branchId: context.branchId } : {};

    const logs = await prisma.activityLog.findMany({
      where: { schoolId: context.schoolId, ...branchFilter },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    return {
      success: true,
      data: logs.map((log: any) => ({
        id: log.id,
        title: log.action.replace(/_/g, " "),
        subtitle: `${log.entityType}: ${log.details || log.entityId}`,
        time: formatRelativeTime(log.createdAt),
        user: log.userId.split("@")[0] // Simplistic
      }))
    };
  } catch (error: any) {
    console.error("Activity Log Error:", error);
    return { success: false, error: "Failed to load activities." };
  }
}

function formatRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}
