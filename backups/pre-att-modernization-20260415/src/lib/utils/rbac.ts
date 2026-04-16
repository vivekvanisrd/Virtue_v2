/**
 * Role-Based Access Control (RBAC) Core Utilities
 * 
 * Defines the roles available in PaVa-EDUX and their hierarchical relationships.
 */

// Core Roles defined in the system
export const ROLES = {
  DEVELOPER: "DEVELOPER",     // Highest level (Programmer/System Admin)
  OWNER: "OWNER",             // School Owner/Partner
  PRINCIPAL: "PRINCIPAL",     // School Principal/Director
  ACCOUNTANT: "ACCOUNTANT",   // Finance/Payroll Admin
  TEACHER: "TEACHER",         // Academic Staff
  STAFF: "STAFF",             // Generic Staff (Librarian, Front Desk, etc.)
} as const;

export type Role = keyof typeof ROLES;

// Define a numeric hierarchy for roles. High number = High privilege.
// This allows easy checks like: if (user.roleLevel >= required.roleLevel)
const ROLE_HIERARCHY: Record<Role, number> = {
  DEVELOPER: 100,
  OWNER: 90,
  PRINCIPAL: 80,
  ACCOUNTANT: 60,
  TEACHER: 40,
  STAFF: 20,
};

/**
 * Checks if a given user role has access to a feature that requires a specific minimum role.
 * 
 * @param userRole - The role string from the user's Staff record
 * @param requiredRole - The minimum role required
 * @returns boolean
 */
export function hasAccess(userRole: string | undefined | null, requiredRole: Role): boolean {
  if (!userRole) return false;
  
  const formattedUserRole = userRole.toUpperCase() as Role;
  
  // If the user role doesn't exist in our hierarchy, default to false
  if (!(formattedUserRole in ROLE_HIERARCHY)) return false;

  const userLevel = ROLE_HIERARCHY[formattedUserRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Convenience specific checks
 */
export const isDeveloper = (role?: string | null) => role === ROLES.DEVELOPER;
export const isOwnerOrHigher = (role?: string | null) => hasAccess(role, ROLES.OWNER);
export const isPrincipalOrHigher = (role?: string | null) => hasAccess(role, ROLES.PRINCIPAL);
export const isAccountantOrHigher = (role?: string | null) => hasAccess(role, ROLES.ACCOUNTANT);
export const isTeacherOrHigher = (role?: string | null) => hasAccess(role, ROLES.TEACHER);

/**
 * Function to determine if one role is allowed to change another user's role.
 * e.g., A Principal cannot change an Owner's role.
 */
export function canManageRole(actingUserRole: string | null, targetUserRole: string | null): boolean {
  if (!actingUserRole) return false;
  
  const acting = actingUserRole.toUpperCase() as Role;
  const target = targetUserRole ? (targetUserRole.toUpperCase() as Role) : null;
  
  // Only Developers, Owners, and Principals can manage roles
  if (![ROLES.DEVELOPER, ROLES.OWNER, ROLES.PRINCIPAL].includes(acting as any)) {
    return false;
  }
  
  // If no target role is set yet (new user), we just check if acting user has enough power.
  if (!target) return true;
  
  // A user can manage someone if they are strictly higher in the hierarchy
  // OR if they are an OWNER/DEVELOPER managing another OWNER/DEVELOPER.
  if (acting === ROLES.DEVELOPER) return true;
  if (acting === ROLES.OWNER && target === ROLES.OWNER) return true; // Partners can manage Partners
  
  return ROLE_HIERARCHY[acting] > ROLE_HIERARCHY[target];
}
