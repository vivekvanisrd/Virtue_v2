"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "../utils/tenant-context";
import { unstable_noStore as noStore } from "next/cache";

export async function getDashboardStatsAction() {
  noStore();
  try {
    const context = await getTenantContext();
    
    // Scoped counts
    const studentCount = await prisma.student.count({
      where: { schoolId: context.schoolId }
    });

    const teacherCount = await prisma.staff.count({
      where: { 
        schoolId: context.schoolId,
        role: "TEACHER"
      }
    });

    // Get Collections Today (Last 24h)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRevenue = await prisma.collection.aggregate({
      where: { 
        schoolId: context.schoolId,
        paymentDate: { gte: today },
        status: "Success"
      },
      _sum: { totalPaid: true }
    });

    // Get actual pending issues (e.g., pending enquiries)
    const pendingIssues = await prisma.enquiry.count({
      where: { 
        schoolId: context.schoolId,
        status: "Pending"
      }
    });

    // Get Pending Voids (Audit Pulse)
    const voidRequests = await prisma.collection.count({
      where: { 
        schoolId: context.schoolId,
        status: "VoidRequested"
      }
    });

    // Get active academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId: context.schoolId, isCurrent: true },
      select: { name: true }
    });

    return {
      success: true,
      data: {
        studentCount,
        teacherCount,
        financeBalance: `₹${(Number(dailyRevenue._sum.totalPaid || 0)).toLocaleString()}`,
        pendingIssues: pendingIssues,
        voidRequests,
        academicYear: activeYear?.name || "Session 2025-26"
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
    const context = await getTenantContext();
    
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
