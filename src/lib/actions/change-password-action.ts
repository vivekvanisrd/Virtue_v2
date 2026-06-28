"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/auth/session";

export interface OnboardingDetails {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone: string;
    email?: string;
    dob: string;
    gender: string;
    address: string;
    aadhaarNumber: string;
    panNumber?: string;
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
}

export interface ChangePasswordPayload {
    username?: string;
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    onboarding?: OnboardingDetails;
}

/**
 * Check username availability in the database.
 */
export async function checkUsernameAvailabilityAction(usernames: string[]) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) {
            return { success: false, error: "No active session. Please log in again." };
        }

        const cleanUsernames = usernames.map(u => u.toLowerCase().trim());
        const originalSkip = process.env.SKIP_TENANCY;
        process.env.SKIP_TENANCY = 'true';
        try {
            const existing = await prisma.staff.findMany({
                where: {
                    username: {
                        in: cleanUsernames,
                        mode: "insensitive"
                    }
                },
                select: { username: true, id: true }
            });

            const taken = existing
                .filter(e => e.id !== identity.staffId)
                .map(e => e.username?.toLowerCase().trim() || "");

            const results = usernames.map(uname => {
                const clean = uname.toLowerCase().trim();
                return {
                    username: uname,
                    available: !taken.includes(clean)
                };
            });

            return { success: true, results };
        } finally {
            process.env.SKIP_TENANCY = originalSkip;
        }
    } catch (error: any) {
        console.error("❌ [CHECK_USERNAME] Error:", error.message);
        return { success: false, error: "Failed to check username availability." };
    }
}

/**
 * Retrieve current staff onboarding details (pre-fill fields).
 */
export async function getCurrentStaffOnboardingDetailsAction() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) {
            return { success: false, error: "No active session. Please log in again." };
        }

        const isDev = identity.isPlatformAdmin || identity.role === 'DEVELOPER';
        if (isDev) {
            return { success: false, error: "Platform Admin / Developer accounts bypass onboarding." };
        }

        const originalSkip = process.env.SKIP_TENANCY;
        process.env.SKIP_TENANCY = 'true';
        try {
            const staff = await prisma.staff.findUnique({
                where: { id: identity.staffId },
                include: {
                    statutory: true,
                    bank: true,
                }
            });

            if (!staff) {
                return { success: false, error: "Staff profile not found." };
            }

            let phone = staff.phone || "";
            if (!phone && staff.username && /^\d{10}$/.test(staff.username.trim())) {
                phone = staff.username.trim();
            }

            return {
                success: true,
                data: {
                    firstName: staff.firstName || "",
                    lastName: staff.lastName || "",
                    middleName: staff.middleName || "",
                    phone: phone,
                    email: staff.email || "",
                    dob: staff.dob ? staff.dob.toISOString().split("T")[0] : "",
                    gender: staff.gender || "",
                    address: staff.address || "",
                    username: staff.username || "",
                    role: staff.role || "STAFF",
                    statutory: {
                        aadhaarNumber: staff.statutory?.aadhaarNumber || "",
                        panNumber: staff.statutory?.panNumber || "",
                    },
                    bank: {
                        accountName: staff.bank?.accountName || "",
                        accountNumber: staff.bank?.accountNumber || "",
                        ifscCode: staff.bank?.ifscCode || "",
                        bankName: staff.bank?.bankName || "",
                    }
                }
            };
        } finally {
            process.env.SKIP_TENANCY = originalSkip;
        }
    } catch (error: any) {
        console.error("❌ [GET_ONBOARDING_DETAILS] Error:", error.message);
        return { success: false, error: "Failed to retrieve onboarding details." };
    }
}

/**
 * Processes security updates and complete staff details onboarding.
 */
