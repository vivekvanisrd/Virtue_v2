"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "../auth/backbone";
import { serializeDecimal } from "@/lib/utils/serialization";
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

        return { success: true, data: serializeDecimal(types) };
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

        let type;
        if (data.id) {
            type = await prisma.discountType.update({
                where: { id: data.id, schoolId: context.schoolId },
                data: {
                    name: data.name,
                    description: data.description,
                    percentage: data.percentage,
                    amount: data.amount
                }
            });
        } else {
            type = await prisma.discountType.create({
                data: {
                    schoolId: context.schoolId,
                    name: data.name,
                    description: data.description,
                    percentage: data.percentage,
                    amount: data.amount,
                    isActive: true
                }
            });
        }

        revalidatePath("/admin/discounts");
        return { success: true, data: serializeDecimal(type) };
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

/**
 * getPendingDiscountsAction
 * Privileged dashboard view for Principal/Owner to fetch all pending discount requests.
 */
export async function getPendingDiscountsAction() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Operation restricted to verified personnel.");
        const context = identity;
        ensureManagementAccess(context.role);

        const pending = await prisma.discount.findMany({
            where: { schoolId: context.schoolId, status: "Pending" },
            include: {
                discountType: true,
                financialRecord: {
                    include: {
                        student: true
                    }
                }
            },
            orderBy: { id: 'desc' }
        });

        return { success: true, data: serializeDecimal(JSON.parse(JSON.stringify(pending))) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * approveDiscountAction
 * Principal/Owner action to approve a pending discount proposal, sync balances, and write ledger/journals.
 */
export async function approveDiscountAction(discountId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;
        ensureManagementAccess(context.role);

        const discount = await prisma.discount.findFirst({
            where: { id: discountId, schoolId: context.schoolId, status: "Pending" },
            include: {
                discountType: true,
                financialRecord: {
                    include: {
                        student: true
                    }
                }
            }
        });

        if (!discount) throw new Error("CRITICAL_ERROR: Pending discount request not found.");

        const discountAmount = Number(discount.amount);
        const studentId = discount.financialRecord.studentId;

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Find tuition component — discount is ONLY allowed on tuition fee
            const allComponents = await tx.studentFeeComponent.findMany({
                where: { studentFinancialId: discount.studentFinancialId },
                include: { masterComponent: { select: { name: true, type: true } } }
            });
            const tuitionComp = allComponents.find((c: any) =>
                c.masterComponent.type === "CORE" ||
                c.masterComponent.name.toLowerCase().includes("tuition")
            );
            if (!tuitionComp) throw new Error("RULE_VIOLATION: Discount can only be applied when a Tuition Fee component exists.");

            const tuitionBase = Number(tuitionComp.baseAmount || 0);

            // 2. Validate: total discounts (existing + new) cannot exceed tuition base
            const existingDiscount = Number(tuitionComp.discountAmount || 0);
            if (existingDiscount + discountAmount > tuitionBase) {
                throw new Error(
                    `RULE_VIOLATION: Total discount would exceed tuition base. Maximum additional discount allowed: ₹${(tuitionBase - existingDiscount).toLocaleString()}.`
                );
            }

            // 3. Update Discount record
            const approvedDiscount = await tx.discount.update({
                where: { id: discountId },
                data: {
                    status: "Approved",
                    authorizerId: context.staffId || null
                }
            });

            // 4. Update Financial Record
            const updatedFinancial = await tx.financialRecord.update({
                where: { id: discount.studentFinancialId },
                data: {
                    totalDiscount: { increment: discountAmount }
                }
            });

            // 5. Sync discount to tuition StudentFeeComponent
            await tx.studentFeeComponent.update({
                where: { id: tuitionComp.id },
                data: { discountAmount: { increment: discountAmount } }
            });

            // 6. Post to Ledger
            const [activeFY, activeAY] = await Promise.all([
                tx.financialYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } }),
                tx.academicYear.findFirst({ where: { schoolId: context.schoolId, isCurrent: true } })
            ]);

            await tx.ledgerEntry.create({
                data: {
                    studentId,
                    schoolId: context.schoolId,
                    branchId: discount.branchId || context.branchId,
                    financialYearId: activeFY?.id,
                    academicYearId: activeAY?.id,
                    type: "DISCOUNT",
                    amount: discountAmount,
                    reason: `Approved Policy: ${discount.discountType.name}. Reason: ${discount.reason || "Approved"}`,
                    createdBy: context.name || context.role
                }
            });

            // 7. Double-Entry Journal for Discount
            const discountAccount = await tx.chartOfAccount.findFirst({ 
                where: { 
                    schoolId: context.schoolId, 
                    OR: [
                        { accountCode: "4400" },
                        { accountName: { contains: "Discount", mode: "insensitive" } },
                        { accountName: { contains: "Scholarship", mode: "insensitive" } }
                    ] 
                } 
            }) || await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "4100" } });
            const receivableAccount = await tx.chartOfAccount.findFirst({ where: { schoolId: context.schoolId, accountCode: "1200" } });

            if (discountAccount && receivableAccount && activeFY) {
                await tx.journalEntry.create({
                    data: {
                        schoolId: context.schoolId,
                        branchId: discount.branchId || context.branchId,
                        financialYearId: activeFY.id,
                        entryType: "ADMISSION_DISCOUNT",
                        totalDebit: discountAmount,
                        totalCredit: discountAmount,
                        description: `Discount Approved: ${discount.discountType.name} for Student ${studentId}`,
                        lines: {
                            create: [
                                { accountId: discountAccount.id, debit: discountAmount, credit: 0, description: "Discount/Scholarship Expense" },
                                { accountId: receivableAccount.id, debit: 0, credit: discountAmount, description: "Receivable Offset" }
                            ]
                        }
                    }
                });
            }

            return approvedDiscount;
        }, { maxWait: 5000, timeout: 15000 });

        revalidatePath("/dashboard/finance");
        revalidatePath("/dashboard/approvals");
        return { success: true, data: serializeDecimal(JSON.parse(JSON.stringify(result))) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * rejectDiscountAction
 * Principal/Owner action to reject a pending discount proposal.
 */
export async function rejectDiscountAction(discountId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");
        const context = identity;
        ensureManagementAccess(context.role);

        const discount = await prisma.discount.update({
            where: { id: discountId, schoolId: context.schoolId, status: "Pending" },
            data: {
                status: "Rejected",
                authorizerId: context.staffId || null
            }
        });

        revalidatePath("/dashboard/finance");
        revalidatePath("/dashboard/approvals");
        return { success: true, data: serializeDecimal(JSON.parse(JSON.stringify(discount))) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
