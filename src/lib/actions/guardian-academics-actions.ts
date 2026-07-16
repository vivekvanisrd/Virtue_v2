"use server";

import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { getGuardianSiblingsAction } from "./guardian-auth-actions";
import { prismaBypass } from "@/lib/prisma";

export async function getWardedAcademicsAction() {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "SECURE_AUTH_REQUIRED: Guardian session expired." };
    }

    const siblingsRes = await getGuardianSiblingsAction();
    if (!siblingsRes.success || !siblingsRes.siblings || siblingsRes.siblings.length === 0) {
      return { success: true, results: [] };
    }

    const studentIds = siblingsRes.siblings.map((s: any) => s.studentId);
    const db = prismaBypass as any;

    const results = await db.examResult.findMany({
      where: {
        studentId: { in: studentIds }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        examType: {
          select: {
            id: true,
            name: true,
            academicYear: true
          }
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    return { success: true, results };
  } catch (error: any) {
    console.error("Fetch Academics Error:", error);
    return { success: false, error: error.message };
  }
}