export async function changePasswordAction(data: ChangePasswordPayload) {
    try {
        // 1. Verify session exists
        const identity = await getSovereignIdentity();
        if (!identity) {
            return { success: false, error: "No active session. Please log in again." };
        }

        const isDev = identity.isPlatformAdmin || identity.role === 'DEVELOPER';

        // 2. Validate passwords match if provided
        if (data.newPassword || data.confirmPassword) {
            if (data.newPassword !== data.confirmPassword) {
                return { success: false, error: "Passwords do not match." };
            }

            if (!data.newPassword || data.newPassword.length < 8) {
                return { success: false, error: "Password must be at least 8 characters." };
            }
        } else if (!isDev) {
            // Non-dev must configure a password on first login
            return { success: false, error: "New password is required to activate account." };
        }

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
            // Allow skipping old password during first-time onboarding.
            // Cases where old password is NOT required:
            //   1. Session still has PASSWORD_CHANGE_REQUIRED (normal first login)
            //   2. DB record still has PASSWORD_CHANGE_REQUIRED (re-submit after stale session)
            if (!isDev) {
                const originalSkip = process.env.SKIP_TENANCY;
                process.env.SKIP_TENANCY = 'true';
                let needsOldPassword = true;
                try {
                    const staff = await prisma.staff.findUnique({
                        where: { id: identity.staffId }
                    });
                    // Skip old password if either the DB or the current session JWT says first-time onboarding
                    const cookieStore = await cookies();
                    const rawToken = cookieStore.get("v-session")?.value;
                    const rawPayload = rawToken ? await decrypt(rawToken) : null;
                    const sessionOnboardingStatus = rawPayload?.onboardingStatus;

                    if (
                        staff?.onboardingStatus === "PASSWORD_CHANGE_REQUIRED" ||
                        sessionOnboardingStatus === "PASSWORD_CHANGE_REQUIRED"
                    ) {
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
        const newHash = data.newPassword ? await bcrypt.hash(data.newPassword, 10) : undefined;

        // 5. Update database
        if (isDev) {
            if (!newHash) {
                return { success: false, error: "New password is required." };
            }
            await prisma.platformAdmin.update({
                where: { id: identity.staffId },
                data: { passwordHash: newHash }
            });
        } else {
            // Validate username
            if (!data.username) {
                return { success: false, error: "Username is required." };
            }
            const cleanUser = data.username.toLowerCase().trim();
            if (cleanUser.length < 3) {
                return { success: false, error: "Username must be at least 3 characters." };
            }
            if (cleanUser.length > 30) {
                return { success: false, error: "Username must be under 30 characters." };
            }
            if (!/^[a-zA-Z0-9_\-]+$/.test(cleanUser)) {
                return { success: false, error: "Username can only contain letters, numbers, underscores, and hyphens." };
            }

            // Check username availability
            const originalSkip = process.env.SKIP_TENANCY;
            process.env.SKIP_TENANCY = 'true';
            try {
                const existing = await prisma.staff.findFirst({
                    where: { username: cleanUser }
                });
                if (existing && existing.id !== identity.staffId) {
                    return { success: false, error: "Username is already taken. Please choose another one." };
                }
            } finally {
                process.env.SKIP_TENANCY = originalSkip;
            }

            // Validate onboarding details
            if (!data.onboarding) {
                return { success: false, error: "Onboarding profile details are required." };
            }

            const ob = data.onboarding;
            if (!ob.firstName || ob.firstName.trim().length === 0) {
                return { success: false, error: "First Name is required." };
            }
            if (!ob.lastName || ob.lastName.trim().length === 0) {
                return { success: false, error: "Last Name is required." };
            }
            if (!ob.phone || !/^\d{10}$/.test(ob.phone.trim())) {
                return { success: false, error: "Phone number must be exactly 10 digits." };
            }
            if (!ob.dob) {
                return { success: false, error: "Date of Birth is required." };
            }
            if (!ob.gender) {
                return { success: false, error: "Gender is required." };
            }
            if (!ob.address || ob.address.trim().length === 0) {
                return { success: false, error: "Residential Address is required." };
            }
            if (!ob.aadhaarNumber || !/^\d{12}$/.test(ob.aadhaarNumber.trim())) {
                return { success: false, error: "Aadhaar number must be exactly 12 digits." };
            }
            if (ob.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(ob.panNumber.trim())) {
                return { success: false, error: "PAN number must be in a valid format (e.g. ABCDE1234F)." };
            }
            if (!ob.accountName || ob.accountName.trim().length === 0) {
                return { success: false, error: "Bank Account Holder Name is required." };
            }
            if (!ob.accountNumber || ob.accountNumber.trim().length < 5) {
                return { success: false, error: "Bank Account Number is invalid." };
            }
            if (!ob.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ob.ifscCode.trim())) {
                return { success: false, error: "IFSC code must be valid (11 characters, e.g. SBIN0001234)." };
            }
            if (!ob.bankName || ob.bankName.trim().length === 0) {
                return { success: false, error: "Bank Name is required." };
            }

            // Execute transaction
            try {
                await prisma.$transaction(async (tx) => {
                    const currentStaff = await tx.staff.findUnique({
                        where: { id: identity.staffId }
                    });
                    if (!currentStaff) {
                        throw new Error("Staff profile not found.");
                    }

                    // Map category for Principal, Vice Principal, Director, Owner
                    let employeeCategory = currentStaff.employeeCategory;
                    const r = (currentStaff.role || "").toUpperCase();
                    if (r === "OWNER" || r === "FOUNDER" || r === "CO-FOUNDER") {
                        employeeCategory = "OWNER";
                    } else if (r === "PRINCIPAL" || r === "VICE_PRINCIPAL" || r === "DIRECTOR") {
                        employeeCategory = "MANAGEMENT";
                    } else if (r === "TEACHER" || r.includes("TEAC") || r === "HOD") {
                        employeeCategory = "TEACHING";
                    } else if (r === "DRIVER" || r === "CONDUCTOR" || r.includes("DRIV")) {
                        employeeCategory = "TRANSPORT";
                    } else if (r === "ATTENDANT" || r === "SUPPORT" || r === "AAYA") {
                        employeeCategory = "SUPPORT";
                    }

                    // 1. Update Staff Base
                    await tx.staff.update({
                        where: { id: identity.staffId },
                        data: {
                            firstName: ob.firstName.trim(),
                            lastName: ob.lastName.trim(),
                            middleName: ob.middleName?.trim() || null,
                            phone: ob.phone.trim(),
                            email: ob.email?.trim().toLowerCase() || null,
                            dob: new Date(ob.dob),
                            gender: ob.gender,
                            address: ob.address.trim(),
                            username: cleanUser,
                            ...(newHash && { passwordHash: newHash }),
                            onboardingStatus: "JOINED",
                            mobilePasswordUsed: false,
                            employeeCategory: employeeCategory,
                        }
                    });

                    // 2. Upsert Statutory Details
                    await tx.staffStatutory.upsert({
                        where: { staffId: identity.staffId },
                        create: {
                            staffId: identity.staffId,
                            aadhaarNumber: ob.aadhaarNumber.trim(),
                            panNumber: ob.panNumber?.trim().toUpperCase() || null,
                            schoolId: currentStaff.schoolId,
                            branchId: currentStaff.branchId,
                        },
                        update: {
                            aadhaarNumber: ob.aadhaarNumber.trim(),
                            panNumber: ob.panNumber?.trim().toUpperCase() || null,
                        }
                    });

                    // 3. Upsert Bank Details
                    await tx.staffBank.upsert({
                        where: { staffId: identity.staffId },
                        create: {
                            staffId: identity.staffId,
                            accountName: ob.accountName.trim(),
                            accountNumber: ob.accountNumber.trim(),
                            ifscCode: ob.ifscCode.trim().toUpperCase(),
                            bankName: ob.bankName.trim(),
                            schoolId: currentStaff.schoolId,
                            branchId: currentStaff.branchId,
                        },
                        update: {
                            accountName: ob.accountName.trim(),
                            accountNumber: ob.accountNumber.trim(),
                            ifscCode: ob.ifscCode.trim().toUpperCase(),
                            bankName: ob.bankName.trim(),
                        }
                    });
                });
            } finally {
                process.env.SKIP_TENANCY = originalSkip;
            }
        }

        // Refresh the session cookie so middleware sees the updated onboardingStatus.
        // Without this, the old JWT still has PASSWORD_CHANGE_REQUIRED and the
        // middleware traps the user in a redirect loop back to /change-password.
        const cookieStore = await cookies();
        const existingToken = cookieStore.get("v-session")?.value;
        if (existingToken) {
            const oldPayload = await decrypt(existingToken);
            if (oldPayload) {
                const newToken = await encrypt({
                    ...oldPayload,
                    onboardingStatus: "JOINED",
                    // If they set a username, update it in the session too
                    ...(data.username ? { username: data.username.toLowerCase().trim() } : {}),
                });
                cookieStore.set("v-session", newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 8, // 8 hours
                });
            }
        }

        revalidatePath("/");
        return { success: true };

    } catch (error: any) {
        console.error("❌ [CHANGE_PASSWORD] Error:", error.message);
        return { success: false, error: "Failed to update profile onboarding. Please try again." };
    }
}

