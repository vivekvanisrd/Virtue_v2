import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * 🏛️ V12.1 PURGE PROTOCOL
 * 
 * Securely destroys all internal session cookies and redirects to the login page.
 * Used for testing fresh 'Universal Developer' authentication.
 */
export async function GET() {
    (await cookies()).delete("v-session");
    
    // Redirect to login page with a clean slate
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}
