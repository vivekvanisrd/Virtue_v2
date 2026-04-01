"use server";

import prisma from "@/lib/prisma";
import { getTenantContext } from "../utils/tenant-context";

export async function getAdmissionReferenceData() {
    try {
        const context = await getTenantContext();
        
        const [branches, academicYears, classes, feeSchedules, school] = await Promise.all([
            prisma.branch.findMany({
                where: { schoolId: context.schoolId },
                select: { id: true, name: true }
            }),
            prisma.academicYear.findMany({
                where: { schoolId: context.schoolId },
                orderBy: { startDate: 'desc' },
                select: { id: true, name: true, isCurrent: true }
            }),
            prisma.class.findMany({
                select: { id: true, name: true }
            }),
            prisma.feeStructure.findMany({
                where: { schoolId: context.schoolId },
                select: { id: true, name: true }
            }),
            prisma.school.findUnique({
                where: { id: context.schoolId },
                select: { name: true }
            })
        ]);

        return {
            success: true,
            data: {
                branches,
                academicYears,
                classes,
                feeSchedules,
                schoolName: school?.name || "Virtue School"
            }
        };
    } catch (e: any) {
        console.error("[REF-DATA ERROR]", e);
        return { success: false, error: e.message };
    }
}

export async function getSectionsByClass(classId: string) {
    try {
        const sections = await prisma.section.findMany({
            where: { classId },
            select: { id: true, name: true }
        });
        return { success: true, data: sections };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Fetches common organizational data for staff management
 */
export async function getStaffReferenceData() {
    try {
        const context = await getTenantContext();
        
        const [branches, departments, designations] = await Promise.all([
            prisma.branch.findMany({
                where: { schoolId: context.schoolId },
                select: { id: true, name: true }
            }),
            prisma.staffProfessional.findMany({
                where: { staff: { schoolId: context.schoolId } },
                distinct: ['department'],
                select: { department: true }
            }),
            prisma.staffProfessional.findMany({
                where: { staff: { schoolId: context.schoolId } },
                distinct: ['designation'],
                select: { designation: true }
            })
        ]);

        return {
            success: true,
            data: {
                branches,
                departments: departments.map((d: any) => d.department).filter(Boolean),
                designations: designations.map((d: any) => d.designation).filter(Boolean)
            }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
