"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { ROLES, Role, canManageRole } from "@/lib/utils/rbac";
import { logActivity } from "@/lib/utils/audit-logger";

/**
 * Fetches all staff members for a specific school
 */
export async function getStaffMembers(targetSchoolId: string) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity || (identity.schoolId !== targetSchoolId && !identity.isGlobalDev)) {
      throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    }
    
    const staff = await prisma.staff.findMany({
      where: { schoolId: targetSchoolId },
      include: {
        branch: {
          select: { name: true, code: true }
        },
        sovereignRole: {
          select: { name: true, permissions: true }
        }
      },
      orderBy: { firstName: 'asc' }
    });
    
    return { success: true, data: staff };
  } catch (error: any) {
    console.error("Error fetching staff:", error);
    return { success: false, error: "Failed to fetch staff directory" };
  }
}

/**
 * Updates a staff member's role safely.
 * @param actingUserRole - The role of the user performing the action (passed from UI/Session)
 * @param targetStaffId - The ID of the staff member to update
 * @param newRole - The role to assign to them
 */
export async function updateStaffRole(targetStaffId: string, newRole: Role) {
  try {
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Your session has expired.");
    const actingUserRole = identity.role;
    
    // 1. Fetch the target staff member
    const targetStaff = await prisma.staff.findUnique({
      where: { id: targetStaffId }
    });

    if (!targetStaff) {
      return { success: false, error: "Staff member not found" };
    }

    // 2. Validate hierarchy using RBAC utils
    // The acting user must have permission to manage the target's current role AND
    // the acting user must have permission to grant the new role.
    const canManageCurrent = canManageRole(actingUserRole, targetStaff.role);
    const canAssignNew = canManageRole(actingUserRole, newRole);

    if (!canManageCurrent || !canAssignNew) {
      return { 
        success: false, 
        error: "Permission Denied: You do not have sufficient privileges to assign or modify this role." 
      };
    }

    // 3. Handle Static vs Custom Role Update
    const isStatic = Object.values(ROLES).includes(newRole as any);
    
    let dbUpdateData: any = { role: newRole };
    
    if (!isStatic) {
      // Find the custom role by name
      const customRole = await prisma.sovereignRole.findFirst({
        where: { schoolId: targetStaff.schoolId, name: newRole }
      });
      if (!customRole) return { success: false, error: "Role definition not found." };
      
      dbUpdateData.role = customRole.name;
      dbUpdateData.sovereignRoleId = customRole.id;
    } else {
      dbUpdateData.role = newRole;
      dbUpdateData.sovereignRoleId = null;
    }

    const updated = await prisma.staff.update({
      where: { id: targetStaffId },
      data: dbUpdateData
    });

    // 4. Record the activity
    await logActivity({
      schoolId: updated.schoolId,
      branchId: updated.branchId,
      userId: identity.staffId,
      entityType: "STAFF_ROLE",
      entityId: targetStaffId,
      action: "UPDATE",
      details: `Updated role of ${updated.firstName} ${updated.lastName} from ${targetStaff.role} to ${newRole}`
    });

    // 5. Revalidate cache if deployed
    revalidatePath("/", "layout");

    return { success: true, data: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    console.error("Error updating role:", error);
    return { success: false, error: "System failed to update staff role" };
  }
}
