import { getSovereignIdentity } from "./auth/backbone";

/**
 * 🛡️ ERROR SENTINEL
 * Sanitizes and masks sensitive system errors for production.
 */
export async function sanitizeError(error: unknown) {
  const tenant = await getSovereignIdentity();
  
  // 🏛️ RULE: Platform Admins get full verbosity for debugging
  if (tenant?.role === 'PLATFORM_ADMIN' || tenant?.role === 'DEVELOPER') {
    return error instanceof Error ? error.message : String(error);
  }

  // 🔒 RULE: Mask for all others
  const msg = error instanceof Error ? error.message : String(error);
  
  // Detect sensitive leakage (DB paths, IDs, relations)
  const isSensitive = /prisma|sql|db\.|select|where|findUnique/i.test(msg);
  
  if (isSensitive) {
    console.error("🔒 MASKED SENSITIVE ERROR:", msg);
    return "Operational error occurred. Contact support if this persists.";
  }

  return msg;
}
