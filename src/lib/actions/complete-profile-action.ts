"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { encrypt, decrypt } from "@/lib/auth/session";

export interface CompleteProfileInput {
    phone?: string;
    email?: string;
    dob?: string;
    gender?: string;
    address?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
}

export async function getStaffProfileForCompletionAction() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || !identity.staffId) {
            return { success: false, error: "Unauthorized. Please log in." };
        }

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

        return {
            success: true,
            data: {
                firstName: staff.firstName || "",
                lastName: staff.lastName || "",
                middleName: staff.middleName || "",
                phone: staff.phone || "",
                email: staff.email || "",
                dob: staff.dob ? new Date(staff.dob).toISOString().split("T")[0] : "",
                gender: staff.gender || "MALE",
                address: staff.address || "",
                aadhaarNumber: staff.statutory?.aadhaarNumber || "",
                panNumber: staff.statutory?.panNumber || "",
                accountName: staff.bank?.accountName || "",
                accountNumber: staff.bank?.accountNumber || "",
                ifscCode: staff.bank?.ifscCode || "",
                bankName: staff.bank?.bankName || "",
                role: staff.role || "",
            }
        };
    } catch (error: any) {
        console.error("Error fetching staff profile for completion:", error);
        return { success: false, error: "Failed to load profile details." };
    }
}

export async function completeStaffProfileAction(input: CompleteProfileInput) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || !identity.staffId) {
            return { success: false, error: "Unauthorized. Please log in." };
        }

        // Field Validation
        if (input.phone && !/^\d{10}$/.test(input.phone.trim())) {
            return { success: false, error: "Phone number must be exactly 10 digits." };
        }

        if (input.aadhaarNumber && !/^\d{12}$/.test(input.aadhaarNumber.trim())) {
            return { success: false, error: "Aadhaar number must be exactly 12 digits." };
        }

        if (input.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(input.panNumber.trim())) {
            return { success: false, error: "PAN number format is invalid (e.g. ABCDE1234F)." };
        }

        const hasBankData = input.accountNumber || input.ifscCode || input.bankName;
        if (hasBankData) {
            if (!input.accountNumber || input.accountNumber.trim().length < 5) {
                return { success: false, error: "Bank Account Number is invalid." };
            }
            if (!input.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(input.ifscCode.trim())) {
                return { success: false, error: "IFSC code format is invalid (11 characters, e.g. SBIN0001234)." };
            }
            if (!input.bankName || input.bankName.trim().length === 0) {
                return { success: false, error: "Bank Name is required when providing bank details." };
            }
        }

        const originalSkip = process.env.SKIP_TENANCY;
        process.env.SKIP_TENANCY = "true";

        let targetRole = identity.role;

        try {
            await prisma.$transaction(async (tx) => {
                const currentStaff = await tx.staff.findUnique({
                    where: { id: identity.staffId }
                });

                if (!currentStaff) {
                    throw new Error("Staff record not found.");
                }

                targetRole = currentStaff.role || identity.role;

                // 1. Update Staff Base
                await tx.staff.update({
                    where: { id: identity.staffId },
                    data: {
                        ...(input.phone?.trim() && { phone: input.phone.trim() }),
                        ...(input.email?.trim() && { email: input.email.trim().toLowerCase() }),
                        ...(input.dob && { dob: new Date(input.dob) }),
                        ...(input.gender && { gender: input.gender }),
                        ...(input.address?.trim() && { address: input.address.trim() }),
                        onboardingStatus: "COMPLETED",
                    }
                });

                // 2. Upsert Statutory Details
                if (input.aadhaarNumber?.trim() || input.panNumber?.trim()) {
                    await tx.staffStatutory.upsert({
                        where: { staffId: identity.staffId },
                        create: {
                            staffId: identity.staffId,
                            aadhaarNumber: input.aadhaarNumber?.trim() || null,
                            panNumber: input.panNumber?.trim().toUpperCase() || null,
                            schoolId: currentStaff.schoolId,
                            branchId: currentStaff.branchId,
                        },
                        update: {
                            aadhaarNumber: input.aadhaarNumber?.trim() || null,
                            panNumber: input.panNumber?.trim().toUpperCase() || null,
                        }
                    });
                }

                // 3. Upsert Bank Details
                if (hasBankData && input.accountNumber?.trim()) {
                    await tx.staffBank.upsert({
                        where: { staffId: identity.staffId },
                        create: {
                            staffId: identity.staffId,
                            accountName: input.accountName?.trim() || `${currentStaff.firstName} ${currentStaff.lastName}`,
                            accountNumber: input.accountNumber.trim(),
                            ifscCode: input.ifscCode?.trim().toUpperCase() || "",
                            bankName: input.bankName?.trim() || "",
                            schoolId: currentStaff.schoolId,
                            branchId: currentStaff.branchId,
                        },
                        update: {
                            accountName: input.accountName?.trim() || `${currentStaff.firstName} ${currentStaff.lastName}`,
                            accountNumber: input.accountNumber.trim(),
                            ifscCode: input.ifscCode?.trim().toUpperCase() || "",
                            bankName: input.bankName?.trim() || "",
                        }
                    });
                }
            });
        } finally {
            process.env.SKIP_TENANCY = originalSkip;
        }

        // Update JWT session cookie
        const cookieStore = await cookies();
        const existingToken = cookieStore.get("v-session")?.value;
        if (existingToken) {
            const oldPayload = await decrypt(existingToken);
            if (oldPayload) {
                const newToken = await encrypt({
                    ...oldPayload,
                    onboardingStatus: "COMPLETED",
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

        const redirectUrl = (targetRole || "").toUpperCase() === "TEACHER" 
            ? "/mobile/attendance" 
            : "/dashboard";

        return { success: true, redirectUrl };

    } catch (error: any) {
        console.error("Error completing staff profile:", error);
        return { success: false, error: error?.message || "Failed to save profile. Please try again." };
    }
}
