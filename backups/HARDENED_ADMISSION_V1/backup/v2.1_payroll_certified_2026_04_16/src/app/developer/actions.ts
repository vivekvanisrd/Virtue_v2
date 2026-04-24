'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { provisionInstance } from '@/lib/actions/dev-actions';

/** 
 * 🧬 NATIVE SQL INSTITUTIONAL PROVISIONER
 * 🏁 Handles atomic creation of Schools and Branches directly in PostgreSQL.
 */
export async function provisionInstitutionalNodeAction(formData: any, isAddBranchMode: boolean) {
    try {
        if (isAddBranchMode) {
           // BRANCH_SPECIFIC_GENESIS Logic will be refactored in Phase 4
           return { success: false, error: "Multi-Branch Genesis is undergoing modernization. Please use the Root Setup Wizard." };
        }

        // Redirect to the High-Fidelity Genesis Engine
        return await provisionInstance({
            schoolName: formData.schoolName,
            schoolCode: formData.schoolCode,
            city: formData.city,
            adminName: formData.ownerName || formData.adminName,
            adminEmail: formData.ownerEmail || formData.adminEmail,
            adminPhone: formData.contactPhone || formData.adminPhone,
            dryRun: formData.dryRun
        });

    } catch (error: any) {
        console.error("Institutional Provisioning SQL Error:", error);
        return { success: false, error: error.message || "Failed to commit institutional node to SQL." };
    }
}

/** 
 * 🏛️ GET NATIVE REGISTRY - Fetch SQL Institution Tree
 */
export async function getRegistryAction() {
    try {
        const schools = await prisma.school.findMany({
            include: {
                branches: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Map fields for UI compatibility if necessary
        return (schools as any[]).map((school: any) => ({
            ...school,
            schoolName: school.name,
            schoolCode: school.code,
            branches: (school.branches as any[]).map((branch: any) => ({
                ...branch,
                isMainBranch: branch.code === 'MAIN' || branch.code.includes('MAIN') // Simple heuristic
            }))
        }));
    } catch (error) {
        console.error("Registry Fetch SQL Error:", error);
        return [];
    }
}

/** 
 * 🔍 CODE AVAILABILITY CHECKER
 */
export async function checkCodeAvailabilityAction(type: 'school' | 'branch', code: string, schoolId?: string) {
    try {
        if (type === 'school') {
            const count = await prisma.school.count({ where: { code: code.toUpperCase() } });
            return count === 0;
        } else {
            const count = await prisma.branch.count({ 
                where: { 
                    code: code.toUpperCase(),
                    schoolId: schoolId
                } 
            });
            return count === 0;
        }
    } catch (e) {
        return false;
    }
}
