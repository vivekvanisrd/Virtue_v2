import { cookies } from "next/headers";
import { decrypt } from "./session";
import { cache } from "react";

export interface GuardianIdentity {
    guardianId: string;
    phone: string;
    email?: string;
    name: string;
    schoolId: string;
}

export const getGuardianIdentity = cache(async (): Promise<GuardianIdentity | null> => {
    // 0. Environment Override (Development/Test)
    if (process.env.TEST_OVERRIDE_GUARDIAN === 'true' && process.env.NODE_ENV !== 'production') {
        return {
            guardianId: process.env.TEST_GUARDIAN_ID || "TEST_GUARDIAN",
            phone: process.env.TEST_PHONE || "",
            name: process.env.TEST_NAME || "Test Parent",
            schoolId: process.env.TEST_SCHOOL_ID || ""
        };
    }

    try {
        const cookieStore = await cookies();
        const session = cookieStore.get("v-guardian-session")?.value;
        if (!session) return null;

        const guardian = await decrypt(session);
        if (!guardian || guardian.type !== "GUARDIAN") return null;

        return {
            guardianId: guardian.guardianId,
            phone: guardian.phone,
            email: guardian.email || undefined,
            name: guardian.name,
            schoolId: guardian.schoolId
        };
    } catch {
        return null;
    }
});
