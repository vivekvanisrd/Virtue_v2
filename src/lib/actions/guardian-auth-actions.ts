"use server";

import { prismaBypass } from "@/lib/prisma";
import { encrypt } from "@/lib/auth/session";
import { getGuardianIdentity } from "@/lib/auth/guardian-backbone";
import { cookies } from "next/headers";
import crypto from "crypto";

function hashOtp(otp: string): string {
    return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function requestGuardianOtpAction(email: string) {
    try {
        if (!email) {
            return { success: false, error: "Email address is required." };
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Resolve Guardian
        const guardian = await prismaBypass.guardian.findFirst({
            where: { email: normalizedEmail }
        });

        if (!guardian) {
            return { success: false, error: "Email address is not registered as a student guardian in our system." };
        }

        // 2. Resolve or Create GuardianAuth
        let auth = await prismaBypass.guardianAuth.findUnique({
            where: { guardianId: guardian.id }
        });
        if (!auth) {
            auth = await prismaBypass.guardianAuth.create({
                data: { guardianId: guardian.id }
            });
        }

        // Check if account is locked
        if (auth.lockedUntil && auth.lockedUntil > new Date()) {
            return { success: false, error: "Account is temporarily locked due to excessive failed attempts. Please try again later." };
        }

        // 3. Generate random 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = hashOtp(otpCode);

        // 4. Record OTP in database
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration
        const otpRecord = await prismaBypass.guardianOTP.create({
            data: {
                authId: auth.id,
                phone: normalizedEmail, // Save email identifier inside phone column
                otpHash,
                purpose: "LOGIN",
                expiresAt
            }
        });

        // 5. Send Mock Email via Server Console Log
        console.log(`\n📧 ========================================`);
        console.log(`[MOCK_EMAIL] OTP for ${normalizedEmail}: ${otpCode}`);
        console.log(`========================================\n`);

        return { success: true, trackingId: otpRecord.id, message: "OTP sent successfully." };
    } catch (error: any) {
        console.error("Request Guardian OTP Error:", error);
        return { success: false, error: "Failed to process request." };
    }
}

export async function verifyGuardianOtpAction(email: string, otpCode: string) {
    try {
        if (!email || !otpCode) {
            return { success: false, error: "Email and verification code are required." };
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Find Guardian & Auth Profile
        const guardian = await prismaBypass.guardian.findFirst({
            where: { email: normalizedEmail }
        });
        if (!guardian) {
            return { success: false, error: "Guardian profile not found." };
        }

        const auth = await prismaBypass.guardianAuth.findUnique({
            where: { guardianId: guardian.id }
        });
        if (!auth) {
            return { success: false, error: "Authentication profile not initialized." };
        }

        // Check if account is locked
        if (auth.lockedUntil && auth.lockedUntil > new Date()) {
            return { success: false, error: "Account is locked. Please try again later." };
        }

        // 2. Fetch latest pending OTP
        const latestOtp = await prismaBypass.guardianOTP.findFirst({
            where: {
                authId: auth.id,
                phone: normalizedEmail,
                purpose: "LOGIN",
                expiresAt: { gt: new Date() },
                verifiedAt: null
            },
            orderBy: { createdAt: "desc" }
        });

        if (!latestOtp) {
            return { success: false, error: "No active verification code found. Please request a new code." };
        }

        if (latestOtp.attemptCount >= 3) {
            // Lock account for 15 minutes
            await prismaBypass.guardianAuth.update({
                where: { id: auth.id },
                data: {
                    lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
                    failedAttempts: 0
                }
            });
            return { success: false, error: "Too many incorrect attempts. This email session has been locked for 15 minutes." };
        }

        // 3. Verify Match
        const inputHash = hashOtp(otpCode.trim());
        if (latestOtp.otpHash !== inputHash) {
            await prismaBypass.guardianOTP.update({
                where: { id: latestOtp.id },
                data: { attemptCount: { increment: 1 } }
            });
            return { success: false, error: `Incorrect verification code. Attempts remaining: ${2 - latestOtp.attemptCount}` };
        }

        // 4. Mark Verified & Reset Fails
        await prismaBypass.guardianOTP.update({
            where: { id: latestOtp.id },
            data: { verifiedAt: new Date() }
        });

        await prismaBypass.guardianAuth.update({
            where: { id: auth.id },
            data: { failedAttempts: 0 }
        });

        // 5. Create GuardianSession
        const sessionToken = crypto.randomUUID();
        const refreshToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days session

        await prismaBypass.guardianSession.create({
            data: {
                authId: auth.id,
                sessionToken,
                refreshToken,
                expiresAt,
                deviceType: "WEB"
            }
        });

        // 6. Sign JWT & Set Cookie
        const token = await encrypt({
            type: "GUARDIAN",
            guardianId: guardian.id,
            phone: guardian.phone,
            name: `${guardian.firstName} ${guardian.lastName || ""}`.trim(),
            schoolId: guardian.schoolId
        });

        try {
            const cookieStore = await cookies();
            cookieStore.set("v-guardian-session", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 30 * 24 * 60 * 60, // 30 days
                path: "/"
            });
        } catch (e: any) {
            console.warn("⚠️ [next-cookies] Skipping cookies set (executed outside request context):", e.message);
        }

        return { success: true, message: "Logged in successfully." };
    } catch (error: any) {
        console.error("Verify Guardian OTP Error:", error);
        return { success: false, error: "Failed to verify code." };
    }
}

export async function logoutGuardianAction() {
    try {
        try {
            const cookieStore = await cookies();
            cookieStore.delete("v-guardian-session");
        } catch (e: any) {
            console.warn("⚠️ [next-cookies] Skipping cookies delete (executed outside request context):", e.message);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Logout Guardian Error:", error);
        return { success: false, error: "Failed to log out." };
    }
}

export async function getGuardianSiblingsAction() {
    try {
        const identity = await getGuardianIdentity();
        if (!identity) {
            return { success: false, error: "Session expired. Please log in again." };
        }

        const mappings = await prismaBypass.studentGuardian.findMany({
            where: {
                guardianId: identity.guardianId,
                activeStatus: "ACTIVE"
            },
            include: {
                student: {
                    include: {
                        academic: {
                            include: {
                                class: true,
                                section: true
                            }
                        },
                        branch: true,
                        school: true
                    }
                }
            }
        });

        const siblings = mappings.map((m: any) => ({
            studentId: m.student.id,
            studentCode: m.student.studentCode || m.student.admissionNumber || "",
            firstName: m.student.firstName,
            lastName: m.student.lastName || "",
            relationType: m.relationType,
            isPrimary: m.isPrimaryGuardian,
            feeResponsibility: m.feeResponsibility,
            className: m.student.academic?.class?.name || "N/A",
            sectionName: m.student.academic?.section?.name || "N/A",
            branchName: m.student.branch?.name || "N/A",
            schoolName: m.student.school?.name || "N/A"
        }));

        return { success: true, siblings };
    } catch (error: any) {
        console.error("Get Guardian Siblings Error:", error);
        return { success: false, error: "Failed to load sibling profiles." };
    }
}
