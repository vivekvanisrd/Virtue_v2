"use server";

import { getSovereignIdentity } from "../auth/backbone";

/**
 * Determines the correct post-login destination based on user role.
 */
export async function getPostLoginRedirect() {
    try {
        const context = await getSovereignIdentity();
        if (!context) return "/dashboard";
        console.log(`[AUTH-REDIRECT] Role identified: ${context.role}`);
        
        if (context.role === "DEVELOPER") {
            return "/developer/dashboard";
        }
        
        return "/dashboard";
    } catch (error: any) {
        console.error(`[AUTH-REDIRECT] Context failure: ${error.message}`);
        // Fallback to regular dashboard if context cannot be determined
        return "/dashboard";
    }
}
