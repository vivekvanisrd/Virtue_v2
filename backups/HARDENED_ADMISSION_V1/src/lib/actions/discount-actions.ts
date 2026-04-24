"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { revalidatePath } from "next/cache";

/**
 * RBAC Helper: Restricts access to Owner, Correspondent, and Principal
 */
const ensureManagementAccess = (role: string) => {
    const allowed = ["OWNER", "CORRESPONDENT", "PRINCIPAL", "DEVELOPER"];
    if (!allowed.includes(role)) {
        throw new Error("Access Denied: This module is reserved for Senior Management only.");
    }
};

/**
 * getDiscountTypes
 * Consolidated view of all discount types within the school group.
 */
export async function getDiscountTypes() {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        ensureManagementAccess(context.role);

        const types = await prisma.discountType.findMany({
            where: { schoolId: context.schoolId },
            orderBy: { name: 'asc' }
        });

        return { success: true, data: types };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * upsertDiscountType
 * Management tool to Add or Update discount categories.
 */
export async function upsertDiscountType(data: {
    id?: string;
    name: string;
    description?: string;
    percentage?: number;
    amount?: number;
}) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        ensureManagementAccess(context.role);

        // VALIDATION: Non-Negative Integrity
        if ((data.amount && data.amount < 0) || (data.percentage && data.percentage < 0)) {
            throw new Error("Validation Failed: Discount values cannot be negative.");
        }

        const type = await prisma.discountType.upsert({
            where: { id: data.id || 'new-type' },
            create: {
                schoolId: context.schoolId,
                name: data.name,
                description: data.description,
                percentage: data.percentage,
                amount: data.amount,
                isActive: true
            },
            update: {
                name: data.name,
                description: data.description,
                percentage: data.percentage,
                amount: data.amount
            }
        });

        revalidatePath("/admin/discounts");
        return { success: true, data: type };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * toggleDiscountStatus
 * Ability to Activate/Inactivate discount types (Rule: Never Delete History)
 */
export async function toggleDiscountStatus(id: string, isActive: boolean) {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        ensureManagementAccess(context.role);

        await prisma.discountType.update({
            where: { id, schoolId: context.schoolId },
            data: { isActive }
        });

        revalidatePath("/admin/discounts");
        return { success: true, message: `Discount type ${isActive ? 'activated' : 'inactivated'} successfully.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * getDiscountAnalyticsVault
 * Privileged dashboard view for Owners/Correspondents to track "The Revenue Gap".
 */
export async function getDiscountAnalyticsVault() {
    try {
        const identity = await getSovereignIdentity();
    if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
    const context = identity;
        ensureManagementAccess(context.role);

        // Aggregate All Discounts across the school (Multi-Branch Aggregation)
        const discounts = await prisma.discount.findMany({
            where: { schoolId: context.schoolId, status: "Approved" },
            include: { 
                discountType: true,
                authorizer: { select: { firstName: true, lastName: true, role: true } },
                financialRecord: { include: { student: { include: { academic: { include: { branch: true } } } } } }
            }
        });

        // Calculate Category Breakdown
        const breakdown = discounts.reduce((acc: Record<string, number>, d: any) => {
            const cat = d.discountType.name;
            acc[cat] = (acc[cat] || 0) + Number(d.amount);
            return acc;
        }, {});

        // Authorizer Audit
        const authorizerStats = discounts.reduce((acc: Record<string, number>, d: any) => {
            const name = d.authorizer ? `${d.authorizer.firstName} (${d.authorizer.role})` : "System/Legacy";
            acc[name] = (acc[name] || 0) + Number(d.amount);
            return acc;
        }, {});

        // Branch-wise Impact
        const branchImpact = discounts.reduce((acc: Record<string, number>, d: any) => {
            const branchName = d.financialRecord.student.academic?.[0]?.branch?.name || "Main/Unknown";
            acc[branchName] = (acc[branchName] || 0) + Number(d.amount);
            return acc;
        }, {});

        return { 
            success: true, 
            data: {
                totalDiscountValue: discounts.reduce((sum: number, d: any) => sum + Number(d.amount), 0),
                totalStudentsImpacted: new Set(discounts.map((d: any) => d.studentFinancialId)).size,
                breakdown,
                authorizerStats,
                branchImpact
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
