"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "../utils/tenant-context";
import { CounterService } from "../services/counter-service";
import { staffOnboardingSchema } from "@/types/staff";

/**
 * Transactionally inserts a new Staff entity with all related HR profile information.
 */
export async function createStaffAction(formData: any) {
  try {
    const context = await getTenantContext();
    
    // 1. Validate data
    const validatedData = staffOnboardingSchema.parse(formData);
    const branchId = validatedData.branchId || context.branchId;
    
    if (!branchId) {
      throw new Error("Branch ID is required for staff allocation.");
    }

    // 2. Uniqueness Checks
    if (validatedData.email) {
      const existingEmail = await prisma.staff.findFirst({
        where: { schoolId: context.schoolId, email: validatedData.email }
      });
      if (existingEmail) return { success: false, error: "A staff member with this Email already exists." };
    }

    if (validatedData.phone) {
      const existingPhone = await prisma.staff.findFirst({
        where: { schoolId: context.schoolId, phone: validatedData.phone }
      });
      if (existingPhone) return { success: false, error: "A staff member with this Phone # already exists." };
    }

    // 3. ID Generation
    const school = await prisma.school.findUnique({ where: { id: context.schoolId }, select: { code: true } });
    if (!school) throw new Error("School not found");

    // Standardize Role Prefix
    const rolePrefix = validatedData.role.includes("Teacher") ? "TCHR" : "STAFF";
    
    const staffCode = await CounterService.generateStaffCode({
      schoolId: context.schoolId,
      schoolCode: school.code,
      role: rolePrefix
    });

    // 4. Transactional Write
    const result = await prisma.$transaction(async (tx: any) => {
      return await tx.staff.create({
        data: {
          staffCode,
          schoolId: context.schoolId,
          branchId: branchId,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          middleName: validatedData.middleName || null,
          email: validatedData.email || null,
          phone: validatedData.phone,
          dob: validatedData.dob ? new Date(validatedData.dob) : null,
          gender: validatedData.gender,
          role: validatedData.role.toUpperCase(),
          status: "Active",

          professional: {
            create: {
              designation: validatedData.designation,
              department: validatedData.department,
              qualification: validatedData.qualification,
              experienceYears: validatedData.experienceYears,
              dateOfJoining: new Date(validatedData.dateOfJoining),
              basicSalary: validatedData.basicSalary,
            }
          },

          ...(validatedData.panNumber || validatedData.pfNumber || validatedData.uanNumber || validatedData.esiNumber ? {
            statutory: {
              create: {
                panNumber: validatedData.panNumber || null,
                pfNumber: validatedData.pfNumber || null,
                uanNumber: validatedData.uanNumber || null,
                esiNumber: validatedData.esiNumber || null,
              }
            }
          } : {}),

          ...(validatedData.accountNumber && validatedData.ifscCode ? {
            bank: {
              create: {
                accountName: validatedData.accountName || `${validatedData.firstName} ${validatedData.lastName}`,
                accountNumber: validatedData.accountNumber,
                ifscCode: validatedData.ifscCode,
                bankName: validatedData.bankName || "Unknown Bank",
              }
            }
          } : {})
        }
      });
    }, { timeout: 15000 });

    try {
      revalidatePath("/admin/staff");
      revalidatePath("/dashboard");
    } catch {}

    return { success: true, data: JSON.parse(JSON.stringify(result)) };

  } catch (error: any) {
    console.error("Create Staff Error: ", error);
    return { success: false, error: error.message || "Failed to onboard staff member." };
  }
}

/**
 * Fetches the staff directory securely.
 */
