"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import prisma from "@/lib/prisma";

/**
 * 🏛️ TENANCY ACTION: Sets the active branch context
 * Hardened with institutional validation to prevent "Campus Jumping"
 */
export async function setActiveBranchAction(branchId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED: Your session has expired.");
        const user = identity;
        
        const cookieStore = await cookies();

        // 🛡️ LOCK: Institutional Validation (V7 Fortress)
        if (branchId !== "GLOBAL") {
            const branch = await prisma.branch.findFirst({
                where: { 
                    id: branchId,
                    schoolId: user.schoolId // 🔒 Strictly jail within the user's institution
                }
            });

            if (!branch) {
                console.error(`SECURITY_VIOLATION: User ${user.email} attempted to switch to unauthorized branch ${branchId}`);
                throw new Error("ACCESS_DENIED: You do not have permission to access this campus.");
            }
        } else {
            // 🛡️ LOCK: Global access is restricted to Owners and Admins
            if (user.role === 'STAFF') {
                throw new Error("ACCESS_DENIED: Staff members must remain within a specific branch context.");
            }
        }

        // 🛡️ SAVE: Set the active branch context
        if (branchId === "GLOBAL") {
            cookieStore.delete('v-active-branch');
        } else {
            cookieStore.set('v-active-branch', branchId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
        }

        revalidatePath("/");
        return { success: true };
    } catch (e: any) {
        console.error("[TENANCY ERROR] Failed to set active branch:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 🏛️ GET BRANCHES: Retrieves and validates all branches for the session school
 */
export async function getBranchesAction() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || !identity.schoolId) throw new Error("INVALID_SESSION: Institutional Genesis required.");
        
        const user = identity;

        // 🛡️ LOCK: Source schoolId strictly from the decrypted JWT (Institutional Genesis)
        const branches = await prisma.branch.findMany({
            where: { schoolId: user.schoolId },
            select: { id: true, name: true, code: true }
        });

        return { success: true, data: branches };
    } catch (e: any) {
        console.error("[TENANCY ERROR] Failed to fetch branches:", e);
        return { success: false, error: e.message };
    }
}
