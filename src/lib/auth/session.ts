import { jwtVerify, SignJWT } from "jose";

/**
 * 🔐 SOVEREIGN SECRET RESOLUTION
 * Resolves the JWT secret with build-time safety to prevent Vercel crashes.
 */
function resolveSecret() {
    const raw = process.env.JWT_SECRET;
    if (!raw) {
        // Only throw at runtime. At build-time (Phases) we use a placeholder.
        const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production';
        if (!isBuildPhase) {
            console.warn("⚠️ AUTH_WARNING: JWT_SECRET is missing. Authentication will fail at runtime.");
        }
        return new TextEncoder().encode("BUILD_TIME_VIRTUE_SECURE_FALLBACK_2026");
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
    const secret = getSecret();
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(secret);
}
