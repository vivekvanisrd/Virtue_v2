"use server";

import { getTenantContext } from "../utils/tenant-context";

/**
 * Determines the correct post-login destination based on user role.
 */
export async function getPostLoginRedirect() {
    try {
        const context = await getTenantContext();
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
