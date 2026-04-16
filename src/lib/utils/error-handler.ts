/**
 * Institutional Error Sanitizer
 * 
 * Transforms technical database/Prisma errors into user-friendly institutional alerts.
 * This prevents raw SQL, stack traces, and internal schema details from leaking to the UI.
 */

export type SanitizedResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

export function sanitizeError(error: any): { error: string; code: string } {
  const message = error.message || String(error);
  
  // 1. Connection Errors (Port ghosts/Supabase timeouts)
  if (message.includes("Can't reach database server") || message.includes("ETIMEDOUT") || message.includes("ECONNREFUSED")) {
    return {
      code: "CONNECTION_INTERFERENCE",
      error: "Network Interference: Unable to reach the secure vault. Please ensure your connection is stable or try again in a moment."
    };
  }

  // 2. Tenancy/Security Violations
  if (message.includes("SECURITY_VIOLATION") || message.includes("Institutional breach")) {
    return {
      code: "SECURITY_GATING_FAILURE",
      error: "Security Gate Violation: You are not authorized to perform this operation across institutional boundaries."
    };
  }

  // 3. Unique Constraints (Duplicates)
  if (message.includes("Unique constraint failed") || message.includes("already exists")) {
    return {
      code: "DUPLICATE_RECORD",
      error: "Identification Conflict: A record with this ID, Phone, or Email already exists in our registry."
    };
  }

  // 4. Schema/Validation Errors (The "Unknown Argument" types)
  if (message.includes("Unknown argument") || message.includes("Invalid `prisma")) {
    return {
      code: "SYSTEM_SYNC_REQUIRED",
      error: "Configuration Sync Required: Your session is out of sync with the school's security rules. Please refresh the page and try again."
    };
  }

  // 5. Raw SQL Errors (PgBouncer, etc.)
  if (message.includes("cannot insert multiple commands") || message.includes("prepared statement")) {
    return {
      code: "PROTOCOL_MISMATCH",
      error: "Protocol Handshake Mismatch: Our security pool is busy. Please try one more time."
    };
  }

  // Default Fallback
  console.error("🕵️ [UNSANITIZED_ERROR]", error);
  return {
    code: "UNEXPECTED_SYSTEM_ERROR",
    error: "Unexpected System Fault: Our internal monitors have been notified. Please try again shortly."
  };
}
