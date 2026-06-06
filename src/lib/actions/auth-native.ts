"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { decrypt, JWT_SECRET } from "../auth/session";

/**
 * NATIVE SIGN IN: Authenticates against the internal Staff table
 */
export async function signInAction(data: { identifier: string; password: string }) {
    try {
        const identifier = data.identifier.trim();
        
        // 1. PRIMARY: PLATFORM_ADMIN LOOKUP (Sovereign Segregation)
        // PlatformAdmin is in SYSTEM_MODELS, so it natively bypasses the Tenancy Interceptor
        const platformDev = await prisma.platformAdmin.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        if (platformDev) {
            const isValid = await bcrypt.compare(data.password, platformDev.passwordHash);
            if (isValid) {
                const token = await new SignJWT({ 
                    staffId: platformDev.id, 
                    email: platformDev.email, 
                    name: platformDev.name,
                    role: 'DEVELOPER',
                    isPlatformAdmin: true,
                    isGlobalDev: true
                })
                    .setProtectedHeader({ alg: "HS256" })
                    .setIssuedAt()
                    .setExpirationTime("24h")
                    .sign(JWT_SECRET);

                (await cookies()).set("v-session", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    path: "/",
                    maxAge: 60 * 60 * 24 
                });

                revalidatePath("/");
                return { success: true };
            }
        }

        // 2. FALLBACK: STAFF LOOKUP (Institutional Tenancy)
        // Using $queryRaw directly to bypass the Tenancy Interceptor safely without
        // mutating the global process.env.SKIP_TENANCY which causes race conditions.
        const staffRecords = await prisma.$queryRaw<any[]>`
            SELECT * FROM "Staff" 
            WHERE (
                LOWER("email") = LOWER(${identifier}) OR 
                LOWER("username") = LOWER(${identifier}) OR
                "phone" = ${identifier} OR
                LOWER("staffCode") = LOWER(${identifier})
            ) 
            AND UPPER("status") = 'ACTIVE' 
            LIMIT 1
        `;
        const staff = staffRecords[0];

        if (!staff || !(staff as any).passwordHash) {
            return { success: false, error: "Invalid credentials." };
        }

        const isValidStaff = await bcrypt.compare(data.password, (staff as any).passwordHash);
        if (!isValidStaff) {
            return { success: false, error: "Invalid credentials." };
        }

        const token = await new SignJWT({ 
            staffId: staff.id, 
            email: staff.email, 
            name: `${staff.firstName} ${staff.lastName || ""}`.trim(),
            role: staff.role,
            schoolId: staff.schoolId,
            branchId: staff.branchId
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);

        (await cookies()).set("v-session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        revalidatePath("/");
        return {
            success: true,
            mustChangePassword: (staff as any).onboardingStatus === "PASSWORD_CHANGE_REQUIRED"
        };
    } catch (e: any) {
        console.error("❌ [AUTH-NATIVE ERROR]", e);
        return { success: false, error: e.message };
    }
}

/**
 * NATIVE SIGN OUT: Clears the internal session cookie
 */
export async function signOutAction() {
    try {
        const session = await verifySession();
        if (session && session.staffId && !session.isPlatformAdmin && session.role !== 'DEVELOPER') {
            await prisma.staff.update({
                where: { id: session.staffId as string },
                data: { mobileSessionToken: null }
            });
        }
    } catch (err) {
        console.error("Error clearing mobile session token on sign out:", err);
    }
    const cookieStore = await cookies();
    cookieStore.delete("v-session");
    cookieStore.delete("v-active-school");
    cookieStore.delete("v-active-branch");
    revalidatePath("/");
    return { success: true };
}

/**
 * VERIFY SESSION: Helper for server actions
 */
export async function verifySession() {
    try {
        const token = (await cookies()).get("v-session")?.value;
        if (!token) return null;
        return await decrypt(token);
    } catch (e) {
        return null;
    }
}
/**
 * REFRESH SESSION: Updates the session cookie with the current DB state
 * (Used after changing a user's branch or school in the DB)
 */
export async function refreshSessionAction() {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: "No active session." };

        const staff = await prisma.staff.findUnique({
            where: { id: session.staffId as string }
        });

        if (!staff) return { success: false, error: "Staff record not found." };

        // Re-issue JWT with LATEST database data
        const token = await new SignJWT({ 
            staffId: staff.id, 
            email: staff.email, 
            name: `${staff.firstName} ${staff.lastName || ""}`.trim(),
            role: staff.role,
            schoolId: staff.schoolId,
            branchId: staff.branchId
        })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);

        (await cookies()).set("v-session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24
        });

        revalidatePath("/", "layout");
        return { success: true, message: "Session credentials synchronized." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * GET SESSION USER: Retrieves the staff profile and attendance stats for the active session
 */
export async function getSessionUserAction() {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: "No active session." };

        const staff = await prisma.staff.findUnique({
            where: { id: session.staffId as string }
        });

        if (!staff) return { success: false, error: "Staff record not found." };

        // Enforce single-device mobile lock if this is a mobile session
        if (session.mobileSessionToken && staff.mobileSessionToken !== session.mobileSessionToken) {
            return { success: false, error: "DEVICE_LOCK_ERROR" };
        }

        // Get branch name
        let branchName = "Main Campus";
        try {
            const branch = await prisma.branch.findUnique({
                where: { id: staff.branchId },
                select: { name: true }
            });
            branchName = branch?.name || "Main Campus";
        } catch {}

        // Get department/designation
        let department = "Staff";
        try {
            const prof = await prisma.staffProfessional.findUnique({
                where: { staffId: staff.id },
                select: { department: true, designation: true }
            });
            department = prof?.designation || prof?.department || "Staff";
        } catch {}

        // Fetch attendance stats (current month)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let presentCount = 0;
        let lateCount = 0;
        try {
            const records = await prisma.staffAttendance.findMany({
                // 🔒 Include schoolId as defence-in-depth (staffId is unique but tenancy is belt-and-suspenders)
                where: { staffId: staff.id, schoolId: staff.schoolId, date: { gte: startOfMonth } }
            });
            presentCount = records.filter((r: any) => r.status?.toUpperCase() === "PRESENT").length;
            lateCount = records.filter((r: any) => {
                const checkIn = r.checkIn ? new Date(r.checkIn) : null;
                return checkIn && (checkIn.getHours() * 60 + checkIn.getMinutes()) > 555;
            }).length;
        } catch {}
        // Check today's check-in status
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let todayRecord = null;
        try {
            todayRecord = await prisma.staffAttendance.findFirst({
                where: {
                    staffId: staff.id,
                    date: {
                        gte: today,
                        lt: tomorrow
                    }
                }
            });
        } catch {}

        const todayStatus = todayRecord ? todayRecord.status : null;
        const todayCheckIn = todayRecord && todayRecord.checkIn 
            ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : null;
        const todayCheckOut = todayRecord && todayRecord.checkOut
            ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;

        return {
            success: true,
            user: {
                id: staff.id,
                staffCode: staff.staffCode,
                firstName: staff.firstName,
                lastName: staff.lastName,
                branchName,
                department
            },
            stats: {
                presentThisMonth: presentCount,
                latesThisMonth: lateCount,
                attendancePercent: Math.round((presentCount / (now.getDate() || 1)) * 100),
                todayStatus,
                todayCheckIn,
                todayCheckOut
            }
        };
    } catch (e: any) {
        console.error("❌ [GET-SESSION-USER ERROR]", e);
        return { success: false, error: e.message };
    }
}

