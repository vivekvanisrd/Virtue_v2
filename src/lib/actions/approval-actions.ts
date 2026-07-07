"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";

export interface CreateApprovalRequestInput {
  category: "LEAVE" | "ADVANCE" | "SUPPLIES" | "CUSTOM";
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  amount?: number;
}

/**
 * Submit a new request from staff
 */
export async function createApprovalRequestAction(data: CreateApprovalRequestInput) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, staffId } = identity;

    if (!data.category || !data.title || !data.description) {
      throw new Error("MISSING_FIELDS: Category, Title, and Description are required.");
    }

    const request = await prisma.approvalRequest.create({
      data: {
        schoolId,
        branchId: branchId || null,
        staffId,
        category: data.category,
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        amount: data.amount ? Number(data.amount) : null,
        status: "PENDING"
      }
    });

    revalidatePath("/dashboard");
    return { success: true, data: JSON.parse(JSON.stringify(request)) };
  } catch (err: any) {
    console.error("Failed to create approval request:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all requests submitted by the logged-in staff member
 */
export async function getStaffApprovalRequestsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, staffId } = identity;

    const requests = await prisma.approvalRequest.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        staffId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, data: JSON.parse(JSON.stringify(requests)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all pending review requests for principal/management (branch-scoped if branch locked)
 */
export async function getPendingApprovalsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, role } = identity;

    // Check permissions: Only principals/admins/owners/developers can review requests
    const canReview = ["OWNER", "DEVELOPER", "PRINCIPAL", "ADMIN"].includes(role);
    if (!canReview) {
      throw new Error("UNAUTHORIZED_ACCESS: You do not have permission to view review requests.");
    }

    // Branch locking: Principals are restricted to their own branch
    const isGlobalManager = role === "OWNER" || role === "DEVELOPER";

    const requests = await prisma.approvalRequest.findMany({
      where: {
        schoolId,
        ...(branchId && !isGlobalManager ? { branchId } : {}),
        status: "PENDING"
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            staffCode: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, data: JSON.parse(JSON.stringify(requests)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch all resolved review requests (APPROVED/REJECTED history)
 */
export async function getResolvedApprovalsAction() {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, role } = identity;

    const canReview = ["OWNER", "DEVELOPER", "PRINCIPAL", "ADMIN"].includes(role);
    if (!canReview) {
      throw new Error("UNAUTHORIZED_ACCESS: You do not have permission to view resolved requests.");
    }

    const isGlobalManager = role === "OWNER" || role === "DEVELOPER";

    const requests = await prisma.approvalRequest.findMany({
      where: {
        schoolId,
        ...(branchId && !isGlobalManager ? { branchId } : {}),
        status: { in: ["APPROVED", "REJECTED"] }
      },
      include: {
        staff: {
          select: {
            firstName: true,
            lastName: true,
            staffCode: true,
            role: true
          }
        }
      },
      orderBy: {
        reviewedAt: "desc"
      },
      take: 100
    });

    return { success: true, data: JSON.parse(JSON.stringify(requests)) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Approve or Reject a request
 */
export async function resolveApprovalRequestAction(data: {
  requestId: string;
  status: "APPROVED" | "REJECTED";
  comments: string;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
    const { schoolId, branchId, staffId: reviewerId, name: reviewerName, role } = identity;

    const canReview = ["OWNER", "DEVELOPER", "PRINCIPAL", "ADMIN"].includes(role);
    if (!canReview) {
      throw new Error("UNAUTHORIZED_ACCESS: You do not have permission to review requests.");
    }

    const isGlobalManager = role === "OWNER" || role === "DEVELOPER";

    // Load request directly under tenancy/branch filters
    const request = await prisma.approvalRequest.findFirst({
      where: { 
        id: data.requestId,
        schoolId,
        ...(branchId && !isGlobalManager ? { branchId } : {})
      }
    });

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND: The requested record does not exist under your institutional scope.");
    }

    if (request.status !== "PENDING") {
      throw new Error("INVALID_STATE: This request has already been resolved.");
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.status,
        reviewerId,
        reviewerName: reviewerName || "Reviewer",
        reviewComments: data.comments,
        reviewedAt: new Date()
      }
    });

    revalidatePath("/dashboard");
    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (err: any) {
    console.error("Failed to resolve approval request:", err);
    return { success: false, error: err.message };
  }
}
