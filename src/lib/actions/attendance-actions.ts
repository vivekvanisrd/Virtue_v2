"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "@/lib/utils/tenant-context";
import { revalidatePath } from "next/cache";

/**
 * Velocity Submission: Bulk saves attendance for a class/section.
 * If status is 'Absent', handles (mock) parent notifications.
 */
export async function submitStudentAttendanceAction(records: {
  studentId: string;
  status: string;
  remarks?: string;
  session?: string;
  entryTime?: string;
  classId?: string;
  sectionId?: string;
  date: string;
}[]) {
  try {
    const context = await getTenantContext();
    const todayStr = records[0]?.date || new Date().toISOString().split('T')[0];
    const classId = records[0]?.classId;

    // 1. TEACHER OWNERSHIP CHECK
    if (context.role === "STAFF" || context.role === "TEACHER") {
       const staff = await prisma.staff.findUnique({
         where: { id: context.staffId }
       });
       
       if (staff && staff.assignedClassId && classId && staff.assignedClassId !== classId) {
          return { success: false, error: "ACCESS DENIED: You are only authorized to mark attendance for your assigned class." };
       }
    }

    // 2. THE 10-MINUTE LOCK CHECK
    if (context.role !== "PRINCIPAL" && context.role !== "OWNER" && classId) {
       const firstRecord = await prisma.studentAttendance.findFirst({
         where: { 
           classId: classId,
           date: { gte: new Date(new Date(todayStr).setHours(0,0,0,0)) },
           schoolId: context.schoolId
         },
         orderBy: { createdAt: 'asc' }
       });

       if (firstRecord) {
          const diffMs = new Date().getTime() - new Date(firstRecord.createdAt).getTime();
          const diffMins = diffMs / (1000 * 60);
          
          if (diffMins > 10) {
             return { success: false, error: "🔒 ATTENDANCE FINALIZED: The 10-minute grace period for corrections has expired. Please contact management for modifications." };
          }
       }
    }
    
    // We'll perform an upsert for each student for that date/session.
    const result = await prisma.$transaction(
      records.map((r) => {
        const attendanceDate = new Date(r.date);
        attendanceDate.setHours(0, 0, 0, 0);

        return prisma.studentAttendance.upsert({
          where: {
            // Since we don't have a unique constraint on student+date+session, 
            // we'll find existing and update, or create.
            // For now, let's just create (simple version) or use a composite logic.
            // Better: find unique by composite [studentId, date, session] if we had it.
            // Let's use a non-atomic approach for now or assume ID is provided.
            id: `ATT-${r.studentId}-${r.date}-${r.session || 'Morning'}`,
          },
          update: {
            status: r.status,
            remarks: r.remarks,
            entryTime: r.entryTime ? new Date(r.entryTime) : null,
          },
          create: {
            id: `ATT-${r.studentId}-${r.date}-${r.session || 'Morning'}`,
            studentId: r.studentId,
            schoolId: context.schoolId,
            classId: r.classId,
            sectionId: r.sectionId,
            date: attendanceDate,
            status: r.status,
            session: r.session || "Morning",
            remarks: r.remarks,
            entryTime: r.entryTime ? new Date(r.entryTime) : null,
          }
        });
      })
    );

    // INNOVATION: Trigger Automated Absence Notifications (Mock)
    const absents = records.filter(r => r.status === "Absent");
    if (absents.length > 0) {
       console.log(`[VELOCITY] Triggering automated absence notices for ${absents.length} students...`);
       // In a real system, we'd call an SMS/WhatsApp API here.
    }

    revalidatePath("/dashboard");
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Attendance Submission Error:", error);
    return { success: false, error: "Failed to sync attendance records." };
  }
}

/**
 * Fetch attendance stats for a specific class/section today.
 */
export async function getAttendanceStatsAction(classId?: string, sectionId?: string, dateStr?: string) {
  try {
     const context = await getTenantContext();
     const date = dateStr ? new Date(dateStr) : new Date();
     date.setHours(0, 0, 0, 0);

     const records = await prisma.studentAttendance.findMany({
        where: {
           schoolId: context.schoolId,
           classId: classId || undefined,
           sectionId: sectionId || undefined,
           date: date
        },
        include: { student: true }
     });

     const present = records.filter((r: any) => r.status === "Present").length;
     const total = records.length;

     return { 
        success: true, 
        data: {
           present,
           absent: total - present,
           total,
           percentage: total > 0 ? (present / total) * 100 : 0
        }
     };
  } catch (e) {
     return { success: false, error: "Failed to fetch stats." };
  }
}
/**
 * Professional Staff Attendance: Bulk saves staff entries with timings.
 */
export async function submitStaffAttendanceAction(records: {
  staffId: string;
  status: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
}[]) {
  try {
    const result = await prisma.$transaction(
      records.map((r) => {
        const attendanceDate = new Date(r.date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Helper to combine date + time string (HH:mm)
        const parseTime = (timeStr?: string) => {
          if (!timeStr) return null;
          const [hours, mins] = timeStr.split(":").map(Number);
          const d = new Date(attendanceDate);
          d.setHours(hours, mins, 0, 0);
          return d;
        };

        return prisma.staffAttendance.upsert({
          where: {
            // Composite deterministic ID for daily run
            id: `STAFF-${r.staffId}-${r.date}`,
          },
          update: {
            status: r.status,
            checkIn: parseTime(r.checkIn),
            checkOut: parseTime(r.checkOut),
          },
          create: {
            id: `STAFF-${r.staffId}-${r.date}`,
            staffId: r.staffId,
            date: attendanceDate,
            status: r.status,
            checkIn: parseTime(r.checkIn),
            checkOut: parseTime(r.checkOut),
          }
        });
      })
    );

    revalidatePath("/dashboard/staff");
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Staff Attendance Error:", error);
    return { success: false, error: "Failed to sync staff records." };
  }
}
