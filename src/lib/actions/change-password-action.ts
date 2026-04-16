"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(data: { newPassword: string; confirmPassword: string }) {
    try {
        // 1. Verify session exists
        const identity = await getSovereignIdentity();
        if (!identity) {
            return { success: false, error: "No active session. Please log in again." };
        }

        // 2. Validate passwords match
        if (data.newPassword !== data.confirmPassword) {
            return { success: false, error: "Passwords do not match." };
        }

        if (data.newPassword.length < 8) {
            return { success: false, error: "Password must be at least 8 characters." };
        }

        // 3. Hash new password
        const newHash = await bcrypt.hash(data.newPassword, 10);

        // 4. Update Staff record — clear the forced-change flag
        const originalSkip = process.env.SKIP_TENANCY;
        process.env.SKIP_TENANCY = 'true';
        try {
            await prisma.staff.update({
                where: { id: identity.staffId as string },
                data: {
                    passwordHash: newHash,
                    onboardingStatus: "JOINED",  // ✅ Clear the forced-change gate
                }
            });
        } finally {
            process.env.SKIP_TENANCY = originalSkip;
        }

        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("❌ [CHANGE_PASSWORD] Error:", error.message);
        return { success: false, error: "Failed to update password. Please try again." };
    }
}
