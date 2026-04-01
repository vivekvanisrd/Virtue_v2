"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * TENANCY ACTION: Sets the active branch context for administrative roles
 * Persisted via secure cookie 'v-active-branch'
 */
export async function setActiveBranchAction(branchId: string) {
    try {
        const cookieStore = await cookies();
        
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
        console.error("[TENANCY ERROR] Failed to set active branch:", e);
        return { success: false, error: e.message };
    }
}
