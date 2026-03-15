import { createClient } from "../supabase/server";
import prisma from "../prisma";

/**
 * TenantContext
 * 
 * Provides strict scoping for all database operations based on the 
 * logged-in user's identity.
 */
export interface TenantContext {
  schoolId: string;
  branchId: string;
  role: "OWNER" | "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "STAFF";
  permissions: string[];
}

/**
 * getTenantContext
 * 
 * Retrieves the current user from Supabase and fetches their 
 * configuration from the database.
 * 
 * @throws Error if user is not authenticated or not found in Staff table.
 */
export async function getTenantContext(): Promise<TenantContext> {
  // FALLBACK: For development/initial setup or standalone scripts, we might need a default context
  if (process.env.NODE_ENV === 'development') {
      console.warn("Returning development tenant context (VR-SCH01).");
      return {
          schoolId: "VR-SCH01",
          branchId: "VR-RCB01",
          role: "OWNER",
          permissions: ["*"]
      };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required: No active session found.");
  }

  // Find staff/user profile in our DB
  const profile = await prisma.staff.findUnique({
    where: { userId: user.id },
    include: {
      professional: true
    }
  });

  if (!profile) {
    throw new Error("Unauthorized: No staff profile linked to this user account.");
  }

  return {
    schoolId: profile.schoolId,
    branchId: profile.branchId,
    role: profile.role as any,
    permissions: [] // Placeholder for granular permissions
  };
}

/**
 * getTenancyFilters
 * 
 * Helper to generate Prisma 'where' conditions based on context.
 */
export function getTenancyFilters(context: TenantContext) {
  return {
    schoolId: context.schoolId,
    // Owners see everything in the school; others are branch-locked.
    ...(context.role !== 'OWNER' ? { branchId: context.branchId } : {})
  };
}
