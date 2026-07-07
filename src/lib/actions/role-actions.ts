"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
// Define Role locally for types if needed, or import from types. For now we use string
type Role = string;
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
    const targetStaff = await prisma.staff.findFirst({
      where: { id: targetStaffId }
    });

    if (!targetStaff) {
      return { success: false, error: "Staff member not found" };
    }

    // 🛡️ BRANCH GUARD: PRINCIPAL can only manage staff within their own branch
    if (identity.role === 'PRINCIPAL' && targetStaff.branchId !== identity.branchId) {
      return {
        success: false,
        error: `SECURITY_VIOLATION: As a Principal, you can only manage staff within your own branch (${identity.branchId}). The target staff belongs to branch ${targetStaff.branchId}.`
      };
    }

    const { checkCapability } = await import("@/lib/auth/rbac");
    await checkCapability('STAFF_MANAGE');
    
    // 🛡️ PREVENT DOWNGRADE OF OWNERS: Only another OWNER/DEVELOPER can modify an OWNER
    if (targetStaff.role === 'OWNER' && identity.role !== 'OWNER' && identity.role !== 'DEVELOPER') {
      return { 
        success: false, 
        error: "Permission Denied: Only a System Owner can modify another Owner's role." 
      };
    }

    // 3. Resolve the new role — prefer branch-scoped first, then school-wide
    //    This ensures branch-specific custom roles take precedence over school defaults
    let dbUpdateData: any = { role: newRole };

    // Try branch-scoped role first (role created specifically for target staff's branch)
    let customRole = await prisma.sovereignRole.findFirst({
      where: { schoolId: targetStaff.schoolId, name: newRole, branchId: targetStaff.branchId }
    });

    // Fallback: school-wide role
    if (!customRole) {
      customRole = await prisma.sovereignRole.findFirst({
        where: { schoolId: targetStaff.schoolId, name: newRole, branchId: null }
      });
    }

    if (!customRole) {
      return { success: false, error: `Role '${newRole}' not found for this school. Please create the role first.` };
    }

    dbUpdateData.role = customRole.name;
    dbUpdateData.sovereignRoleId = customRole.id;

    const updated = await prisma.staff.update({
      where: { id: targetStaffId, schoolId: identity.schoolId },
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
