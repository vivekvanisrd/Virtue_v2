import { jwtVerify, SignJWT } from "jose";

if (!process.env.JWT_SECRET) {
    throw new Error("ENVIRONMENT_FAULT: Mandatory JWT_SECRET is missing from .env");
}

export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

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