export async function getStaffDirectoryAction(filters?: { search?: string, branchId?: string, department?: string }) {
  try {
    const context = await getTenantContext();

    const staff = await prisma.staff.findMany({
      where: {
        schoolId: context.schoolId,
        AND: [
          context.branchId ? { branchId: context.branchId } : {},
          filters?.branchId ? { branchId: filters.branchId } : {},
          filters?.search ? {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { staffCode: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ]
          } : {},
          filters?.department ? {
            professional: { department: filters.department }
          } : {}
        ]
      },
      include: {
        branch: { select: { name: true } },
        professional: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: JSON.parse(JSON.stringify(staff)) };
  } catch (error: any) {
    console.error("Staff Directory Fetch Error: ", error);
    return { success: false, error: "Failed to load staff directory." };
  }
}

/**
 * Fetches high-level HR and workforce metrics for the Staff Hub.
 */
export async function getStaffHubStats() {
  try {
    const context = await getTenantContext();
    
    const [totalStaff, activeStaff, supportStaff] = await Promise.all([
      prisma.staff.count({ where: { schoolId: context.schoolId } }),
      prisma.staff.count({ where: { schoolId: context.schoolId, status: "Active" } }),
      prisma.staff.count({ 
        where: { 
          schoolId: context.schoolId, 
          role: { in: ["SUPPORT", "DRIVERS", "SECURITY"] } 
        } 
      })
    ]);

    return {
      success: true,
      data: {
        totalStaff,
        activeStaff,
        supportStaff
      }
    };
  } catch (error) {
    return { success: false, error: "Failed to load staff metrics." };
  }
}

/**
 * Fetches high-level payroll and budget metrics for the Salary Hub.
 */
export async function getSalaryHubStats() {
  try {
    const context = await getTenantContext();
    
    const [professionals, staffCount] = await Promise.all([
      prisma.staffProfessional.findMany({
        where: { staff: { schoolId: context.schoolId } },
        select: { basicSalary: true }
      }),
      prisma.staff.count({ where: { schoolId: context.schoolId, status: "Active" } })
    ]);

    const totalBudget = professionals.reduce((sum: number, p: any) => sum + Number(p.basicSalary), 0);

    return {
      success: true,
      data: {
        totalBudget: totalBudget.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
        staffCount
      }
    };
  } catch (error) {
    return { success: false, error: "Failed to load salary metrics." };
  }
}

/**
 * Updates or Creates a staff member's professional/salary profile with flexible options.
 */
export async function updateStaffProfessionalAction(staffId: string, updates: any) {
  try {
    const context = await getTenantContext();
    
    // Perform UPSERT on the Professional relation
    const res = await prisma.staffProfessional.upsert({
      where: { staffId: staffId },
      update: { 
        basicSalary: updates.basicSalary,
        isPFEnabled: updates.isPFEnabled,
        isESIEnabled: updates.isESIEnabled,
        isDAEnabled: updates.isDAEnabled,
        daAmount: updates.daAmount,
        hraAmount: updates.hraAmount,
        specialAllowance: updates.specialAllowance,
        transportAllowance: updates.transportAllowance,
        isPTEnabled: updates.isPTEnabled,
        designation: updates.designation,
        department: updates.department
      },
      create: {
        staffId: staffId,
        basicSalary: updates.basicSalary || 0,
        isPFEnabled: updates.isPFEnabled || false,
        isESIEnabled: updates.isESIEnabled || false,
        isDAEnabled: updates.isDAEnabled || false,
        daAmount: updates.daAmount || 0,
        hraAmount: updates.hraAmount || 0,
        specialAllowance: updates.specialAllowance || 0,
        transportAllowance: updates.transportAllowance || 0,
        isPTEnabled: updates.isPTEnabled || false,
        designation: updates.designation || "UNASSIGNED",
        dateOfJoining: new Date()
      }
    });

    // Log the adjustment
    try {
      const { logActivity } = await import("../utils/audit-logger");
      await logActivity({
        schoolId: context.schoolId,
        userId: "ADMIN",
        entityType: "SALARY",
        entityId: staffId,
        action: "UPDATE",
        details: `Updated Professional/Payroll Profile: ${JSON.stringify(updates)}`
      });
    } catch (e) {}

    revalidatePath("/dashboard");
    return { success: true, data: JSON.parse(JSON.stringify(res)) };
  } catch (error: any) {
    console.error("Staff Professional Update Error:", error);
    return { success: false, error: "Failed to update professional records." };
  }
}

/**
 * Disburses a staff advance and records it in the loan registry.
 */
export async function disburseStaffAdvanceAction(staffId: string, amount: number, installment: number, reason?: string) {
  try {
    const context = await getTenantContext();
    
    const res = await prisma.staffAdvance.create({
      data: {
        staffId,
        amount,
        balance: amount,
        installment,
        reason,
        status: "Active"
      }
    });

    revalidatePath("/dashboard");
    return { success: true, data: JSON.parse(JSON.stringify(res)) };
  } catch (error: any) {
    console.error("Disburse Advance Error:", error);
    return { success: false, error: "Failed to disburse advance." };
  }
}
