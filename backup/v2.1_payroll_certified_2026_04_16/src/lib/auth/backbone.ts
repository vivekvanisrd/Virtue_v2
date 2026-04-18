import { headers, cookies } from "next/headers";
import { decrypt } from "./session";
import { cache } from "react";

/**
 * 🏛️ THE SOVEREIGN BACKBONE (Bimodal)
 * 
 * This is the high-fidelity source of truth for user identity.
 * It uses a "Bimodal" verification strategy:
 * 1. Primary: Fast Header-based retrieval (Set by middleware)
 * 2. Fallback: Bulletproof Cookie-based decryption (Resilient to Next.js context drops)
 */

export interface SovereignIdentity {
    staffId: string;
    role: string;
    schoolId: string;
    branchId: string;
    isGlobalDev: boolean;
    isPlatformAdmin?: boolean;
    email?: string;
    name?: string;
}

/**
 * 🔒 CACHED IDENTITY RESOLUTION
 * React cache ensures this costly resolution only runs ONCE per request lifecycle.
 */
export const getSovereignIdentity = cache(async (): Promise<SovereignIdentity | null> => {
    const traceId = `v2_${Math.random().toString(36).substring(7)}`;
    
    // 0. Environment Override (Development/Test)
    if (process.env.TEST_OVERRIDE_SOVEREIGN === 'true' && process.env.NODE_ENV !== 'production') {
        return {
            staffId: process.env.TEST_STAFF_ID || "TEST_DEV",
            role: process.env.TEST_ROLE || "DEVELOPER",
            schoolId: process.env.TEST_SCHOOL_ID || "",
            branchId: process.env.TEST_BRANCH_ID || "",
            isGlobalDev: process.env.TEST_GLOBAL_DEV === 'true'
        };
    }

    try {
        // --- MODE A: HEADER RETRIEVAL (FAST) ---
        const headerStore = await headers();
        const staffId = headerStore.get('x-v2-staff-id');
        
        if (staffId) {
            console.log(`🏛️ [BACKBONE_TRACE:${traceId}] Identified via HEADERS (Staff: ${staffId})`);
            return {
                staffId,
                role: headerStore.get('x-v2-role') || "",
                schoolId: headerStore.get('x-v2-school-id') || "",
                branchId: headerStore.get('x-v2-branch-id') || "",
                isGlobalDev: headerStore.get('x-v2-global-dev') === 'true',
                name: headerStore.get('x-v2-name') || undefined,
                email: headerStore.get('x-v2-email') || undefined
            };
        }

        // --- MODE B: COOKIE RETRIEVAL (RESILIENT) ---
        const cookieStore = await cookies();
        const session = cookieStore.get('v-session')?.value;

        if (!session) {
            console.error(`❌ [BACKBONE_FAILURE:${traceId}] No 'v-session' cookie found.`);
            return null;
        }

        const user = await decrypt(session);
        if (!user) {
            console.error(`❌ [BACKBONE_FAILURE:${traceId}] Session decryption failed.`);
            return null;
        }

        console.log(`🏛️ [BACKBONE_TRACE:${traceId}] Identified via COOKIE RECOVERY (Email: ${user.email})`);
        return {
            staffId: user.staffId,
            role: user.role,
            schoolId: user.schoolId || (user.isPlatformAdmin ? 'PLATFORM' : ""),
            branchId: user.branchId || "",
            isGlobalDev: !!user.isGlobalDev,
            isPlatformAdmin: !!user.isPlatformAdmin,
            email: user.email,
            name: user.name
        };

    } catch (e: any) {
        // Gracefully handle internal Next.js context errors (static generation attempts)
        if (e.message?.includes('headers') || e.message?.includes('dynamic-api')) {
            return null; 
        }
        console.error(`❌ [BACKBONE_CRITICAL_ERROR:${traceId}]`, e.message);
        return null;
    }
});
