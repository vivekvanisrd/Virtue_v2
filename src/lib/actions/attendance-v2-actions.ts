"use server";

import { AttendanceServiceV21 } from "@/lib/services/v2-1-attendance-service";
import { FaceService } from "@/lib/services/face-service";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * ATTENDANCE V2.1 SERVER ACTIONS
 * -------------------------------
 * Optimized for LIGHTNING FAST performance.
 */

export async function getMonthlyAttendanceMatrixAction(month: number, year: number) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const startDate = new Date(year, month, 1);
    const endDate = endOfMonth(startDate);

    // 🚀 SINGLE-QUERY MATRIX STRATEGY
    // We fetch EVERYTHING for the branch in one go.
    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        branchId: identity.branchId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        isOverridden: true,
        lateMinutes: true
      }
    });

    // Transform into optimized Matrix: Record<staffId, Record<day, record>>
    const matrix: Record<string, Record<number, any>> = {};
    
    attendanceRecords.forEach(rec => {
      if (!matrix[rec.staffId]) matrix[rec.staffId] = {};
      const day = new Date(rec.date).getDate();
      matrix[rec.staffId][day] = rec;
    });

    return { success: true, data: matrix };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitFaceAttendanceAction(imageBase64: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const result = await FaceService.verifyStaffFace(imageBase64);
    if (!result.success || !result.staffId) throw new Error("Face Verification Failed: Low Confidence");

    const markResult = await AttendanceServiceV21.markAttendance(result.staffId, new Date(), "FACE");
    
    revalidatePath("/dashboard");
    return { success: true, data: markResult };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitManualAttendanceAction(staffId: string, status?: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    const result = await AttendanceServiceV21.markAttendance(staffId, new Date(), "MANUAL", status);
    
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function overrideAttendanceStatusAction(attendanceId: string, staffId: string, date: Date, status: string, reason: string = "Manual Override") {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED_ACCESS");

    let targetId = attendanceId;
    
    // Safety check for unsaved records
    if (attendanceId.includes("TEMP")) {
       const existing = await prisma.staffAttendance.findFirst({
         where: { staffId, date }
       });
       if (existing) targetId = existing.id;
       else {
         // Create if missing
         const created = await prisma.staffAttendance.create({
            data: { staffId, date, status: "Present", branchId: identity.branchId, schoolId: identity.schoolId }
         });
         targetId = created.id;
       }
    }

    const result = await AttendanceServiceV21.overrideStatus(targetId, status, reason, identity.staffId || "ADMIN");
    
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAttendanceCommandStatsAction(branchId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !identity.branchId) throw new Error("UNAUTHORIZED_ACCESS");

    const bizId = branchId === "GLOBAL" ? identity.branchId : branchId;
    const stats = await AttendanceServiceV21.getCommandStats(bizId);
    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
/**
 * ⚡ LEAN PULSE ACTION: Fetches only minimal fields for the Command Center cards
 * Drastically reduces payload for 64+ staff members
 */
export async function getStaffPulseAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("UNAUTHORIZED");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const staff = await prisma.staff.findMany({
      where: { 
        schoolId: identity.schoolId,
        ...(identity.branchId && identity.branchId !== 'GLOBAL' && { branchId: identity.branchId })
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        staffCode: true,
        attendance: {
          where: { date: today },
          take: 1,
          select: {
            status: true,
            checkIn: true
          }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    return { success: true, data: staff };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
