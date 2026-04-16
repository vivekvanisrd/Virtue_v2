"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { calculateTermBreakdown } from "../utils/fee-utils";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * serialize
 * 
 * Safely converts Prisma-specific types (like Decimal) into plain JSON-serializable numbers
 */
const serialize = <T>(data: T): T => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    (value instanceof Decimal || (value && typeof value === 'object' && value.constructor?.name === 'Decimal')) 
      ? Number(value) 
      : value
  ));
};

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
                   include: { masterComponent: true }
                }
            },
            orderBy: { academicYear: { name: 'desc' } }
        });

        return { success: true, data: serialize(structures) };
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
      const components = await prisma.feeComponentMaster.findMany({
          where: { schoolId: context.schoolId },
          orderBy: { name: "asc" }
      });
      return { success: true, data: serialize(components) };
  } catch (error: any) {
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
  isOneTime: boolean;
  isRefundable: boolean;
  accountCode?: string;
}) {
  try {
      const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
      const component = await prisma.feeComponentMaster.upsert({
          where: { 
            id: data.id || "new-component",
            schoolId: context.schoolId // TENANCY LOCK
          },
          update: {
              name: data.name,
              type: data.type,
              isOneTime: data.isOneTime,
              isRefundable: data.isRefundable,
              accountCode: data.accountCode
          },
          create: {
              schoolId: context.schoolId,
              name: data.name,
              type: data.type,
              isOneTime: data.isOneTime,
              isRefundable: data.isRefundable,
              accountCode: data.accountCode
          }
      });
      return { success: true, data: serialize(component) };
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
        return { success: true, data: serialize(structure) };
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
        return { success: true, data: serialize(component) };
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
      return { success: true, data: serialize(years) };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

/**
 * TENANCY SAFE: Fetches all available classes
 */
export async function getAvailableClasses() {
  try {
      const classes = await prisma.class.findMany({
          orderBy: { level: 'asc' }
      });
      return { success: true, data: serialize(classes) };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}
