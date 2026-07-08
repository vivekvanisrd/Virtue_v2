"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function getStudentAcademicScheduleAction(studentId: string) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Parent session expired." };
    }

    // 🛡️ SECURITY: Verify sibling linkage (prevent cross-family leaks)
    const linkage = await prismaBypass.studentGuardian.findFirst({
      where: {
        studentId,
        guardianId: identity.guardianId,
        activeStatus: "ACTIVE"
      }
    });
    if (!linkage) {
      return { success: false, error: "ACCESS_DENIED: Student profile is not linked to your parent account." };
    }

    // 1. Fetch holidays from PublicHolidayMaster (unprotected system model)
    const holidays = await prismaBypass.publicHolidayMaster.findMany({
      orderBy: { date: "asc" }
    });

    // 2. Generate standard class timetable blocks (mock representation)
    const timetable = [
      { day: "Monday", periods: [
        { subject: "Mathematics", time: "09:00 AM - 09:45 AM", teacher: "Mr. Ramesh" },
        { subject: "General Science", time: "09:45 AM - 10:30 AM", teacher: "Mrs. Shanthi" },
        { subject: "English Language", time: "10:45 AM - 11:30 AM", teacher: "Ms. Sarah" }
      ]},
      { day: "Tuesday", periods: [
        { subject: "Social Studies", time: "09:00 AM - 09:45 AM", teacher: "Mr. Anand" },
        { subject: "Mathematics", time: "09:45 AM - 10:30 AM", teacher: "Mr. Ramesh" },
        { subject: "Physical Education", time: "10:45 AM - 11:30 AM", teacher: "Mr. David" }
      ]}
    ];

    return {
      success: true,
      holidays,
      timetable
    };
  } catch (error: any) {
    console.error("Get Student Academic Schedule Error:", error);
    return { success: false, error: "Failed to load academic schedule." };
  }
}
