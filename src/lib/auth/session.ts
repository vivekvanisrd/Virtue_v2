import { jwtVerify } from "jose";

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "virtue_v2_internal_secret_2026_secure"
);

export async function decrypt(token: string) {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as { 
            staffId: string; 
            email: string; 
            name: string;
            role: string; 
            schoolId: string;
            branchId: string;
        };
    } catch (e) {
        return null;
    }
}
