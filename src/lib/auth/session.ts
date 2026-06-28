import { jwtVerify, SignJWT } from "jose";

/**
 * 🔐 SOVEREIGN SECRET RESOLUTION
 * Resolves the JWT secret with build-time safety to prevent Vercel crashes.
 */
function resolveSecret() {
    const raw = process.env.JWT_SECRET;
    if (!raw) {
        // Allow build phase to proceed without secret (Vercel build step has no env)
        if (process.env.NEXT_PHASE === 'phase-production-build') {
            return new TextEncoder().encode("BUILD_PHASE_PLACEHOLDER_NOT_USED_AT_RUNTIME");
        }
        // At runtime, fail hard — no fallback allowed
        throw new Error("FATAL: JWT_SECRET is not configured. Server cannot start without it.");
    }
    return new TextEncoder().encode(raw);
}

export const JWT_SECRET = resolveSecret();

export async function decrypt(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const result = payload as any;
        
        // 🛡️ LOCK: Global Authority Injection
        if (result.role === 'PLATFORM_ADMIN' || result.role === 'DEVELOPER') {
            result.isGlobalDev = true;
        }

        return result;
    } catch (e) {
        return null;
    }
}

export async function encrypt(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(JWT_SECRET);
}
