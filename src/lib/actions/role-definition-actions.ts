"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { logActivity } from "@/lib/utils/audit-logger";

export async function getCustomRoles(schoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || (identity.schoolId !== schoolId && !identity.isGlobalDev)) {
      throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    }
    
    // Auto-seed if none exist
    const count = await prisma.sovereignRole.count({ where: { schoolId } });
    if (count === 0) {
      await seedDefaultRoles(schoolId);
    }
    
    const roles = await prisma.sovereignRole.findMany({
      where: { schoolId },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' }
      ]
    });
    
    return { success: true, data: roles };
  } catch (error: any) {
    console.error("Error fetching custom roles:", error);
    return { success: false, error: "Failed to fetch custom roles" };
  }
}

export async function createCustomRole(data: { schoolId: string, name: string, description?: string, permissions: string[] }) {
  try {
    const identity = await getSovereignIdentity();
    // High privilege required to define roles
    if (!identity || !['DEVELOPER', 'PLATFORM_ADMIN', 'OWNER', 'PRINCIPAL'].includes(identity.role)) {
       throw new Error("SECURE_AUTH_REQUIRED: Insufficient privileges to define roles.");
    }
    
    if (identity.schoolId !== data.schoolId && !identity.isGlobalDev) {
        throw new Error("SECURE_AUTH_REQUIRED: Context mismatch.");
    }

    const newRole = await prisma.sovereignRole.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystem: false // User-created roles are never system roles
      }
    });

    await logActivity({
      schoolId: data.schoolId,
      userId: identity.staffId,
      entityType: "SOVEREIGN_ROLE",
      entityId: newRole.id,
      action: "CREATE",
      details: `Created new custom role: ${data.name}`
    });

    revalidatePath("/dashboard");
    return { success: true, data: newRole };
  } catch (error: any) {
    console.error("Error creating role:", error);
    if (error.code === 'P2002') return { success: false, error: "A role with this name already exists in your institution." };
    return { success: false, error: "Failed to create custom role" };
  }
}

export async function deleteCustomRole(roleId: string, schoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || !['DEVELOPER', 'PLATFORM_ADMIN', 'OWNER', 'PRINCIPAL'].includes(identity.role)) {
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
    if (role._count.staff > 0) return { success: false, error: `Cannot delete: ${role._count.staff} staff members are currently assigned to this role.` };

    await prisma.sovereignRole.delete({ where: { id: roleId } });

    await logActivity({
      schoolId: schoolId,
      userId: identity.staffId,
      entityType: "SOVEREIGN_ROLE",
      entityId: roleId,
      action: "DELETE",
      details: `Deleted custom role: ${role.name}`
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch(error: any) {
    console.error("Error deleting role:", error);
    return { success: false, error: "Failed to delete custom role" };
  }
}

async function seedDefaultRoles(schoolId: string) {
    const defaults = [
        { name: "Owner", description: "Institution Owner & Partner", permissions: ["ALL_ACCESS"], isSystem: true },
        { name: "Principal", description: "Academic & Administrative Head", permissions: ["MANAGE_STAFF", "MANAGE_ACADEMICS", "MANAGE_STUDENTS", "MANAGE_FINANCE"], isSystem: true },
        { name: "Accountant", description: "Finance and Fee Collections", permissions: ["MANAGE_FINANCE", "VIEW_STUDENTS"], isSystem: true },
        { name: "Teacher", description: "Classroom Instructor", permissions: ["VIEW_ACADEMICS", "MANAGE_ATTENDANCE"], isSystem: true },
        { name: "Staff", description: "General Support Personnel", permissions: ["BASIC_ACCESS"], isSystem: true }
    ];

    for (const role of defaults) {
        // Upsert to ensure we don't duplicate
        const existing = await prisma.sovereignRole.findFirst({
            where: { schoolId, name: role.name }
        });
        if (!existing) {
            await prisma.sovereignRole.create({
                data: {
                    schoolId,
                    name: role.name,
                    description: role.description,
                    permissions: role.permissions,
                    isSystem: role.isSystem
                }
            });
        }
    }
}
