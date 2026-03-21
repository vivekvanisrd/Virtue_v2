import prisma from "@/lib/prisma";

export type AuditLogInput = {
  schoolId: string;
  userId: string;
  entityType: "STUDENT" | "STAFF" | "FEE" | "PAYMENT" | "SYSTEM" | "ROLE" | "ACADEMIC" | string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "IMPORT" | string;
  details?: string;
  ipAddress?: string;
};

/**
 * Centrally logs an activity into the ActivityLog table.
 * Ensure this is awaited in critical paths where history is required, 
 * or called safely if fire-and-forget is acceptable.
 */
export async function logActivity(data: AuditLogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        schoolId: data.schoolId,
        userId: data.userId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        details: data.details,
        ipAddress: data.ipAddress,
      }
    });
  } catch (error) {
    // In an enterprise system, failing to audit log is sometimes treated as a critical failure
    // However, to keep the UI resilient, we log the failure to server console securely.
    console.error("CRITICAL: Failed to write to Audit Activity Log", error, data);
  }
}
