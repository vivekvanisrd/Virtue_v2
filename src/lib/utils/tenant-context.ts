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
  staffId: string;
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
    console.warn("[TENANT-CONTEXT] No active native session found. Returning guest context for build/prerender.");
    return {
      schoolId: "",
      branchId: "GLOBAL",
      staffId: "",
      role: "STAFF", // Safe fallback
      permissions: []
    };
  }

  console.log(`[TENANT-CONTEXT] Session active for: ${session.email} (Role: ${session.role})`);

  // Use session data directly (Performance optimization)
  let schoolId = session.schoolId;
  let branchId = session.branchId || "GLOBAL";
  let isGlobalDev = false;

  // 🏢 BRANCH CONTEXT: Check for active branch selection (Owners/Developers)
  const cookieStore = await cookies();
  const activeBranchId = cookieStore.get('v-active-branch')?.value;

  if (session.role === "DEVELOPER") {
    const activeSchoolId = cookieStore.get('v-active-school')?.value;
    schoolId = activeSchoolId || session.schoolId;
    branchId = activeBranchId || "GLOBAL"; // Devs can switch branches too
    isGlobalDev = !activeSchoolId; 
  } else if (session.role === "OWNER") {
    // Owners default to GLOBAL (All Branches) unless a branch is selected
    branchId = activeBranchId || "GLOBAL";
  } else {
    // Other roles are locked to their assigned branch
    branchId = session.branchId || "GLOBAL";
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
      staffId: "DEV-BYPASS",
      role: "DEVELOPER",
      permissions: ["*"]
    };
  }

  // --- SELF-HEALING (ADMINS ONLY) ---
  if (session.role === "DEVELOPER" || session.role === "OWNER") {
    // Check if branchId exists in DB for this school
    // This handles stale cookies or legacy IDs (e.g. BR-VIVA-01 vs VIVA-MAIN01)
    if (branchId && branchId !== "GLOBAL") {
        const branchExists = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { id: true, schoolId: true }
        });

        if (!branchExists || branchExists.schoolId !== schoolId) {
            console.warn(`[SELF-HEAL] Branch ${branchId} is stale or invalid. Finding alternative...`);
            const fallbackBranch = await prisma.branch.findFirst({
                where: { schoolId },
                select: { id: true }
            });
            
            if (fallbackBranch) {
                console.log(`[SELF-HEAL] Auto-correcting to: ${fallbackBranch.id}`);
                branchId = fallbackBranch.id;
            } else {
                branchId = "GLOBAL";
            }
        }
    }
  }

  return {
    schoolId: schoolId || session.schoolId,
    branchId: branchId || "GLOBAL",
    staffId: session.staffId,
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
    // Owners/Developers see everything unless a branch is selected
    ...(context.branchId !== 'GLOBAL' ? { branchId: context.branchId } : {})
  };
}
