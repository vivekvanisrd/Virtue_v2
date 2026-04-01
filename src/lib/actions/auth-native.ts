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
        
        // 1. Find staff by email or username
        const staff = await prisma.staff.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ],
                status: "Active"
            } as any
        });

        if (!staff || !(staff as any).passwordHash) {
            return { success: false, error: "Invalid credentials." };
        }

        // 2. Verify password
        const isValid = await bcrypt.compare(data.password, (staff as any).passwordHash);
        if (!isValid) {
            return { success: false, error: "Invalid credentials." };
        }

        // 3. Create Session (JWT)
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

        // 4. Set Cookie
        (await cookies()).set("v-session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 // 24 hours
        });

        revalidatePath("/");
        return { success: true };
    } catch (e: any) {
        console.error("[AUTH-NATIVE ERROR]", e);
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
