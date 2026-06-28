import { jwtVerify, SignJWT } from "jose";

/**
 * 🔐 SOVEREIGN SECRET RESOLUTION
 * Resolves the JWT secret with build-time safety to prevent Vercel crashes.
 */
function resolveSecret() {
    const raw = process.env.JWT_SECRET;
    if (!raw) {
        // Fallback for build time or missing env to prevent server-crashing 500 errors
        return new TextEncoder().encode("FALLBACK_JWT_SECRET_KEY_MUST_BE_CONFIGURED_ON_VERCEL");
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
