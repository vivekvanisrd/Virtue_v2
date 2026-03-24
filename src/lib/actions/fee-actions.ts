"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantContext } from "../utils/tenant-context";
import { calculateTermBreakdown } from "../utils/fee-utils";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Fetches all fee structures for the current school instance
 */
export async function getFeeStructures() {
    try {
        const context = await getTenantContext();
        const structures = await prisma.feeStructure.findMany({
            where: { schoolId: context.schoolId },
            include: {
                class: true,
                academicYear: true
            },
            orderBy: { academicYear: { name: 'desc' } }
        });

        return { success: true, data: structures };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches the global class list
 */
export async function getAvailableClasses() {
    try {
        const classes = await prisma.class.findMany({
            orderBy: { level: 'asc' }
        });
        return { success: true, data: classes };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Fetches academic years for the current school
 */
export async function getAcademicYears() {
    try {
        const context = await getTenantContext();
        const years = await prisma.academicYear.findMany({
            where: { schoolId: context.schoolId },
            orderBy: { startDate: 'desc' }
        });
        return { success: true, data: years };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * atomic upsert for FeeStructure
 */
export async function upsertFeeStructure(data: {
    id?: string;
    name: string;
    classId: string;
    academicYearId: string;
    totalAmount: number;
}) {
    try {
        const context = await getTenantContext();
        
        const structure = await prisma.feeStructure.upsert({
            where: { id: data.id || 'new-structure' },
            update: {
                name: data.name,
                classId: data.classId,
                totalAmount: data.totalAmount,
                academicYearId: data.academicYearId
            },
            create: {
                schoolId: context.schoolId,
                branchId: context.branchId,
                classId: data.classId,
                name: data.name,
                totalAmount: data.totalAmount,
                academicYearId: data.academicYearId
            }
        });

        revalidatePath("/admin/fees");
        return { success: true, data: structure };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * ATOMIC SYNC: Applies a fee structure to all students in a class
 * Updates individual FinancialRecords and calculates term splits.
 */
export async function applyFeeStructureToClass(structureId: string) {
    try {
        const context = await getTenantContext();
        
        const structure = await prisma.feeStructure.findUnique({
            where: { id: structureId },
            include: { class: true }
        });

        if (!structure || structure.schoolId !== context.schoolId) {
            throw new Error("Invalid or unauthorized fee structure.");
        }

        // Find all students in THIS BRANCH and THIS CLASS for the current school
        const students = await prisma.student.findMany({
            where: {
                schoolId: context.schoolId,
                academic: {
                    classId: structure.classId,
                    branchId: structure.branchId // STRICT BRANCH ISOLATION
                }
            },
            include: { financial: true }
        });

        const totalAmount = Number(structure.totalAmount);
        const { term1, term2, term3 } = calculateTermBreakdown(totalAmount, 0);

        const result = await prisma.$transaction(async (tx: any) => {
            const updates = [];
            
            for (const student of students) {
                if (student.financial) {
                    // Update existing financial record
                    updates.push(tx.financialRecord.update({
                        where: { id: student.financial.id },
                        data: {
                            annualTuition: totalAmount,
                            tuitionFee: totalAmount,
                            term1Amount: term1,
                            term2Amount: term2,
                            term3Amount: term3,
                            netTuition: totalAmount,
                            feeStructureId: structure.id
                        }
                    }));
                } else {
                    // Create new financial record
                    updates.push(tx.financialRecord.create({
                        data: {
                            studentId: student.id,
                            schoolId: context.schoolId,
                            annualTuition: totalAmount,
                            tuitionFee: totalAmount,
                            term1Amount: term1,
                            term2Amount: term2,
                            term3Amount: term3,
                            netTuition: totalAmount,
                            feeStructureId: structure.id
                        }
                    }));
                }
            }
            
            await Promise.all(updates);
            return updates.length;
        });

        revalidatePath("/admin/fees");
        return { 
            success: true, 
            message: `Successfully synchronized ${result} students to structure: ${structure.name}` 
        };

    } catch (error: any) {
        console.error("[FEE SYNC ERROR]", error);
        return { success: false, error: error.message };
    }
}
