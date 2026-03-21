"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ROLES, Role, canManageRole } from "@/lib/utils/rbac";
import { logActivity } from "@/lib/utils/audit-logger";

/**
 * Fetches all staff members for a specific school
 */
export async function getStaffMembers(schoolId: string) {
  try {
    const staff = await prisma.staff.findMany({
      where: { schoolId },
      include: {
        branch: {
          select: { name: true, code: true }
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
export async function updateStaffRole(actingUserRole: string, targetStaffId: string, newRole: Role) {
  try {
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

    // 3. Update the role in the database
    const updated = await prisma.staff.update({
      where: { id: targetStaffId },
      data: { role: newRole }
    });

    // 4. Record the activity
    await logActivity({
      schoolId: updated.schoolId,
      userId: actingUserRole, // Acting user proxy for now until Auth ID is passed
      entityType: "STAFF_ROLE",
      entityId: targetStaffId,
      action: "UPDATE",
      details: `Updated role of ${updated.firstName} ${updated.lastName} from ${targetStaff.role} to ${newRole}`
    });

    // 5. Revalidate cache if deployed
    revalidatePath("/dashboard");

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating role:", error);
    return { success: false, error: "System failed to update staff role" };
  }
}
