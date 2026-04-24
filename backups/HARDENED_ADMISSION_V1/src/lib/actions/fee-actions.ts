"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { calculateTermBreakdown } from "../utils/fee-utils";
import { serializeDecimal } from "../utils/serialization";
import { randomUUID } from "crypto";


/**
 * TENANCY SAFE: Fetches all fee structures for the current school instance
 */
export async function getFeeStructures() {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        const structures = await prisma.feeStructure.findMany({
            where: { schoolId: context.schoolId },
            include: {
                class: true,
                academicYear: true,
                components: {
                   where: { schoolId: context.schoolId }, // TENANCY CHECK
                   include: { masterComponent: { select: { id: true, name: true, type: true, accountCode: true } } }
                }
            },
            orderBy: { academicYear: { name: 'desc' } }
        });

        return { success: true, data: serializeDecimal(structures) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Gets the global component master for the school
 */
export async function getFeeComponentMaster() {
  try {
      const identity = await getSovereignIdentity();
      if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
      const context = identity;

      // 🛡️ Sovereign Hub v2.5: Robust Select with Raw Fallback
      // This allows the registry to function even if the Prisma client is out of sync with the DB columns.
      let components;
      try {
          components = await prisma.feeComponentMaster.findMany({
              where: { 
                  schoolId: context.schoolId,
                  NOT: {
                    OR: [
                      { name: { contains: "Tuition", mode: "insensitive" } },
                      { type: "CORE" } // Usually Tuition is the only CORE fee in some schemas
                    ]
                  }
              },
              orderBy: { name: "asc" },
              select: {
                  id: true,
                  name: true,
                  type: true,
                  amount: true,
                  description: true,
                  isOneTime: true,
                  isRefundable: true,
                  accountCode: true,
                  isActive: true
              }
          });
      } catch (prismaError: any) {
          console.error("[REGISTRY FALLBACK] Schema drift detected, switching to Raw Pulse:", prismaError.message);
          components = await prisma.$queryRawUnsafe(`
            SELECT id, name, type, amount, description, "isOneTime", "isRefundable", "accountCode", "isActive"
            FROM "FeeComponentMaster"
            WHERE "schoolId" = $1
            ORDER BY name ASC
          `, context.schoolId);
      }

      return { success: true, data: serializeDecimal(components) };
  } catch (error: any) {
      console.error("[REGISTRY FATAL]", error);
      return { success: false, error: error.message };
  }
}

/**
 * TENANCY SAFE: Creates/Updates a fee component master
 */
export async function upsertFeeComponentMaster(data: {
  id?: string;
  name: string;
  type: "CORE" | "ANCILLARY" | "DEPOSIT" | "PENALTY";
  amount?: number;
  description?: string;
  isOneTime: boolean;
  isRefundable: boolean;
  accountCode?: string;
  isActive?: boolean;
}) {
  try {
      const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;

    const { isPrincipalOrHigher } = await import("@/lib/utils/rbac");
    if (!isPrincipalOrHigher(context.role)) throw new Error("UNAUTHORIZED: Principal access required for registry updates.");

    // 🛡️ HARDENED BLOCK: Prevent Tuition Fee from entering the Institutional Registry
    if (data.name.toLowerCase().includes("tuition")) {
        throw new Error("POLICY_VIOLATION: Tuition Fees must be managed via the 'Class Fee Structure' module to ensure grade-wise pricing accuracy. This registry is for ancillary fees only.");
    }

    // 🛡️ Sovereign Raw Persistence: Bypassing Prisma Client Sync Issues
    const targetId = data.id && data.id !== "new-component" ? data.id : randomUUID();
    
    try {
        const rawResult = await prisma.$queryRawUnsafe(`
            INSERT INTO "FeeComponentMaster" (
                id, "schoolId", "name", "type", "amount", "description", 
                "isOneTime", "isRefundable", "accountCode", "isActive", 
                "dnaVersion", "isGenesis"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'v1', false
            )
            ON CONFLICT (id) DO UPDATE SET
                "name" = EXCLUDED."name",
                "type" = EXCLUDED."type",
                "amount" = EXCLUDED."amount",
                "description" = EXCLUDED."description",
                "isOneTime" = EXCLUDED."isOneTime",
                "isRefundable" = EXCLUDED."isRefundable",
                "accountCode" = EXCLUDED."accountCode",
                "isActive" = EXCLUDED."isActive"
            RETURNING id, name, type, amount, description, "isOneTime", "isRefundable", "accountCode", "isActive", "schoolId"
        `, 
            targetId, 
            context.schoolId, 
            data.name, 
            data.type, 
            data.amount || 0, 
            data.description || "", 
            data.isOneTime, 
            data.isRefundable, 
            data.accountCode || "", 
            data.isActive ?? true
        );

        const component = (rawResult as any)[0];
        revalidatePath("/dashboard/finance/fees");
        return { success: true, data: serializeDecimal(component) };
    } catch (sqlError: any) {
        console.error("[UPSERT RAW FATAL]", sqlError);
        return { success: false, error: "Database Persistence Failed: " + sqlError.message };
    }
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

/**
 * deleteFeeComponentMasterAction
 * SAFE DELETE: Prevents deletion if the component is already linked to students or templates.
 */
export async function deleteFeeComponentMasterAction(id: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;

        // 🛡️ ROLE GATE: Principal or Owner only
        const { isPrincipalOrHigher } = await import("@/lib/utils/rbac");
        if (!isPrincipalOrHigher(context.role)) throw new Error("UNAUTHORIZED: Principal access required.");

        // Check for student assignments
        const usageCount = await prisma.studentFeeComponent.count({
            where: { componentId: id, schoolId: context.schoolId }
        });

        if (usageCount > 0) {
            throw new Error(`Component in use: ${usageCount} student records linked. Deletion blocked.`);
        }

        // Check for template assignments
        const templateUsage = await prisma.feeTemplateComponent.count({
            where: { componentId: id, schoolId: context.schoolId }
        });

        if (templateUsage > 0) {
            throw new Error(`Component in use: ${templateUsage} fee structures linked. Deletion blocked.`);
        }

        await prisma.feeComponentMaster.delete({
            where: { id, schoolId: context.schoolId }
        });

        revalidatePath("/dashboard/finance/fees");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * toggleFeeComponentStatusAction
 * Toggles isActive status of a fee component master (Show/Hide from Admission Form).
 */
export async function toggleFeeComponentStatusAction(id: string, newStatus: boolean) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;

        const { isPrincipalOrHigher } = await import("@/lib/utils/rbac");
        if (!isPrincipalOrHigher(context.role)) throw new Error("UNAUTHORIZED: Principal access required.");

        // Use raw SQL to bypass Prisma client sync issues
        await prisma.$executeRawUnsafe(
            `UPDATE "FeeComponentMaster" SET "isActive" = $1 WHERE id = $2 AND "schoolId" = $3`,
            newStatus,
            id,
            context.schoolId
        );

        revalidatePath("/dashboard/finance/fees");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Upsert for Template-based FeeStructure
 */
export async function upsertFeeStructure(data: {
    id?: string;
    name: string;
    classId: string;
    academicYearId: string;
    components: {
        componentId: string;
        amount: number;
        scheduleType: "ONE_TIME" | "MONTHLY" | "TERM";
    }[];
}) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        const totalAmount = data.components.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);

        const structure = await prisma.$transaction(async (tx: any) => {
            const header = await tx.feeStructure.upsert({
                where: { id: data.id || 'new-structure', schoolId: context.schoolId },
                update: {
                    name: data.name,
                    classId: data.classId,
                    academicYearId: data.academicYearId,
                    totalAmount: totalAmount
                },
                create: {
                    schoolId: context.schoolId,
                    branchId: context.branchId,
                    classId: data.classId,
                    name: data.name,
                    academicYearId: data.academicYearId,
                    totalAmount: totalAmount
                }
            });

            // 🏛️ TENANCY HARDENED: Junctions must also carry schoolId
            await tx.feeTemplateComponent.deleteMany({ 
                where: { templateId: header.id, schoolId: context.schoolId } 
            });

            await tx.feeTemplateComponent.createMany({
                data: data.components.map(c => ({
                    schoolId: context.schoolId, // TENANCY INJECTION
                    templateId: header.id,
                    componentId: c.componentId,
                    amount: c.amount,
                    scheduleType: c.scheduleType
                }))
            });

            return header;
        });

        revalidatePath("/admin/fees");
        return { success: true, data: serializeDecimal(structure) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Applies a fee structure to all students in a class
 */
export async function applyFeeStructureToClass(structureId: string) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        
        const structure = await prisma.feeStructure.findUnique({
            where: { id: structureId, schoolId: context.schoolId }, // TENANCY CHECK
            include: { class: true, components: true }
        });

        if (!structure) throw new Error("Unauthorized or invalid structure.");

        const students = await prisma.student.findMany({
            where: {
                schoolId: context.schoolId,
                academic: {
                    classId: structure.classId,
                    branchId: structure.branchId // Branch isolation
                }
            },
            include: { financial: true }
        });

        const totalAmount = Number(structure.totalAmount);

        const result = await prisma.$transaction(async (tx: any) => {
            let count = 0;
            for (const student of students) {
                const financial = await tx.financialRecord.upsert({
                    where: { studentId: student.id, schoolId: context.schoolId },
                    update: {
                        annualTuition: totalAmount,
                        feeStructureId: structure.id,
                        netTuition: totalAmount
                    },
                    create: {
                        studentId: student.id,
                        schoolId: context.schoolId,
                        annualTuition: totalAmount,
                        feeStructureId: structure.id,
                        netTuition: totalAmount
                    }
                });

                // 🏛️ TENANCY HARDENED: Student Ledger must carry schoolId
                await tx.studentFeeComponent.deleteMany({ 
                    where: { studentFinancialId: financial.id, schoolId: context.schoolId } 
                });

                await tx.studentFeeComponent.createMany({
                    data: structure.components.map((tc: any) => ({
                        schoolId: context.schoolId, // TENANCY INJECTION
                        studentFinancialId: financial.id,
                        componentId: tc.componentId,
                        baseAmount: tc.amount,
                        waiverAmount: 0,
                        discountAmount: 0,
                        isApplicable: true
                    }))
                });
                count++;
            }
            return count;
        });

        revalidatePath("/admin/fees");
        return { success: true, message: `Synchronized ${result} students with direct tenancy labeling.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Alignment for a single student
 */
export async function alignStudentToClassTemplate(studentId: string, templateId: string) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        
        const template = await prisma.feeStructure.findUnique({
            where: { id: templateId, schoolId: context.schoolId },
            include: { components: true }
        });

        if (!template) throw new Error("Template not found or unauthorized.");

        const financial = await prisma.$transaction(async (tx: any) => {
            const fin = await tx.financialRecord.upsert({
                where: { studentId, schoolId: context.schoolId },
                update: {
                    annualTuition: Number(template.totalAmount),
                    feeStructureId: template.id,
                    netTuition: Number(template.totalAmount)
                },
                create: {
                    studentId,
                    schoolId: context.schoolId,
                    annualTuition: Number(template.totalAmount),
                    feeStructureId: template.id,
                    netTuition: Number(template.totalAmount)
                }
            });

            await tx.studentFeeComponent.deleteMany({ 
                where: { studentFinancialId: fin.id, schoolId: context.schoolId } 
            });

            await tx.studentFeeComponent.createMany({
                data: template.components.map((tc: any) => ({
                    schoolId: context.schoolId,
                    studentFinancialId: fin.id,
                    componentId: tc.componentId,
                    baseAmount: tc.amount,
                    waiverAmount: 0,
                    discountAmount: 0,
                    isApplicable: true
                }))
            });

            return fin;
        });

        revalidatePath("/admin/fees");
        return { success: true, message: "Individual student ledger hard-locked to school tenancy." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Apply a Waiver/Discount to a specific component
 */
export async function applyComponentWaiver(data: {
    studentFinancialId: string;
    componentId: string;
    waiverAmount?: number;
    discountAmount?: number;
    reason: string;
}) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        
        if (!data.reason || data.reason.trim().length < 3) {
            throw new Error("A valid reason is mandatory for auditing waivers.");
        }

        const component = await prisma.studentFeeComponent.update({
            where: {
                id: data.componentId,
                schoolId: context.schoolId // TENANCY LOCK
            },
            data: {
                waiverAmount: data.waiverAmount || 0,
                discountAmount: data.discountAmount || 0,
                waiverReason: data.reason
            }
        });
        
        const allComponents = await prisma.studentFeeComponent.findMany({
            where: { studentFinancialId: data.studentFinancialId, schoolId: context.schoolId }
        });

        const newNetTotal = allComponents.reduce((sum: number, c: any) => 
            sum + (Number(c.baseAmount) - Number(c.waiverAmount) - Number(c.discountAmount)), 0);

        await prisma.financialRecord.update({
            where: { id: data.studentFinancialId, schoolId: context.schoolId },
            data: { netTuition: newNetTotal }
        });

        revalidatePath("/admin/fees");
        return { success: true, data: serializeDecimal(component) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Fetches all academic years for the current school
 */
export async function getAcademicYears() {
  try {
      const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
      const years = await prisma.academicYear.findMany({
          where: { schoolId: context.schoolId },
          orderBy: { startDate: 'desc' }
      });
      return { success: true, data: serializeDecimal(years) };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

/**
 * TENANCY SAFE: Fetches all available classes
 */
export async function getAvailableClasses() {
  try {
      const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
      const classes = await prisma.class.findMany({
          where: { 
            schoolId: context.schoolId,
            branchId: context.branchId 
          },
          orderBy: { level: 'asc' }
      });
      return { success: true, data: serializeDecimal(classes) };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

/**
 * TENANCY SAFE: Toggles the active/inactive status of a fee structure
 */
export async function toggleFeeStructureActiveAction(id: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;

        const structure = await prisma.feeStructure.findUnique({
            where: { id, schoolId: context.schoolId }
        });

        if (!structure) throw new Error("Structure not found.");

        const updated = await prisma.feeStructure.update({
            where: { id },
            data: { isActive: !structure.isActive }
        });

        revalidatePath("/admin/fees");
        return { success: true, isActive: updated.isActive };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * TENANCY SAFE: Deletes or archives a fee structure based on institutional history
 */
export async function deleteFeeStructureAction(id: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;

        // 1. Check for audit history (assigned students)
        const assignmentCount = await prisma.financialRecord.count({
            where: { feeStructureId: id, schoolId: context.schoolId }
        });

        if (assignmentCount > 0) {
            // Recommendation: Archive instead of Delete to protect audit trail
            await prisma.feeStructure.update({
                where: { id },
                data: { isActive: false }
            });
            return { 
                success: true, 
                message: `Structure has ${assignmentCount} history records. It has been ARCHIVED to protect the audit trail.` 
            };
        }

        // 2. Perform Hard Delete for sample/unused structures
        await prisma.$transaction(async (tx: any) => {
            await tx.feeTemplateComponent.deleteMany({ where: { templateId: id, schoolId: context.schoolId } });
            await tx.feeStructure.delete({ where: { id, schoolId: context.schoolId } });
        }, { timeout: 30000 });

        revalidatePath("/admin/fees");
        return { success: true, message: "Structure permanently removed from registry." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
