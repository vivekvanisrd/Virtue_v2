"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";

export async function getAdmissionReferenceData() {
    try {
    const identity = await getSovereignIdentity();
    console.log("[DEBUG] getAdmissionReferenceData Identity:", {
        found: !!identity,
        staffId: identity?.staffId,
        schoolId: identity?.schoolId,
        role: identity?.role
    });
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        
        const branchCondition = (context.role === "OWNER" || context.role === "DEVELOPER") 
            ? { schoolId: context.schoolId } 
            : { schoolId: context.schoolId, id: context.branchId };

        const [branches, academicYears, classes, feeSchedules, school] = await Promise.all([
            prisma.branch.findMany({
                where: branchCondition,
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

        console.log("[DEBUG] Ref Data Success:", {
            branches: branches.length,
            academicYears: academicYears.length,
            classes: classes.length,
            feeSchedules: feeSchedules.length,
            schoolFound: !!school
        });

        console.log("[DEBUG] Ref Data Success:", {
            branches: branches.length,
            academicYears: academicYears.length,
            classes: classes.length,
            feeSchedules: feeSchedules.length,
            schoolFound: !!school
        });

        return {
            success: true,
            data: {
                branches,
                academicYears,
                classes,
                feeSchedules,
                schoolName: school?.name || "PaVa-EDUX Academy"
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
    const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        
        const branchCondition = (context.role === "OWNER" || context.role === "DEVELOPER") 
            ? { schoolId: context.schoolId } 
            : { schoolId: context.schoolId, id: context.branchId };

        const [branches, departments, designations] = await Promise.all([
            prisma.branch.findMany({
                where: branchCondition,
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

/**
 * getPublicPortalMetadata
 * 
 * Session-free fetch for public admission portal.
 * Validates branch and returns associated organizational info.
 */
export async function getPublicPortalMetadata(branchId: string) {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { 
                id: true, 
                name: true, 
                schoolId: true,
                school: { select: { name: true } } 
            }
        });

        if (!branch) {
            return { success: false, error: "Invalid branch code" };
        }

        const classes = await prisma.class.findMany({
            select: { id: true, name: true }
        });

        return {
            success: true,
            data: {
                branchName: branch.name,
                schoolName: branch.school.name,
                schoolId: branch.schoolId,
                classes
            }
        };

    } catch (e: any) {
        console.error("[PUBLIC-REF ERROR]", e);
        return { success: false, error: "System Unavailable" };
    }
}
