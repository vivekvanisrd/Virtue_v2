"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { IdGenerator } from "@/lib/id-generator";
import { revalidatePath } from "next/cache";

/**
 * 🏛️ BRANCH ACTION: Create a new operational campus
 * Enforces Rule 2.1 (Golden DNA) and Rule 16 (Accounting Isolation)
 */
export async function createBranchAction(data: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || identity.role !== "OWNER") {
            throw new Error("ACCESS_DENIED: Only the Institutional Owner can authorize new campus creation.");
        }

        const schoolId = identity.schoolId;
        const schoolCode = identity.schoolId; // Symmetric in current design

        // 1. Generate Deterministic ID (Rule 2.1)
        const branchId = await IdGenerator.generateBranchId({
            schoolId,
            schoolCode,
            branchCode: data.code
        });

        // 2. Atomic Transaction (Rule 6: Controlled Workflow)
        const result = await prisma.$transaction(async (tx) => {
            // A. Create Branch
            const branch = await tx.branch.create({
                data: {
                    id: branchId,
                    schoolId,
                    name: data.name,
                    code: data.code.toUpperCase(),
                    address: data.address,
                    phone: data.phone,
                    isGenesis: true,
                    dnaVersion: "v1",
                    mode: "MANUAL_PROVISIONING",
                    triggeredBy: identity.staffId,
                    metadata: {
                        created_at: new Date().toISOString(),
                        origin: "InstitutionalSetupHub"
                    }
                }
            });

            // B. Initialize Chart of Accounts (Rule 16: Independence)
            // Every branch needs its own basic ledger nodes to start operations.
            const initialAccounts = [
                { code: "1001", name: "Main Cash Account", type: "ASSET" },
                { code: "1002", name: "Campus Bank Account", type: "ASSET" },
                { code: "4001", name: "Tuition Fee Income", type: "INCOME" },
                { code: "4002", name: "Admission Fee Income", type: "INCOME" },
                { code: "5001", name: "Operating Expenses", type: "EXPENSE" },
            ];

            for (const acc of initialAccounts) {
                await tx.chartOfAccount.create({
                    data: {
                        schoolId,
                        branchId: branch.id,
                        accountCode: `${branch.id}-${acc.code}`,
                        accountName: acc.name,
                        accountType: acc.type,
                        currentBalance: 0
                    }
                });
            }

            // C. Audit Trail (Rule 9)
            await tx.activityLog.create({
                data: {
                    schoolId,
                    branchId: branch.id,
                    action: "BRANCH_CREATED",
                    entityType: "Branch",
                    entityId: branch.id,
                    details: `Created new campus branch: ${data.name}`,
                    payload: { name: data.name, code: data.code, category: "GOVERNANCE", mode: "MANUAL_PROVISIONING" },
                    userId: identity.staffId
                }
            });

            return branch;
        }, {
            timeout: 20000 // Extended timeout to allow heavy RLS and provisioning
        });

        revalidatePath("/", "layout");
        return { success: true, data: result };

    } catch (e: any) {
        console.error("❌ [BRANCH_ACTION_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}
