"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(data: { oldPassword?: string; newPassword: string; confirmPassword: string }) {
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

        const isDev = identity.isPlatformAdmin || identity.role === 'DEVELOPER';

        // 3. Verify old password if provided
        if (data.oldPassword) {
            let currentPasswordHash = "";
            if (isDev) {
                const admin = await prisma.platformAdmin.findUnique({
                    where: { id: identity.staffId }
                });
                if (!admin) {
                    return { success: false, error: "Developer profile not found." };
                }
                currentPasswordHash = admin.passwordHash;
            } else {
                const originalSkip = process.env.SKIP_TENANCY;
                process.env.SKIP_TENANCY = 'true';
                try {
                    const staff = await prisma.staff.findUnique({
                        where: { id: identity.staffId }
                    });
                    if (!staff) {
                        return { success: false, error: "User profile not found." };
                    }
                    currentPasswordHash = staff.passwordHash || "";
                } finally {
                    process.env.SKIP_TENANCY = originalSkip;
                }
            }

            if (currentPasswordHash) {
                const isOldValid = await bcrypt.compare(data.oldPassword, currentPasswordHash);
                if (!isOldValid) {
                    return { success: false, error: "Incorrect old password." };
                }
            }
        } else {
            // Allow skipping old password ONLY if staff is in PASSWORD_CHANGE_REQUIRED onboarding status
            if (!isDev) {
                const originalSkip = process.env.SKIP_TENANCY;
                process.env.SKIP_TENANCY = 'true';
                let needsOldPassword = true;
                try {
                    const staff = await prisma.staff.findUnique({
                        where: { id: identity.staffId }
                    });
                    if (staff && staff.onboardingStatus === "PASSWORD_CHANGE_REQUIRED") {
                        needsOldPassword = false;
                    }
                } finally {
                    process.env.SKIP_TENANCY = originalSkip;
                }
                
                if (needsOldPassword) {
                    return { success: false, error: "Old password is required." };
                }
            } else {
                return { success: false, error: "Old password is required." };
            }
        }

        // 4. Hash new password
        const newHash = await bcrypt.hash(data.newPassword, 10);

        // 5. Update password in database
        if (isDev) {
            await prisma.platformAdmin.update({
                where: { id: identity.staffId },
                data: { passwordHash: newHash }
            });
        } else {
            const originalSkip = process.env.SKIP_TENANCY;
            process.env.SKIP_TENANCY = 'true';
            try {
                await prisma.staff.update({
                    where: { id: identity.staffId as string },
                    data: {
                        passwordHash: newHash,
                        onboardingStatus: "JOINED",  // ✅ Clear forced-change gate
                        mobilePasswordUsed: false,   // ✅ Reset mobile lockout flag
                    }
                });
            } finally {
                process.env.SKIP_TENANCY = originalSkip;
            }
        }

        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("❌ [CHANGE_PASSWORD] Error:", error.message);
        return { success: false, error: "Failed to update password. Please try again." };
    }
}
