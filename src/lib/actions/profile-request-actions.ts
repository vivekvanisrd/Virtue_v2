"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function submitProfileChangeAction(data: {
  studentId?: string | null;
  requestType: string; // "PHONE", "EMAIL", "ADDRESS", "EMERGENCY_CONTACT"
  newValue: string;
  attachment?: string | null;
}) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Parent session expired." };
    }

    let branchId = "GLOBAL";
    let studentId = data.studentId || null;

    // 🛡️ SECURITY: If studentId is provided, verify sibling linkage
    if (studentId) {
      const linkage = await prismaBypass.studentGuardian.findFirst({
        where: {
          studentId,
          guardianId: identity.guardianId,
          activeStatus: "ACTIVE"
        },
        include: { student: true }
      });
      if (!linkage) {
        return { success: false, error: "ACCESS_DENIED: Student profile is not linked to your parent account." };
      }
      branchId = linkage.student.branchId || "GLOBAL";
    }

    // 1. Resolve Old Value for Auditing
    let oldValue = "";
    if (data.requestType === "PHONE") {
      const g = await prismaBypass.guardian.findUnique({ where: { id: identity.guardianId } });
      oldValue = g?.phone || "";
    } else if (data.requestType === "EMAIL") {
      const g = await prismaBypass.guardian.findUnique({ where: { id: identity.guardianId } });
      oldValue = g?.email || "";
    } else if (data.requestType === "ADDRESS" && studentId) {
      const addr = await prismaBypass.address.findUnique({ where: { studentId } });
      oldValue = addr?.currentAddress || "";
    } else if (data.requestType === "EMERGENCY_CONTACT" && studentId) {
      const fam = await prismaBypass.familyDetail.findUnique({ where: { studentId } });
      oldValue = fam?.emergencyPhone || "";
    }

    // 2. Create Change Request
    const request = await prismaBypass.profileChangeRequest.create({
      data: {
        studentId,
        guardianId: identity.guardianId,
        requestType: data.requestType,
        oldValue,
        newValue: data.newValue.trim(),
        attachment: data.attachment || null,
        status: "PENDING",
        schoolId: identity.schoolId,
        branchId
      }
    });

    return { success: true, requestId: request.id, message: "Profile modification request submitted for admin review." };
  } catch (error: any) {
    console.error("Submit Profile Change Error:", error);
    return { success: false, error: "Failed to submit change request." };
  }
}

export async function getPendingProfileRequestsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    const requests = await prisma.profileChangeRequest.findMany({
      where: {
        schoolId: identity.schoolId,
        status: "PENDING"
      },
      include: {
        student: true,
        guardian: true
      },
      orderBy: { createdAt: "asc" }
    });

    return { success: true, requests };
  } catch (error: any) {
    console.error("Get Pending Requests Error:", error);
    return { success: false, error: "Failed to load pending change requests." };
  }
}

export async function moderateProfileRequestAction(data: {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  remarks?: string | null;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    const req = await prisma.profileChangeRequest.findUnique({
      where: { id: data.requestId }
    });

    if (!req) {
      return { success: false, error: "Change request not found." };
    }

    if (req.status !== "PENDING") {
      return { success: false, error: `Request has already been moderated (Status: ${req.status}).` };
    }

    // Process approval by merging updates transactional-wise
    if (data.status === "APPROVED") {
      await prisma.$transaction(async (tx: any) => {
        if (req.requestType === "PHONE") {
          await tx.guardian.update({
            where: { id: req.guardianId },
            data: { phone: req.newValue }
          });
        } else if (req.requestType === "EMAIL") {
          await tx.guardian.update({
            where: { id: req.guardianId },
            data: { email: req.newValue }
          });
        } else if (req.requestType === "ADDRESS" && req.studentId) {
          await tx.address.upsert({
            where: { studentId: req.studentId },
            update: { currentAddress: req.newValue },
            create: { studentId: req.studentId, currentAddress: req.newValue }
          });
        } else if (req.requestType === "EMERGENCY_CONTACT" && req.studentId) {
          await tx.familyDetail.upsert({
            where: { studentId: req.studentId },
            update: { emergencyPhone: req.newValue },
            create: { studentId: req.studentId, emergencyPhone: req.newValue }
          });
        }

        // Close change request
        await tx.profileChangeRequest.update({
          where: { id: req.id },
          data: {
            status: "APPROVED",
            approvedBy: identity.staffId,
            approvedAt: new Date(),
            remarks: data.remarks || null
          }
        });
      });

      return { success: true, message: "Demographic modification request approved and synchronized." };
    } else {
      // Just mark as rejected
      await prisma.profileChangeRequest.update({
        where: { id: req.id },
        data: {
          status: "REJECTED",
          approvedBy: identity.staffId,
          approvedAt: new Date(),
          remarks: data.remarks || null
        }
      });

      return { success: true, message: "Demographic modification request rejected." };
    }
  } catch (error: any) {
    console.error("Moderate Profile Request Error:", error);
    return { success: false, error: "Failed to process request moderation." };
  }
}
