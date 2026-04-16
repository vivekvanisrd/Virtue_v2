"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";
import { SCHOOL_ID_DEPENDENTS, BRANCH_ID_DEPENDENTS } from "../utils/crisis-utils";

/**
 * Ensures Only Developer can run these actions
 */
async function ensureCrisisClearance() {
    const identity = await getSovereignIdentity();
    if (!identity || identity.role !== "DEVELOPER") {
        throw new Error("CRITICAL ACCESS DENIED: This operation requires HIGH-CLEARANCE DEVELOPER certification.");
    }
    return identity;
}

/**
 * CRISIS: Remaps a School ID across all dependent Registry models.
 * This is an atomic operation that performs a manual cascade update.
 */
export async function remapSchoolIdAction(oldId: string, newId: string) {
    try {
        await ensureCrisisClearance();

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Verify existence
            const school = await tx.school.findUnique({ where: { id: oldId } });
            if (!school) throw new Error("Source School Identity not found in registry.");

            // 2. Cascade SchoolId across all dependents
            for (const dep of SCHOOL_ID_DEPENDENTS) {
                await tx[dep.model].updateMany({
                   where: { [dep.column]: oldId },
                   data: { [dep.column]: newId }
                });
            }

            // 3. Final: Update School PK (Requires manual update in Prisma as PK is immutable directly)
            // Note: Since id is PK, we must create a new record and delete the old one or use raw SQL.
            // Raw SQL is safer for PK remapping in Postgres.
            await tx.$executeRawUnsafe(`UPDATE "School" SET "id" = '${newId}' WHERE "id" = '${oldId}'`);

            return true;
        });

        revalidatePath("/developer");
        return { success: true, message: `REMAP SUCCESS: ${oldId} >> ${newId}. DistributedRegistry synchronized.` };
    } catch (error: any) {
        console.error("[CRISIS ERROR]", error);
        return { success: false, error: error.message };
    }
}

/**
 * CRISIS: Remaps a Branch ID across all dependent models.
 */
export async function remapBranchIdAction(oldId: string, newId: string) {
    try {
        await ensureCrisisClearance();

        await prisma.$transaction(async (tx: any) => {
            // Cascade branchId
            for (const dep of BRANCH_ID_DEPENDENTS) {
                await tx[dep.model].updateMany({
                   where: { [dep.column]: oldId },
                   data: { [dep.column]: newId }
                });
            }

            // Update Branch PK using raw SQL for guaranteed isolation
            await tx.$executeRawUnsafe(`UPDATE "Branch" SET "id" = '${newId}' WHERE "id" = '${oldId}'`);
        });

        revalidatePath("/developer");
        return { success: true, message: `BRANCH REMAP SUCCESS: ${oldId} >> ${newId}.` };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * CRISIS: Force-Alignment of Sequence Counters
 */
export async function forceResetCounterAction(data: {
    schoolId: string;
    branchId: string;
    type: string;
    year: string;
    newValue: number;
}) {
    try {
        await ensureCrisisClearance();

        await prisma.tenancyCounter.update({
            where: {
                schoolId_branchId_type_year: {
                    schoolId: data.schoolId,
                    branchId: data.branchId,
                    type: data.type.toUpperCase(),
                    year: data.year
                }
            },
            data: { lastValue: data.newValue }
        });

        return { success: true, message: "Counter Force-Aligned successfully." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
