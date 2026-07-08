"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";

export async function submitParentFeedbackAction(data: {
  studentId?: string | null;
  category: string; // "ACADEMIC", "TEACHER", "SCHOOL", "TRANSPORT", "APP", "FEE", "GENERAL"
  targetType: string; // "Teacher", "Branch", "School", "Application"
  targetId?: string | null; // e.g. teacherId or branchId
  rating: number; // 1 to 5 stars
  comment: string;
  isAnonymous?: boolean;
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

    // Create Feedback
    const feedback = await prismaBypass.feedback.create({
      data: {
        schoolId: identity.schoolId,
        branchId,
        studentId,
        guardianId: identity.guardianId,
        category: data.category,
        targetType: data.targetType,
        targetId: data.targetId || null,
        rating: data.rating,
        comment: data.comment.trim(),
        isAnonymous: data.isAnonymous ?? false,
        moderationStatus: "PENDING"
      }
    });

    return { success: true, feedbackId: feedback.id, message: "Feedback submitted successfully." };
  } catch (error: any) {
    console.error("Submit Parent Feedback Error:", error);
    return { success: false, error: "Failed to submit feedback." };
  }
}

export async function getFeedbackReportsAction(category?: string | null) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    const feedbacks = await prisma.feedback.findMany({
      where: {
        schoolId: identity.schoolId,
        category: category || undefined
      },
      include: {
        student: true,
        guardian: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Anonymize records if marked isAnonymous
    const sanitized = feedbacks.map((f: any) => {
      if (f.isAnonymous) {
        return {
          ...f,
          guardian: null,
          student: null,
          comment: f.comment // Keep only rating and comments
        };
      }
      return f;
    });

    return { success: true, feedbacks: sanitized };
  } catch (error: any) {
    console.error("Get Feedback Reports Error:", error);
    return { success: false, error: "Failed to load feedback reports." };
  }
}

export async function moderateFeedbackAction(feedbackId: string, status: "APPROVED" | "REJECTED") {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) {
      return { success: false, error: "ACCESS_DENIED: Staff credentials required." };
    }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { moderationStatus: status }
    });

    return { success: true, message: `Feedback marked as ${status.toLowerCase()}.` };
  } catch (error: any) {
    console.error("Moderate Feedback Error:", error);
    return { success: false, error: "Failed to moderate feedback report." };
  }
}