/**
 * GET RECENT KIOSK ATTENDANCE: Fetches today's last 5 successful punch-ins
 * 🔒 SECURITY FIX: Now scoped to the active branch to prevent cross-school data leak
 */
export async function getRecentKioskAttendanceAction() {
    try {
        // 🛡️ Resolve session to get schoolId + branchId for scoping
        const session = await verifySession();
        const schoolId = (session as any)?.schoolId;
        const branchId = (session as any)?.branchId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Build tenant-scoped where clause
        const scopeFilter: any = {
            date: { gte: today, lt: tomorrow },
            status: "Present"
        };
        // Only apply school/branch filter if session exists (kiosk may be pre-authenticated)
        if (schoolId) scopeFilter.schoolId = schoolId;
        if (branchId) scopeFilter.branchId = branchId;

        const records = await prisma.staffAttendance.findMany({
            where: scopeFilter,
            orderBy: { checkIn: "desc" },
            take: 5,
            include: {
                staff: {
                    select: {
                        firstName: true,
                        lastName: true,
                        staffCode: true
                    }
                }
            }
        });

        return {
            success: true,
            records: records.map((r: any) => ({
                id: r.id,
                name: `${r.staff.firstName} ${r.staff.lastName}`,
                code: r.staff.staffCode,
                time: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "---"
            }))
        };
    } catch (e: any) {
        console.error("❌ [GET-RECENT-KIOSK ERROR]", e);
        return { success: false, error: e.message };
    }
}

/**
 * APPLY STAFF LEAVE: Provisions a pending LeaveRequest for staff
 */
export async function applyStaffLeaveAction(data: {
    startDate: string;
    endDate: string;
    type: string;
    reason: string;
}) {
    try {
        const session = await verifySession();
        if (!session) return { success: false, error: "No active session." };

        const leave = await prisma.leaveRequest.create({
            data: {
                staffId: session.staffId as string,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                type: data.type,
                reason: data.reason,
                status: "PENDING"
            }
        });

        return { success: true, leave };
    } catch (e: any) {
        console.error("❌ [APPLY-LEAVE ERROR]", e);
        return { success: false, error: e.message };
    }
}
