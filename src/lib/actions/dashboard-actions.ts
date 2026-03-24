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

    // Simple finance sum for balance (example logic)
    const financialSummary = await prisma.financialRecord.aggregate({
      where: { schoolId: context.schoolId },
      _sum: {
        tuitionFee: true,
        admissionFee: true,
        transportFee: true
      }
    });

    const totalBalance = 
      Number(financialSummary._sum.tuitionFee || 0) + 
      Number(financialSummary._sum.admissionFee || 0) + 
      Number(financialSummary._sum.transportFee || 0);

    // Get actual pending issues (e.g., pending enquiries)
    const pendingIssues = await prisma.enquiry.count({
      where: { 
        schoolId: context.schoolId,
        status: "Pending"
      }
    });

    // Get current academic year
    const activeYear = await prisma.academicYear.findFirst({
      where: { 
        schoolId: context.schoolId,
        isCurrent: true
      },
      select: { name: true }
    });

    return {
      success: true,
      data: {
        studentCount,
        teacherCount,
        financeBalance: `₹${(totalBalance / 100000).toFixed(1)}L`,
        pendingIssues,
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
      data: logs.map(log => ({
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
