"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * 🏛️ PROVISIONING: Clones Platform Class Templates into School + Branch Scope
 * 
 * @param targetBranchId - The branch to provision classes for.
 *   REQUIRED: Classes are branch-scoped. Do not call without a valid branchId.
 */
export async function provisionInstitutionalTemplatesAction(targetBranchId?: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        
        const schoolId = identity.schoolId;
        
        // Resolve branchId: param > session > error
        const branchId = targetBranchId || identity.branchId;
        if (!branchId || branchId.trim() === "") {
            return { 
                success: false, 
                error: "BRANCH_REQUIRED: Please select a branch before provisioning class templates. Classes must belong to a specific campus branch." 
            };
        }

        // 1. Fetch Platform Masters
        const [pClasses, pSections] = await Promise.all([
            prisma.platformClass.findMany({ include: { sections: true } }),
            prisma.platformSection.findMany()
        ]);

        if (pClasses.length === 0) {
            return { success: false, error: "Platform Templates are currently empty. Contact System Administrator." };
        }

        // 2. Atomic Cloning
        const result = await prisma.$transaction(async (tx) => {
            let clonedCount = 0;

            for (const pc of pClasses) {
                // Check if already exists in this school + branch
                const exists = await tx.class.findFirst({
                    where: { 
                        schoolId,
                        branchId,
                        name: pc.name
                    }
                });

                if (!exists) {
                    const newClass = await tx.class.create({
                        data: {
                            id: `CLS-${schoolId}-${branchId}-${pc.name.replace(/\s+/g, '-')}`,
                            name: pc.name,
                            level: pc.level,
                            schoolId,
                            branchId,   // ✅ branch-scoped
                        }
                    });

                    // Clone Sections
                    if (pc.sections && pc.sections.length > 0) {
                        for (const ps of pc.sections) {
                            await tx.section.create({
                                data: {
                                    id: `SEC-${schoolId}-${branchId}-${pc.name}-${ps.name}`,
                                    name: ps.name,
                                    classId: newClass.id,
                                    schoolId,
                                    branchId,  // ✅ branch-scoped
                                }
                            });
                        }
                    }
                    clonedCount++;
                }
            }

            return clonedCount;
        });

        revalidatePath("/dashboard/setup");
        return { success: true, count: result };

    } catch (e: any) {
        console.error("❌ [PROVISIONING_ERROR]", e.message);
        return { success: false, error: "Failed to clone platform templates. " + e.message };
    }
}


/**
 * 📅 PROVISIONING: Clones Platform Year Templates
 */
export async function provisionYearTemplateAction(templateId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        
        const schoolId = identity.schoolId;

        const template = await prisma.platformAcademicYear.findUnique({
             where: { id: templateId }
        });

        if (!template) throw new Error("Template not found.");

        const currentYear = new Date().getFullYear();
        const startYear = template.startMonth > template.endMonth ? currentYear : currentYear; 
        const endYear = template.startMonth > template.endMonth ? currentYear + 1 : currentYear;

        const yearName = `${startYear}-${endYear.toString().slice(-2)}`;

        const created = await prisma.academicYear.create({
            data: {
                id: `AY-${schoolId}-${yearName}`,
                name: yearName,
                startDate: new Date(startYear, template.startMonth - 1, 1),
                endDate: new Date(endYear, template.endMonth, 0), // Last day of endMonth
                schoolId,
                isCurrent: true
            }
        });

        revalidatePath("/dashboard/setup");
        return { success: true, data: created };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
