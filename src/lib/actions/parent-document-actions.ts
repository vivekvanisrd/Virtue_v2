"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function getStudentDocumentsAction(studentId: string) {
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

    // Fetch student documents registered in the system
    const documentsList = await prismaBypass.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: "desc" }
    });

    return { success: true, documents: documentsList };
  } catch (error: any) {
    console.error("Get Student Documents Error:", error);
    return { success: false, error: "Failed to load student documents." };
  }
}
