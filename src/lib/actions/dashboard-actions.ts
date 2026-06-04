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

    // 1-8. Parallel database queries via Promise.all
    const [
      studentCount,
      teacherCount,
      expectationStats,
      collectionsStats,
      dailyRevenue,
      cashStats,
      onlineStats,
      recentCollectionsRaw,
      classes,
      voidRequests,
      activeYear
    ] = await Promise.all([
      prisma.student.count({
        where: { schoolId: context.schoolId, status: "Active" }
      }),
      prisma.staff.count({
        where: { schoolId: context.schoolId, role: "TEACHER" }
      }),
      prisma.financialRecord.aggregate({
        where: { schoolId: context.schoolId },
        _sum: { annualTuition: true, totalDiscount: true }
      }),
      prisma.collection.aggregate({
        where: { schoolId: context.schoolId, status: "Success" },
        _sum: { amountPaid: true, totalPaid: true }
      }),
      prisma.collection.aggregate({
        where: { 
          schoolId: context.schoolId,
          paymentDate: { gte: today },
          status: "Success"
        },
        _sum: { totalPaid: true }
      }),
      prisma.collection.aggregate({
        where: { schoolId: context.schoolId, status: "Success", paymentMode: "Cash" },
        _sum: { amountPaid: true }
      }),
      prisma.collection.aggregate({
        where: { schoolId: context.schoolId, status: "Success", paymentMode: "Razorpay" },
        _sum: { amountPaid: true }
      }),
      prisma.collection.findMany({
        where: { schoolId: context.schoolId, status: "Success" },
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
        where: { schoolId: context.schoolId },
        select: {
          id: true,
          name: true,
          academicRecords: {
            select: {
              student: {
                select: {
                  id: true,
                  financial: {
                    select: {
                      annualTuition: true,
                      totalDiscount: true
                    }
                  },
                  collections: {
                    where: { status: "Success" },
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
          status: "VoidRequested"
        }
      }),
      prisma.academicYear.findFirst({
        where: { schoolId: context.schoolId, isCurrent: true },
        select: { name: true }
      })
    ]);

    // Financial calculations
    const expectedTuition = Number(expectationStats._sum.annualTuition || 0);
    const expectedDiscounts = Number(expectationStats._sum.totalDiscount || 0);
    const expectedNet = expectedTuition - expectedDiscounts;
    const lifetimeCollected = Number(collectionsStats._sum.amountPaid || 0);
    const collectedToday = Number(dailyRevenue._sum.totalPaid || 0);
    const cashCollected = Number(cashStats._sum.amountPaid || 0);
    const onlineCollected = Number(onlineStats._sum.amountPaid || 0);

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

    // Map class-wise collection & dues
    const classStats = classes.map(cls => {
      let totalExpected = 0;
      let totalPaid = 0;
      cls.academicRecords.forEach(rec => {
        if (rec.student) {
          const st = rec.student;
          if (st.financial) {
            totalExpected += Number(st.financial.annualTuition || 0) - Number(st.financial.totalDiscount || 0);
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
    
    const logs = await prisma.activityLog.findMany({
      where: { schoolId: context.schoolId },
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
