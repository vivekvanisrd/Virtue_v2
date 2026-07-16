"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "./guardian-auth-actions";
import { prismaBypass } from "@/lib/prisma";

export async function getWardedHomeworkAction() {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
    }

    const siblingsRes = await getGuardianSiblingsAction();
    if (!siblingsRes.success || !siblingsRes.siblings || siblingsRes.siblings.length === 0) {
      return { success: true, homework: [] };
    }

    const studentIds = siblingsRes.siblings.map((s: any) => s.studentId);
    const db = prismaBypass as any;

    // Fetch warded history to get class and section mappings
    const studentHistory = await db.studentAcademicYear.findMany({
      where: {
        studentId: { in: studentIds }
      },
      select: {
        studentId: true,
        classId: true,
        sectionId: true
      }
    });

    const classIds = studentHistory.map((h: any) => h.classId);

    // Fetch homework assigned to warded classes/sections
    const homework = await db.homework.findMany({
      where: {
        classId: { in: classIds },
        status: "PUBLISHED"
      },
      include: {
        class: {
          select: { name: true }
        },
        section: {
          select: { name: true }
        },
        submissions: {
          where: {
            studentId: { in: studentIds }
          }
        }
      },
      orderBy: { dueDate: "asc" }
    });

    return { success: true, homework };
  } catch (error: any) {
    console.error("Fetch Homework Error:", error);
    return { success: false, error: error.message };
  }
}
