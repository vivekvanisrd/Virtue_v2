"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { decrypt, JWT_SECRET } from "../auth/session";

/**
 * NATIVE SIGN IN: Authenticates against the internal Staff table
 */
export async function signInAction(data: { identifier: string; password: string }) {
    try {
        const identifier = data.identifier.trim();
        
        // 1. PRIMARY: PLATFORM_ADMIN LOOKUP (Sovereign Segregation)
        const platformDev = await (async () => {
            const originalSkip = process.env.SKIP_TENANCY;
            process.env.SKIP_TENANCY = 'true';
            try {
                return await prisma.platformAdmin.findFirst({
                    where: {
                        OR: [
                            { email: identifier },
                            { username: identifier }
                        ]
                    }
                });
            } finally {
                process.env.SKIP_TENANCY = originalSkip;
            }
        })();

        if (platformDev) {
            const isValid = await bcrypt.compare(data.password, platformDev.passwordHash);
            if (isValid) {
                const token = await new SignJWT({ 
                    staffId: platformDev.id, 
                    email: platformDev.email, 
                    name: platformDev.name,
                    role: 'DEVELOPER',
                    isPlatformAdmin: true,
                    isGlobalDev: true
                })
                    .setProtectedHeader({ alg: "HS256" })
                    .setIssuedAt()
                    .setExpirationTime("24h")
                    .sign(JWT_SECRET);

                (await cookies()).set("v-session", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 24 
                });

                revalidatePath("/");
                return { success: true };
            }
        }

        // 2. FALLBACK: STAFF LOOKUP (Institutional Tenancy)
        const staff = await (async () => {
            const originalSkip = process.env.SKIP_TENANCY;
            process.env.SKIP_TENANCY = 'true';
            try {
                return await prisma.staff.findFirst({
                    where: {
                        OR: [
                            { email: identifier },
                            { username: identifier }
                        ],
                        status: "ACTIVE"
                    } as any
                });
            } finally {
                process.env.SKIP_TENANCY = originalSkip;
            }
        })();

        if (!staff || !(staff as any).passwordHash) {
            return { success: false, error: "Invalid credentials." };
        }

        const isValidStaff = await bcrypt.compare(data.password, (staff as any).passwordHash);
        if (!isValidStaff) {
            return { success: false, error: "Invalid credentials." };
        }

        const token = await new SignJWT({ 
            staffId: staff.id, 
            email: staff.email, 
            name: `${staff.firstName} ${staff.lastName || ""}`.trim(),
            role: staff.role,
            schoolId: staff.schoolId,
            branchId: staff.branchId
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);

        (await cookies()).set("v-session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        revalidatePath("/");
        return {
            success: true,
            mustChangePassword: (staff as any).onboardingStatus === "PASSWORD_CHANGE_REQUIRED"
        };
    } catch (e: any) {
        console.error("❌ [AUTH-NATIVE ERROR]", e);
        return { success: false, error: e.message };
    }
}

/**
 * NATIVE SIGN OUT: Clears the internal session cookie
 */
export async function signOutAction() {
    (await cookies()).delete("v-session");
    revalidatePath("/");
    return { success: true };
}

/**
 * VERIFY SESSION: Helper for server actions
 */
export async function verifySession() {
    try {
        const token = (await cookies()).get("v-session")?.value;
        if (!token) return null;
        return await decrypt(token);
    } catch (e) {
        return null;
    }
}
/**
 * REFRESH SESSION: Updates the session cookie with the current DB state
 * (Used after changing a user's branch or school in the DB)
 */
export async function refreshSessionAction() {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: "No active session." };

        const staff = await prisma.staff.findUnique({
            where: { id: session.staffId as string }
        });

        if (!staff) return { success: false, error: "Staff record not found." };

        // Re-issue JWT with LATEST database data
        const token = await new SignJWT({ 
            staffId: staff.id, 
            email: staff.email, 
            name: `${staff.firstName} ${staff.lastName || ""}`.trim(),
            role: staff.role,
            schoolId: staff.schoolId,
            branchId: staff.branchId
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);

        (await cookies()).set("v-session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        revalidatePath("/", "layout");
        return { success: true, message: "Session credentials synchronized." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
