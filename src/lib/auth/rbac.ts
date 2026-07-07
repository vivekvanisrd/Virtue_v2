import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "./backbone";
import { Capability, STANDARD_ROLES } from "@/types/auth";

/**
 * 🛡️ checkCapability
 *
 * FAIL-SHUT Governance Engine.
 * Verifies if the current user has the required capability for an action.
 *
 * Role resolution order:
 *  1. Branch-scoped role (branchId matches)  — most specific
 *  2. School-wide role   (branchId = null)   — fallback
 *  3. STANDARD_ROLES in-memory               — safety net / self-healing
 *
 * @param requiredCapability The atomic action being attempted
 * @throws Error INSUFFICIENT_PERMISSION if check fails
 */
export async function checkCapability(requiredCapability: Capability) {
  const identity = await getSovereignIdentity();
  if (!identity) {
    throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
  }

  // 1. 🏅 OWNER / GLOBAL_DEV OVERRIDE
  if (identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.isGlobalDev) {
    return true;
  }

  // 2. 🏛️ RESOLVE SOVEREIGN ROLE — branch-scoped first, then school-wide
  let sovereignRole = await _resolveSovereignRole(identity.schoolId, identity.role, identity.branchId);

  // 3. 🛡️ SELF-HEALING: If standard role not found or capabilities stale, sync it
  if (STANDARD_ROLES[identity.role] && (!sovereignRole || !sovereignRole.isSystem)) {
    const existingCapabilities = (sovereignRole?.capabilities as Record<string, any>) || {};
    const needsSync = !sovereignRole || existingCapabilities[requiredCapability] !== true;

    if (needsSync) {
      console.log(`📡 [RBAC_SYNC] Synchronizing Standard Role '${identity.role}' for School ${identity.schoolId}...`);
      sovereignRole = await _upsertStandardRole(identity.schoolId, identity.role);
    }
  }

  if (!sovereignRole) {
    console.error(`🛑 [RBAC_FAIL] Role '${identity.role}' not found in Sovereign Registry for School ${identity.schoolId}`);
    throw new Error(`INSUFFICIENT_PERMISSION: Role '${identity.role}' has no capabilities defined in the Institutional Registry.`);
  }

  const capabilities = sovereignRole.capabilities as Record<string, any>;

  // 4. 🎯 TARGETED CAPABILITY CHECK
  if (capabilities[requiredCapability] === true) {
    return true;
  }

  console.warn(`🛑 [RBAC_DENIED] Staff ${identity.staffId} (Role: ${identity.role}) lacking capability: ${requiredCapability}`);
  throw new Error("INSUFFICIENT_PERMISSION: You do not have the authorization for this specific action.");
}

/**
 * _resolveSovereignRole
 *
 * Priority: branch-scoped role > school-wide role
 * This ensures branch heads can have custom permissions that differ from school defaults.
 */
async function _resolveSovereignRole(schoolId: string, roleName: string, branchId?: string) {
  // Try branch-scoped role first
  if (branchId) {
    const branchRole = await prisma.sovereignRole.findFirst({
      where: { schoolId, name: roleName, branchId }
    });
    if (branchRole) return branchRole;
  }

  // Fallback: school-wide role (branchId = null)
  return prisma.sovereignRole.findFirst({
    where: { schoolId, name: roleName, branchId: null }
  });
}

/**
 * _upsertStandardRole
 *
 * Safe upsert using @@unique([schoolId, name]) — no "NEW" id hack.
 * Uses update-or-create pattern to avoid ID collision issues.
 */
async function _upsertStandardRole(schoolId: string, roleName: string) {
  const existing = await prisma.sovereignRole.findFirst({
    where: { schoolId, name: roleName, branchId: null }
  });

  let roleRecord;
  if (existing) {
    roleRecord = await prisma.sovereignRole.update({
      where: { id: existing.id },
      data: {
        capabilities: STANDARD_ROLES[roleName] as any,
        isSystem: true,
        isCustom: false,
      }
    });
  } else {
    roleRecord = await prisma.sovereignRole.create({
      data: {
        name: roleName,
        schoolId,
        branchId: null,      // School-wide standard role
        capabilities: STANDARD_ROLES[roleName] as any,
        isSystem: true,
        isCustom: false,
      }
    });
  }

  try {
    const { revalidateTag } = require("next/cache");
    revalidateTag(`vitals-${schoolId}-${roleName}`);
  } catch (e) {}

  return roleRecord;
}

/**
 * 🛰️ seedSovereignRolesAction
 *
 * INTERNAL UTILITY: Populates the SovereignRole table with 15-role industry standards.
 * Typically called after school/branch creation.
 * Uses safe find+create (no fragile id:"NEW" upsert).
 */
export async function seedSovereignRolesAction(schoolId: string) {
  const roles = Object.keys(STANDARD_ROLES);

  let seeded = 0;
  for (const roleName of roles) {
    const existing = await prisma.sovereignRole.findFirst({
      where: { schoolId, name: roleName, branchId: null }
    });

    if (!existing) {
      await prisma.sovereignRole.create({
        data: {
          name: roleName,
          schoolId,
          branchId: null,
          capabilities: STANDARD_ROLES[roleName] as any,
          isSystem: true,
          isCustom: false,
        }
      });
      seeded++;
    }
  }

  console.log(`✅ [RBAC_SEED] Seeded ${seeded} standard roles for School ${schoolId} (${roles.length - seeded} already existed)`);
  return { success: true, count: seeded };
}
