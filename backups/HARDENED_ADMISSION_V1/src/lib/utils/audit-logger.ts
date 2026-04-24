/**
 * 🏛️ PaVa-EDUX HIGH-FIDELITY AUDIT LOGGING (Suggestion 5)
 * Centralized authority for capturing structured mutation deltas for forensic trail.
 */

import prisma from "../prisma";

export type AuditAction = 
  | "GENESIS_INITIALIZATION"
  | "SCHOOL_CONFIG_UPDATE"
  | "ACADEMIC_YEAR_LOCK"
  | "FOUNDATION_SETUP"
  | "DATA_PURGE"
  | "IDENTITY_REGISTRATION"
  | "FEE_COMPONENT_BLUEPRINT"
  | "MIGRATION_EXECUTION"
  | "ADMISSION_FINALIZED"
  | `EVENT_PROCESSED:${string}`
  | (string & {}); // Law 15: Flexibility for legacy/custom actions

interface AuditLogParams {
  schoolId: string;
  branchId?: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: string;
  payload?: any;
  ipAddress?: string;
}

/**
 * Commits a structured JSON audit trail to the Sovereign Ledger.
 * Law 9: "Every mutation MUST be logged in a centralized JSON audit trail."
 */
export async function logPlatformActivity({
  schoolId,
  branchId,
  userId,
  action,
  entityType,
  entityId,
  details,
  payload,
  ipAddress
}: AuditLogParams) {
  try {
    // Law 9: Serialize payload into details if details is empty, or append it
    const finalDetails = payload 
      ? `${details || ''} [Metadata: ${JSON.stringify(payload)}]`.trim()
      : details;

    return await prisma.activityLog.create({
      data: {
        schoolId,
        branchId,
        userId,
        action,
        entityType,
        entityId,
        details: finalDetails,
        ipAddress,
      }
    });
  } catch (error) {
    // Audit failure must not crash the parent transaction, but should ideally be caught by higher-level sentinel
    console.error("🏁 [AUDIT_FAILURE] Critical logging failure:", error);
    return null;
  }
}

/**
 * Legacy Alias for logPlatformActivity
 */
export const logActivity = logPlatformActivity;
