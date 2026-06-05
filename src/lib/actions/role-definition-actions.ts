"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { logActivity } from "@/lib/utils/audit-logger";
import { STANDARD_ROLES, Capability } from "@/types/auth";

// ─────────────────────────────────────────────────────────────────────────────
// 📖 READ: Get all roles visible to the current user
//   - OWNER / DEVELOPER  → all school-wide + all branch roles
//   - PRINCIPAL / STAFF  → school-wide roles + own-branch roles only
// ─────────────────────────────────────────────────────────────────────────────
export async function getCustomRoles(schoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || (identity.schoolId !== schoolId && !identity.isGlobalDev)) {
      throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    }

    // Auto-seed standard roles if none exist yet for this school
    const count = await prisma.sovereignRole.count({ where: { schoolId } });
    if (count === 0) {
      await _seedDefaultRoles(schoolId);
    }

    // Build the query filter based on the caller's privilege
    const isGlobal = identity.role === "OWNER" || identity.role === "DEVELOPER" || identity.isGlobalDev;
    const whereClause: any = { schoolId };

    if (!isGlobal && identity.branchId) {
      // Principals / Staff see: school-wide roles (branchId = null) + own-branch roles
      whereClause.OR = [
        { branchId: null },
        { branchId: identity.branchId }
      ];
    }

    const roles = await prisma.sovereignRole.findMany({
      where: whereClause,
      orderBy: [
        { isSystem: "desc" },   // system roles first
        { branchId: "asc" },    // school-wide before branch-specific
        { name: "asc" }
      ]
    });

    return { success: true, data: roles };
  } catch (error: any) {
    console.error("Error fetching custom roles:", error);
    return { success: false, error: "Failed to fetch custom roles" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ✏️ CREATE: Create a new role
//   branchId = null  → school-wide role (OWNER only)
//   branchId = id    → branch-scoped role (OWNER or PRINCIPAL of that branch)
// ─────────────────────────────────────────────────────────────────────────────
export async function createCustomRole(data: {
  schoolId: string;
  branchId?: string | null;          // null/undefined = school-wide
  name: string;
  description?: string;
  capabilities: Record<string, boolean>;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !["DEVELOPER", "PLATFORM_ADMIN", "OWNER", "PRINCIPAL"].includes(identity.role)) {
      throw new Error("SECURE_AUTH_REQUIRED: Insufficient privileges to define roles.");
    }

    if (identity.schoolId !== data.schoolId && !identity.isGlobalDev) {
      throw new Error("SECURE_AUTH_REQUIRED: Context mismatch.");
    }

    // 🛡️ BRANCH GUARD: PRINCIPAL can only create roles for their own branch
    const targetBranchId = data.branchId ?? null;
    if (identity.role === "PRINCIPAL") {
      if (targetBranchId && targetBranchId !== identity.branchId) {
        throw new Error("SECURITY_VIOLATION: Principals can only create roles for their own branch.");
      }
      // Principals cannot create school-wide (null) roles — only OWNER can
      if (!targetBranchId) {
        throw new Error("SECURITY_VIOLATION: Only Owners can create school-wide roles. Specify a branchId.");
      }
    }

    const newRole = await prisma.sovereignRole.create({
      data: {
        schoolId: data.schoolId,
        branchId: targetBranchId,
        name: data.name,
        description: data.description,
        capabilities: data.capabilities,     // ✅ correct field — was wrongly 'permissions'
        isSystem: false,                     // ✅ correct field — was wrongly 'isCustom: false'
        isCustom: true,
      }
    });

    await logActivity({
      schoolId: data.schoolId,
      branchId: targetBranchId || undefined,
      userId: identity.staffId,
      entityType: "SOVEREIGN_ROLE",
      entityId: newRole.id,
      action: "CREATE",
      details: `Created ${targetBranchId ? "branch-scoped" : "school-wide"} role: ${data.name}${targetBranchId ? ` (Branch: ${targetBranchId})` : ""}`
    });

    revalidatePath("/dashboard");
    return { success: true, data: newRole };
  } catch (error: any) {
    console.error("Error creating role:", error);
    if (error.code === "P2002") {
      return { success: false, error: "A role with this name already exists in your institution." };
    }
    return { success: false, error: error.message || "Failed to create custom role" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ✏️ UPDATE: Update capabilities of an existing role
// ─────────────────────────────────────────────────────────────────────────────
export async function updateCustomRole(roleId: string, data: {
  description?: string;
  capabilities: Record<string, boolean>;
}) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !["DEVELOPER", "PLATFORM_ADMIN", "OWNER", "PRINCIPAL"].includes(identity.role)) {
      throw new Error("SECURE_AUTH_REQUIRED: Insufficient privileges.");
    }

    const role = await prisma.sovereignRole.findUnique({ where: { id: roleId } });
    if (!role) return { success: false, error: "Role not found." };
    if (role.schoolId !== identity.schoolId && !identity.isGlobalDev) {
      return { success: false, error: "SECURITY_VIOLATION: Role mismatch." };
    }
    if (role.isSystem) return { success: false, error: "System roles cannot be modified." };

    // 🛡️ BRANCH GUARD: PRINCIPAL can only update roles in their own branch
    if (identity.role === "PRINCIPAL" && role.branchId && role.branchId !== identity.branchId) {
      return { success: false, error: "SECURITY_VIOLATION: Cannot update a role from a different branch." };
    }

    const updated = await prisma.sovereignRole.update({
      where: { id: roleId },
      data: {
        description: data.description,
        capabilities: data.capabilities,
      }
    });

    await logActivity({
      schoolId: role.schoolId,
      branchId: role.branchId || undefined,
      userId: identity.staffId,
      entityType: "SOVEREIGN_ROLE",
      entityId: roleId,
      action: "UPDATE",
      details: `Updated capabilities for role: ${role.name}`
    });

    revalidatePath("/dashboard");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating role:", error);
    return { success: false, error: "Failed to update role" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🗑️ DELETE: Remove a custom role (not system roles, not roles in use)
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteCustomRole(roleId: string, schoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !["DEVELOPER", "PLATFORM_ADMIN", "OWNER", "PRINCIPAL"].includes(identity.role)) {
      throw new Error("SECURE_AUTH_REQUIRED: Insufficient privileges.");
    }

    const role = await prisma.sovereignRole.findUnique({
      where: { id: roleId },
      include: {
        _count: { select: { staff: true } }
      }
    });

    if (!role) return { success: false, error: "Role not found." };
    if (role.schoolId !== schoolId) return { success: false, error: "Role mismatch." };
    if (role.isSystem) return { success: false, error: "System roles cannot be deleted. They ensure foundational access." };
    if (role._count.staff > 0) {
      return { success: false, error: `Cannot delete: ${role._count.staff} staff members are currently assigned to this role.` };
    }

    // 🛡️ BRANCH GUARD: PRINCIPAL can only delete roles from their own branch
    if (identity.role === "PRINCIPAL" && role.branchId && role.branchId !== identity.branchId) {
      return { success: false, error: "SECURITY_VIOLATION: Cannot delete a role from a different branch." };
    }

    await prisma.sovereignRole.delete({ where: { id: roleId } });

    await logActivity({
      schoolId,
      branchId: role.branchId || undefined,
      userId: identity.staffId,
      entityType: "SOVEREIGN_ROLE",
      entityId: roleId,
      action: "DELETE",
      details: `Deleted custom role: ${role.name}`
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return { success: false, error: "Failed to delete custom role" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌱 SEED: Initialize the 15 industry-standard school roles for a school
//   These are school-wide (branchId = null) and marked isSystem = true
// ─────────────────────────────────────────────────────────────────────────────
async function _seedDefaultRoles(schoolId: string) {
  const standardRoleNames = Object.keys(STANDARD_ROLES);

  for (const roleName of standardRoleNames) {
    const existing = await prisma.sovereignRole.findFirst({
      where: { schoolId, name: roleName }
    });
    if (!existing) {
      await prisma.sovereignRole.create({
        data: {
          schoolId,
          branchId: null,           // School-wide standard roles
          name: roleName,
          description: `Standard system role: ${roleName.replace(/_/g, " ")}`,
          capabilities: STANDARD_ROLES[roleName] as any,  // ✅ correct field
          isSystem: true,           // ✅ correct field — was wrongly 'isCustom: false'
          isCustom: false,
        }
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🌱 EXPORTED SEED: Called during branch/school provisioning
// ─────────────────────────────────────────────────────────────────────────────
export async function seedSchoolRoles(schoolId: string) {
  await _seedDefaultRoles(schoolId);
  return { success: true };
}
