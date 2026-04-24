import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "./backbone";
import { Capability, STANDARD_ROLES } from "@/types/auth";

/**
 * 🛡️ checkCapability
 * 
 * FAIL-SHUT Governance Engine.
 * Verifies if the current user has the required capacity for an action.
 * 
 * @param requiredCapability The atomic action being attempted
 * @throws Error INSUFFICIENT_PERMISSION if check fails
 */
export async function checkCapability(requiredCapability: Capability) {
  const identity = await getSovereignIdentity();
  if (!identity) {
    throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
  }

  // 1. 🏅 OWNER/GLOBAL_DEV OVERRIDE
  // Owners and Developers bypass granular checks for institutional survival.
  if (identity.role === 'OWNER' || identity.role === 'DEVELOPER' || identity.isGlobalDev) {
    return true;
  }

  // 2. 🏛️ RESOLVE INSTITUTIONAL ROLE
  // We look up the 'SovereignRole' record for this specific school and role name.
  let sovereignRole = await prisma.sovereignRole.findFirst({
    where: {
      schoolId: identity.schoolId,
      name: identity.role
    }
  });

  // 🛡️ AGGRESSIVE SELF-HEALING ARCHITECTURE
  // If the role is a Standard Role and not custom, we ensure it matches the current System Registry.
  if (STANDARD_ROLES[identity.role] && !sovereignRole?.isCustom) {
      const currentCapabilities = (sovereignRole?.capabilities as Record<string, any>) || {};
      
      // If missing the specific required capability, or record doesn't exist, we force a sync
      if (!sovereignRole || currentCapabilities[requiredCapability] !== true) {
          console.log(`📡 [RBAC_SYNC] Synchronizing Standard Role '${identity.role}' for School ${identity.schoolId}...`);
          
          sovereignRole = await prisma.sovereignRole.upsert({
            where: {
              id: (await prisma.sovereignRole.findFirst({ where: { schoolId: identity.schoolId, name: identity.role } }))?.id || "NEW"
            },
            update: { capabilities: STANDARD_ROLES[identity.role] },
            create: {
              name: identity.role,
              schoolId: identity.schoolId,
              capabilities: STANDARD_ROLES[identity.role],
              isCustom: false
            }
          });
      }
  }

  if (!sovereignRole) {
    console.error(`🛑 [RBAC_FAIL] Role '${identity.role}' not found in Sovereign Registry for School ${identity.schoolId}`);
    throw new Error(`INSUFFICIENT_PERMISSION: Role '${identity.role}' has no capabilities defined in the Institutional Registry.`);
  }

  const capabilities = sovereignRole.capabilities as Record<string, any>;
  
  // 3. 🎯 TARGETED CAPABILITY CHECK
  if (capabilities[requiredCapability] === true) {
    return true;
  }

  console.warn(`🛑 [RBAC_DENIED] Staff ${identity.staffId} (Role: ${identity.role}) lacking capability: ${requiredCapability}`);
  throw new Error("INSUFFICIENT_PERMISSION: You do not have the authorization for this specific action.");
}

/**
 * 🛰️ seedSovereignRolesAction
 * 
 * INTERNAL UTILITY: Populates the SovereignRole table with the 15-role industry standards.
 * Typically run after branch/school creation.
 */
export async function seedSovereignRolesAction(schoolId: string) {
  const roles = Object.keys(STANDARD_ROLES);
  
  const results = await Promise.all(roles.map(async (roleName) => {
    return prisma.sovereignRole.upsert({
      where: {
        // Since schoolId + name is not a unique index in schema but conceptually unique, 
        // we use findFirst + create/update or a composite check if existing.
        // For now, identity by name + schoolId as logical key.
        id: (await prisma.sovereignRole.findFirst({ where: { schoolId, name: roleName } }))?.id || "NEW"
      },
      update: {
        capabilities: STANDARD_ROLES[roleName]
      },
      create: {
        name: roleName,
        schoolId: schoolId,
        capabilities: STANDARD_ROLES[roleName],
        isCustom: false
      }
    });
  }));

  console.log(`✅ [RBAC_SEED] Seeded ${results.length} standard roles for School ${schoolId}`);
  return { success: true, count: results.length };
}
