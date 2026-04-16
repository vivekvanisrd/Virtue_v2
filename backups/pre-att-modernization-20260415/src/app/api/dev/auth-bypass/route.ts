import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encrypt } from "@/lib/auth/session";

/**
 * 🏛️ V12.1 BREAK-GLASS PROTOCOL (Local Development Only)
 * 
 * Provides a stateless PLATFORM_ADMIN session for local testing.
 * Zero-Touch: No database records or schema changes required.
 */
export async function GET() {
    // 1. Hardened Env Guard
    if (process.env.NODE_ENV !== 'development') {
        return new NextResponse(
            JSON.stringify({ error: "FORBIDDEN", message: "Bypass disabled in production." }),
            { status: 403 }
        );
    }

    // 2. Generate Stateless Admin DNA
    const payload = {
        staffId: "DEV-GENESIS",
        email: "dev@virtue.local",
        name: "Sovereign Developer",
        role: "PLATFORM_ADMIN",
        schoolId: "GLB-V2", // Global context
        branchId: "HQ-V2",   // HQ context
    };

    const token = await encrypt(payload);

    // 3. Set the Session Cookie
    const cookieStore = await cookies();
    cookieStore.set("v-session", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 2, // 2 hours
    });

    // 4. Redirect to the Dashboard
    return NextResponse.redirect(new URL("/developer", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
