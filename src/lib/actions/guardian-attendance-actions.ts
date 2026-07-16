"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "./guardian-auth-actions";
import { prismaBypass } from "@/lib/prisma";

export async function getWardedAttendanceAction() {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
    }

    const siblingsRes = await getGuardianSiblingsAction();
    if (!siblingsRes.success || !siblingsRes.siblings || siblingsRes.siblings.length === 0) {
      return { success: true, attendance: [] };
    }

    const studentIds = siblingsRes.siblings.map((s: any) => s.studentId);
    const db = prismaBypass as any;

    const logs = await db.studentAttendance.findMany({
      where: {
        studentId: { in: studentIds }
      },
      orderBy: { date: "desc" },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return { success: true, logs };
  } catch (error: any) {
    console.error("Fetch Attendance Error:", error);
    return { success: false, error: error.message };
  }
}
