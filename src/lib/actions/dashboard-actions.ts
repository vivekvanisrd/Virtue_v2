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

    return {
      success: true,
      data: {
        studentCount,
        teacherCount,
        financeBalance: `₹${(totalBalance / 100000).toFixed(1)}L`,
        pendingIssues: 12 // Placeholder for now
      }
    };
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    return { success: false, error: "Failed to load stats." };
  }
}
