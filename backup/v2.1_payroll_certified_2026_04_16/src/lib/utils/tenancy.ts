import { SovereignIdentity } from "../auth/backbone";

/**
 * 🏛️ TENANCY RAILS
 * 
 * Provides structural Prisma filters to enforce institutional isolation.
 */

/**
 * getTenancyFilters
 * 
 * Generates Prisma 'where' conditions based on the Sovereign Identity.
 */
export function getTenancyFilters(identity: SovereignIdentity) {
  // 🛡️ GLOBAL DEVELOPER: 
  // - If schoolId is present (active context), filter by school.
  // - Otherwise, return empty (global access).
  if (identity.role === 'DEVELOPER') {
    return identity.schoolId && identity.branchId === "GLOBAL" 
       ? { schoolId: identity.schoolId } 
       : {};
  }

  // 🏛️ SCHOOL-LOCKED ROLES: Restricted to their specific school
  return {
    schoolId: identity.schoolId,
    // Owners/Developers (within a school) see everything unless a branch is selected
    ...(identity.branchId && identity.branchId !== 'GLOBAL' ? { branchId: identity.branchId } : {})
  };
}
