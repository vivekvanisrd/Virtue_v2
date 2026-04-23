"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";
import { checkCapability } from "../auth/rbac";
import { ST_CANCELLED } from "../constants/admission-statuses";

/**
 * logFinancialAction
 * 
 * Internal Helper (Utility Level)
 * Logs every financial modification for the 2026-27 Elite ERP audit.
 */
export async function logFinancialAction(data: {
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  reason?: string;
  riskFlag?: boolean;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    const log = await prisma.financialAuditLog.create({
      data: {
        ...data,
        schoolId: context.schoolId,
        branchId: context.branchId
      }
    });
    return { success: true, data: log };
  } catch (error: any) {
    console.error("Audit log failure:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * getFinancialAuditLogsAction
 * 
 * Access Controlled (Management View)
 * Filters by User, Date, and High-Risk Flags.
 */
export async function getFinancialAuditLogsAction(filters?: {
  performedBy?: string;
  riskOnly?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
    
    // Strict Tenancy Isolation
    const logs = await prisma.financialAuditLog.findMany({
      where: {
        schoolId: context.schoolId,
        branchId: context.branchId,
        performedBy: filters?.performedBy,
        riskFlag: filters?.riskOnly || undefined,
        createdAt: filters?.startDate ? {
          gte: filters.startDate,
          lte: filters.endDate || new Date()
        } : undefined
      },
      include: { staff: true },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, error: "Failed to fetch audit records: " + error.message };
  }
}

/**
 * getRecentActivity
 * 
 * General-purpose system activity feed for the 2026-27 dashboard.
 * Queries the core ActivityLog model.
 */
export async function getRecentActivity(limit: number = 100) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    
    const logs = await prisma.activityLog.findMany({
      where: { schoolId: identity.schoolId },
      orderBy: { createdAt: "desc" },
      take: limit
    });
    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, error: "Activity Feed Failure: " + error.message };
  }
}

/**
 * 📦 archiveStudentAction
 * 
 * Capability Restricted: ARCHIVE_STUDENT
 * Performs a 'Soft Delete' on a student record, moving them to the Audit Bin.
 */
export async function archiveStudentAction(studentId: string, reason: string) {
  try {
    await checkCapability('ARCHIVE_STUDENT');
    const identity = await getSovereignIdentity();
    
    const result = await prisma.student.update({
      where: { id: studentId, schoolId: identity!.schoolId },
      data: {
        isDeleted: true,
        status: ST_CANCELLED, // Record cancellation as the archive reason
        updatedAt: new Date()
      }
    });

    // 📝 AUDIT LOG: Archival Event
    await prisma.activityLog.create({
      data: {
        schoolId: identity!.schoolId,
        staffId: identity!.staffId,
        action: "STUDENT_ARCHIVED",
        entityType: "STUDENT",
        entityId: studentId,
        metadata: { reason, timestamp: new Date().toISOString() }
      }
    });

    revalidatePath("/admin/students");
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️ getArchivedRegistryAction
 * 
 * Capability Restricted: VIEW_AUDIT_BIN
 * Returns the hidden 'Soft-Deleted' student list from the registry for audit.
 */
export async function getArchivedRegistryAction() {
  try {
    await checkCapability('VIEW_AUDIT_BIN');
    const identity = await getSovereignIdentity();

    const archived = await prisma.student.findMany({
      where: {
        schoolId: identity!.schoolId,
        isDeleted: true
      },
      include: {
        academic: { include: { class: true } },
        family: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return { success: true, data: archived };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
