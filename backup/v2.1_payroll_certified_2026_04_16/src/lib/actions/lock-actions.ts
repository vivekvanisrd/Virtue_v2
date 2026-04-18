"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * requestUnlockAction
 * 
 * Initiated by Staff when they need to edit a locked financial record.
 * Captures the 'Reason' for management review.
 */
export async function requestUnlockAction(data: {
  studentId: string;
  requestedBy: string;
  reason: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const request = await prisma.unlockRequest.create({
      data: {
        ...data,
        schoolId: context.schoolId,
        branchId: context.branchId,
        status: "PENDING"
      }
    });

    revalidatePath("/admin/management/unlocks");
    return { success: true, data: request };
  } catch (error: any) {
    return { success: false, error: "Failed to submit unlock request: " + error.message };
  }
}

/**
 * resolveUnlockRequestAction
 * 
 * Admin Approval Flow (Elite ERP Logic)
 * If APPROVED, sets a 15-minute expiration window.
 */
export async function resolveUnlockRequestAction(data: {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  approvedBy: string;
}) {
  try {
    const expiresAt = data.status === "APPROVED" 
      ? new Date(Date.now() + 15 * 60 * 1000) 
      : null;

    const request = await prisma.unlockRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.status,
        approvedBy: data.approvedBy,
        expiresAt
      }
    });

    revalidatePath("/admin/management/unlocks");
    return { success: true, data: request };
  } catch (error: any) {
    return { success: false, error: "Failed to resolve unlock: " + error.message };
  }
}

/**
 * checkUnlockStatusAction
 * 
 * Guard Utility (Gatekeeper Level)
 * Returns TRUE if a valid, non-expired approval exists for the student.
 */
export async function checkUnlockStatusAction(studentId: string) {
  try {
    const active = await prisma.unlockRequest.findFirst({
      where: {
        studentId,
        status: "APPROVED",
        expiresAt: { gte: new Date() }
      }
    });
    return { success: true, isUnlocked: !!active };
  } catch (error: any) {
    return { success: false, isUnlocked: false };
  }
}
