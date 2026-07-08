"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { headers } from "next/headers";

export async function createNoticeAction(data: {
  title: string;
  content: string;
  audienceType: string; // "ALL", "PARENTS", "CLASS", "SECTION", "TRANSPORT"
  targetClassId?: string | null;
  targetSectionId?: string | null;
  publishFrom: Date;
  publishTill: Date;
  priority?: string; // "LOW", "NORMAL", "HIGH", "CRITICAL"
  requiresAcknowledgement?: boolean;
  attachments?: { fileName: string; fileUrl: string }[];
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    const notice = await prisma.notice.create({
      data: {
        schoolId: identity.schoolId,
        branchId: identity.branchId,
        title: data.title.trim(),
        content: data.content.trim(),
        audienceType: data.audienceType,
        targetClassId: data.targetClassId || null,
        targetSectionId: data.targetSectionId || null,
        publishFrom: new Date(data.publishFrom),
        publishTill: new Date(data.publishTill),
        priority: data.priority || "NORMAL",
        requiresAcknowledgement: data.requiresAcknowledgement ?? false,
        createdBy: identity.staffId,
        attachments: data.attachments && data.attachments.length > 0 ? {
          create: data.attachments.map(att => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl
          }))
        } : undefined
      }
    });

    return { success: true, noticeId: notice.id, message: "Announcement published successfully." };
  } catch (error: any) {
    console.error("Create Notice Error:", error);
    return { success: false, error: "Failed to publish notice." };
  }
}

export async function getStudentNoticesAction(studentId: string) {
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

    // 1. Resolve student's current placement details
    const academicRecord = await prismaBypass.academicRecord.findUnique({
      where: { studentId }
    });

    if (!academicRecord) {
      return { success: false, error: "No active academic placement record found." };
    }

    const now = new Date();

    // 2. Fetch notices matching the targeting criteria
    const noticesList = await prismaBypass.notice.findMany({
      where: {
        schoolId: identity.schoolId,
        branchId: academicRecord.branchId || undefined,
        publishFrom: { lte: now },
        publishTill: { gte: now },
        OR: [
          { audienceType: "ALL" },
          { audienceType: "PARENTS" },
          {
            AND: [
              { audienceType: "CLASS" },
              { targetClassId: academicRecord.classId }
            ]
          },
          {
            AND: [
              { audienceType: "SECTION" },
              { targetClassId: academicRecord.classId },
              { targetSectionId: academicRecord.sectionId || undefined }
            ]
          }
        ]
      },
      include: {
        attachments: true
      },
      orderBy: { priority: "desc" } // Show high priority first
    });

    // 3. Resolve parent acknowledgement status for each notice
    const noticesWithAck = await Promise.all(noticesList.map(async (notice: any) => {
      const ack = await prismaBypass.noticeAcknowledgement.findUnique({
        where: {
          noticeId_guardianId: {
            noticeId: notice.id,
            guardianId: identity.guardianId
          }
        }
      });
      return {
        ...notice,
        acknowledged: !!ack,
        acknowledgedAt: ack?.acknowledgedAt || null
      };
    }));

    return { success: true, notices: noticesWithAck };
  } catch (error: any) {
    console.error("Get Student Notices Error:", error);
    return { success: false, error: "Failed to load notices bulletin." };
  }
}

export async function acknowledgeNoticeAction(noticeId: string) {
  try {
    const identity = await getGuardianIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Parent session expired." };
    }

    // Resolve IP address from headers
    let ipAddress = "unknown";
    try {
      const headerStore = await headers();
      ipAddress = headerStore.get("x-forwarded-for") || headerStore.get("x-real-ip") || "unknown";
    } catch {}

    // Idempotency Check
    const existing = await prismaBypass.noticeAcknowledgement.findUnique({
      where: {
        noticeId_guardianId: {
          noticeId,
          guardianId: identity.guardianId
        }
      }
    });

    if (existing) {
      return { success: true, message: "Notice already acknowledged." };
    }

    await prismaBypass.noticeAcknowledgement.create({
      data: {
        noticeId,
        guardianId: identity.guardianId,
        ipAddress,
        deviceInfo: "Web Browser"
      }
    });

    return { success: true, message: "Announcement marked as acknowledged." };
  } catch (error: any) {
    console.error("Acknowledge Notice Error:", error);
    return { success: false, error: "Failed to record notice acknowledgement." };
  }
}
