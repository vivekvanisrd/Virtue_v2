import { verifySession } from "../actions/auth-native";
import prisma from "../prisma";
import { cookies } from "next/headers";
import { tenancyStorage, type TenantStore } from "../auth/tenancy-context";

/**
 * TenantContext
 * 
 * Provides strict scoping for all database operations based on the 
 * logged-in user's identity.
 */
export interface TenantContext {
  schoolId: string;
  branchId: string;
  role: "DEVELOPER" | "OWNER" | "PRINCIPAL" | "ACCOUNTANT" | "TEACHER" | "STAFF";
  permissions: string[];
}

/**
 * getTenantContext
 * 
 * Retrieves the current session from our internal JWT cookie and 
 * provides the tenancy context.
 * 
 * @throws Error if session is invalid or not found.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await verifySession();

  if (!session) {
    console.warn("[TENANT-CONTEXT] No active native session found.");
    throw new Error("Authentication required: No active session found.");
  }

  console.log(`[TENANT-CONTEXT] Session active for: ${session.email} (Role: ${session.role})`);

  // Use session data directly (Performance optimization)
  // For developers, we still check the cookie for school switching
  let schoolId = session.schoolId;
  let branchId = session.branchId || "GLOBAL";
  let isGlobalDev = false;

  if (session.role === "DEVELOPER") {
    const cookieStore = await cookies();
    const activeSchoolId = cookieStore.get('v-active-school')?.value;
    schoolId = activeSchoolId || session.schoolId;
    branchId = "GLOBAL";
    isGlobalDev = !activeSchoolId; // Full global if no school selected
  }

  const store: TenantStore = {
    schoolId,
    branchId,
    role: session.role,
    isGlobalDev
  };

  // 🛡️ PERSIST TENANCY: Set the store for the remainder of the request execution
  tenancyStorage.enterWith(store);

  if (session.role === "DEVELOPER") {
    return {
      schoolId,
      branchId: "GLOBAL",
      role: "DEVELOPER",
      permissions: ["*"]
    };
  }

  // Fallback for stale sessions missing branchId
  branchId = branchId || session.branchId;
  if (!branchId || branchId === "GLOBAL") {
    const staff = await prisma.staff.findUnique({
      where: { id: session.staffId },
      select: { branchId: true }
    });
    if (staff) {
      branchId = staff.branchId;
    }
  }

  return {
    schoolId: session.schoolId,
    branchId: branchId || "GLOBAL", 
    role: session.role as any,
    permissions: []
  };
}

/**
 * getTenancyFilters
 * 
 * Helper to generate Prisma 'where' conditions based on context.
 */
export function getTenancyFilters(context: TenantContext) {
  // 🛡️ GLOBAL DEVELOPER: 
  // - If schoolId is present (active context), filter by school.
  // - Otherwise, return empty (global access).
  if (context.role === 'DEVELOPER') {
    return context.schoolId && context.branchId === "GLOBAL" 
       ? { schoolId: context.schoolId } 
       : {};
  }

  // 🏛️ SCHOOL-LOCKED ROLES: Restricted to their specific school
  return {
    schoolId: context.schoolId,
    // Owners see everything in the school; others are branch-locked.
    ...(context.role !== 'OWNER' ? { branchId: context.branchId } : {})
  };
}
