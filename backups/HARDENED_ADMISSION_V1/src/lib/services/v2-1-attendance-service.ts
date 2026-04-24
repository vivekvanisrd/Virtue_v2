import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * Attendance Service v2.1 (Sovereign Intelligence)
 * -----------------------------------------------
 * Focus: SPEED, SIMPLICITY, ACCURACY.
 * 
 * Rules (LOCKED):
 * - Use Server Time only.
 * - No auto-deductions without admin approval.
 * - Handle duplicate marks (toggle check-in/out).
 * - Multi-Shift Priority: Staff Policy > Branch Default.
 */
export class AttendanceServiceV21 {
  
  /**
   * Main Marking Entrypoint
   * @param statusOverride - If provided, skips automatic calculation and forces this status (e.g., LP, A, HD)
   */
  static async markAttendance(staffId: string, timestamp: Date = new Date(), source: "MANUAL" | "FACE" | "BIOMETRIC" = "MANUAL", statusOverride?: string) {
    const today = new Date(timestamp);
    today.setHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Staff with their specific policy or Branch default
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        include: { 
          attendancePolicy: true, 
          branch: { 
            include: { 
              attendancePolicies: { where: { name: "Default" }, take: 1 } 
            } 
          } 
        }
      });

      if (!staff) throw new Error("Staff ID not found in registry.");

      // Resolve Policy Priority
      const policy = staff.attendancePolicy || staff.branch.attendancePolicies[0] || {
        startMinutes: 510, // 8:30 AM
        gracePeriod: 15,
        halfDayMinutes: 240
      };

      // 2. Check for existing record for today
      const existing = await tx.staffAttendance.findFirst({
        where: { staffId, date: today }
      });

      if (!existing) {
        // --- CHECK-IN LOGIC ---
        const checkInTime = timestamp;
        const startTotalMinutes = (checkInTime.getHours() * 60) + checkInTime.getMinutes();
        
        // Handle Policy Logic (if not explicitly overridden)
        let finalStatus = statusOverride;
        let lateMinutes = 0;

        if (!finalStatus) {
            const isLate = startTotalMinutes > (policy.startMinutes + policy.gracePeriod);
            finalStatus = isLate ? "Late" : "Present";
            lateMinutes = isLate ? (startTotalMinutes - policy.startMinutes) : 0;
        }

        const record = await tx.staffAttendance.create({
          data: {
            staffId,
            date: today,
            status: finalStatus,
            checkIn: checkInTime,
            schoolId: staff.schoolId,
            branchId: staff.branchId,
            lateMinutes,
            isFaceVerified: source === "FACE",
            remarks: statusOverride ? `Manual Mark: ${statusOverride}` : source
          }
        });

        if (finalStatus === "Late" || finalStatus === "Loss of Pay") {
          await this.logException(tx, staffId, today, finalStatus, { checkIn: checkInTime, threshold: policy.startMinutes });
        }

        return { type: "CHECK_IN", status: record.status, lateMinutes };
      } else if (!existing.checkOut) {
        // --- CHECK-OUT LOGIC ---
        const checkOutTime = timestamp;
        const totalWorked = Math.floor((checkOutTime.getTime() - existing.checkIn!.getTime()) / (1000 * 60));
        
        await tx.staffAttendance.update({
          where: { id: existing.id },
          data: { checkOut: checkOutTime }
        });

        if (totalWorked < (policy.halfDayMinutes)) {
            await this.logException(tx, staffId, today, "Early-Out", { totalWorked, threshold: policy.halfDayMinutes });
        }

        return { type: "CHECK_OUT", totalMinutes: totalWorked };
      } else {
        return { type: "ALREADY_COMPLETED", existing };
      }
    });
  }

  /**
   * Manual Override Action
   * Allows Principal/Owner to bypass system calculations.
   */
  static async overrideStatus(attendanceId: string, newStatus: string, reason: string, adminId: string) {
    return await prisma.staffAttendance.update({
      where: { id: attendanceId },
      data: {
        status: newStatus,
        isOverridden: true,
        overriddenAt: new Date(),
        overriddenBy: adminId,
        remarks: reason
      }
    });
  }

  /**
   * Internal Exception Logger
   */
  private static async logException(tx: any, staffId: string, date: Date, type: string, meta: any) {
    return await tx.attendanceException.create({
      data: {
        staffId,
        date,
        type,
        meta
      }
    });
  }

  /**
   * Command Stats Action
   */
  static async getCommandStats(branchId: string, date: Date = new Date()) {
    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    const records = await prisma.staffAttendance.findMany({
      where: { branchId, date: today }
    });

    const totalStaff = await prisma.staff.count({ where: { branchId, status: "Active" } });

    return {
      present: records.filter(r => r.status === "Present" || r.status === "Late").length,
      absent: totalStaff - records.length,
      late: records.filter(r => r.status === "Late").length,
      halfDay: records.filter(r => r.status === "Half-Day").length,
      inside: records.filter(r => r.checkIn && !r.checkOut).length,
      overridden: records.filter(r => r.isOverridden).length,
      totalStaff
    };
  }
}
