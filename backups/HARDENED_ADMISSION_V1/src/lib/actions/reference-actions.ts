"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { serializeDecimal } from "../utils/serialization";

export async function getAdmissionReferenceData() {
    try {
    const identity = await getSovereignIdentity();
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
                where: { schoolId: context.schoolId },
                select: { id: true, name: true }
            }),
            prisma.feeStructure.findMany({
                where: { schoolId: context.schoolId, isActive: true },
                select: { 
                    id: true, 
                    name: true, 
                    classId: true, 
                    totalAmount: true,
                    components: {
                        select: {
                            amount: true,
                            masterComponent: {
                                select: {
                                    name: true,
                                    type: true
                                }
                            }
                        }
                    }
                }
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

        // 🛡️ Raw SQL Fallback: Fetch feeMasters directly to bypass Prisma client schema drift
        // This ensures that isActive, amount, description etc. are always returned correctly
        let feeMasters: any[] = [];
        try {
            feeMasters = await prisma.$queryRawUnsafe(`
                SELECT id, name, type, amount, description, "isOneTime", "isRefundable", "accountCode", "isActive"
                FROM "FeeComponentMaster"
                WHERE "schoolId" = $1
                ORDER BY name ASC
            `, context.schoolId);
        } catch (e) {
            console.warn("[REF-DATA] feeMasters raw query failed, using empty array:", e);
        }

        return {
            success: true,
            data: serializeDecimal({
                branches,
                academicYears,
                classes,
                feeSchedules,
                feeMasters,
                schoolName: school?.name || "PaVa-EDUX Academy"
            })
        };
    } catch (e: any) {
        console.error("[REF-DATA ERROR]", e);
        return { success: false, error: e.message };
    }
}

export async function getSectionsByClass(classId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;

        const sections = await prisma.section.findMany({
            where: { 
                classId,
                schoolId: context.schoolId,
                ...(context.branchId ? { branchId: context.branchId } : {})
            },
            orderBy: { name: 'asc' }, // Ensure Section A is always [0]
            select: { id: true, name: true }
        });

        // 💎 Sovereign De-duplication: Ensure no phantom duplicates leak to the UI
        const uniqueSections = Array.from(new Map(sections.map(s => [s.name, s])).values());
        
        return { success: true, data: uniqueSections };
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
