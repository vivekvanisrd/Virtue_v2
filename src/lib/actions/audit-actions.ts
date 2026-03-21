"use server";

import prisma from "@/lib/prisma";

export async function getRecentActivity(schoolId: string, limit = 50) {
  try {
    const logs = await prisma.activityLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: logs };
  } catch (err: any) {
    console.error("Failed to fetch activity logs", err);
    return { success: false, error: "Failed to fetch activity logs" };
  }
}
