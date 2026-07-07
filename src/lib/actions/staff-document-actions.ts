"use server";

import prisma, { prismaBypass } from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

/**
 * Fetch staff profile details along with banking, statutory, professional, documents, and all staff profiles (if admin)
 */
export async function getStaffProfileDetailsAction(targetStaffId?: string) {
    const tStart = Date.now();
    try {
        console.log(`⏱️ [PROFILE_DEBUG] getStaffProfileDetailsAction started.`);
        const t0 = Date.now();
        const identity = await getSovereignIdentity();
        console.log(`⏱️ [PROFILE_DEBUG] getSovereignIdentity took ${Date.now() - t0}ms`);
        
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        let resolvedStaffId = (isAuthorizedAdmin && targetStaffId) ? targetStaffId : identity.staffId;

        const t1 = Date.now();
        // 1. Fetch the target staff and the list of active staff profiles in parallel (Max 2 concurrent connections)
        const [staffRecord, rawStaffList] = await Promise.all([
            prismaBypass.staff.findUnique({
                where: { id: resolvedStaffId },
                include: {
                    bank: true,
                    professional: true,
                    statutory: true,
                    department: true,
                    category: true,
                    staffDocuments: {
                        orderBy: { uploadedDate: "desc" }
                    }
                }
            }),
            isAuthorizedAdmin
                ? prismaBypass.staff.findMany({
                    where: { schoolId: identity.schoolId, status: { in: ["Active", "ACTIVE", "Joined", "JOINED"] } },
                    select: { id: true, firstName: true, lastName: true, staffCode: true },
                    orderBy: { firstName: "asc" }
                  })
                : Promise.resolve([])
        ]);
        console.log(`⏱️ [PROFILE_DEBUG] Parallel findUnique and findMany took ${Date.now() - t1}ms`);

        let staff = staffRecord;
        let staffList = rawStaffList;

        // If the staff member resolved belongs to a different school, clear it to force fallback to the active school context
        if (staff && staff.schoolId !== identity.schoolId && isAuthorizedAdmin) {
            console.log(`⏱️ [PROFILE_DEBUG] School mismatch detected (Staff School: ${staff.schoolId}, Active: ${identity.schoolId}). Clearing for fallback.`);
            staff = null;
        }

        // 2. SELF-HEALING FALLBACK: If developer/owner does not have a personal staff record, fetch the first available staff member of the active school (sequential fallback)
        if (!staff && isAuthorizedAdmin) {
            const t2 = Date.now();
            staff = await prismaBypass.staff.findFirst({
                where: { schoolId: identity.schoolId },
                include: {
                    bank: true,
                    professional: true,
                    statutory: true,
                    department: true,
                    category: true,
                    staffDocuments: {
                        orderBy: { uploadedDate: "desc" }
                    }
                }
            });
            console.log(`⏱️ [PROFILE_DEBUG] Sequential findFirst fallback took ${Date.now() - t2}ms`);
        }

        if (!staff) throw new Error("Staff profile not found. There are no staff accounts in this institution.");

        console.log(`⏱️ [PROFILE_DEBUG] Total action execution time: ${Date.now() - tStart}ms`);
        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(staff)),
            staffList: JSON.parse(JSON.stringify(staffList))
        };
    } catch (e: any) {
        console.error("Error fetching staff profile details:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Update personal details of a staff member
 */
export async function updateStaffPersonalDetailsAction(data: {
    targetStaffId?: string;
    dob?: string;
    gender?: string;
    address?: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        const resolvedStaffId = (isAuthorizedAdmin && data.targetStaffId) ? data.targetStaffId : identity.staffId;

        const updated = await prismaBypass.staff.update({
            where: { id: resolvedStaffId },
            data: {
                dob: data.dob ? new Date(data.dob) : null,
                gender: data.gender || null,
                address: data.address || null
            }
        });

        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (e: any) {
        console.error("Error updating personal details:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Update bank details of a staff member
 */
export async function updateStaffBankDetailsAction(data: {
    targetStaffId?: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        const resolvedStaffId = (isAuthorizedAdmin && data.targetStaffId) ? data.targetStaffId : identity.staffId;

        const schoolId = identity.schoolId;
        const branchId = identity.branchId;

        const bankRecord = await prismaBypass.staffBank.upsert({
            where: { staffId: resolvedStaffId },
            update: {
                accountName: data.accountName,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                ifscCode: data.ifscCode
            },
            create: {
                staffId: resolvedStaffId,
                accountName: data.accountName,
                bankName: data.bankName,
                accountNumber: data.accountNumber,
                ifscCode: data.ifscCode,
                schoolId,
                branchId
            }
        });

        return { success: true, data: JSON.parse(JSON.stringify(bankRecord)) };
    } catch (e: any) {
        console.error("Error updating bank details:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Update health details of a staff member
 */
export async function updateStaffHealthDetailsAction(data: {
    targetStaffId?: string;
    bloodGroup: string;
    allergies?: string;
    emergencyName: string;
    emergencyPhone: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        const resolvedStaffId = (isAuthorizedAdmin && data.targetStaffId) ? data.targetStaffId : identity.staffId;

        const updated = await prismaBypass.staff.update({
            where: { id: resolvedStaffId },
            data: {
                bloodGroup: data.bloodGroup || null,
                allergies: data.allergies || null,
                emergencyName: data.emergencyName || null,
                emergencyPhone: data.emergencyPhone || null
            }
        });

        return { success: true, data: JSON.parse(JSON.stringify(updated)) };
    } catch (e: any) {
        console.error("Error updating health details:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Change the password of a staff member
 */
export async function updateStaffPasswordAction(data: {
    targetStaffId?: string;
    oldPassword?: string;
    newPassword?: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        const resolvedStaffId = (isAuthorizedAdmin && data.targetStaffId) ? data.targetStaffId : identity.staffId;

        if (!data.newPassword || data.newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }

        const staff = await prismaBypass.staff.findUnique({
            where: { id: resolvedStaffId },
            select: { passwordHash: true }
        });

        if (!staff) throw new Error("Staff account not found.");

        // If not admin, require and verify the old password
        if (!isAuthorizedAdmin || resolvedStaffId === identity.staffId) {
            if (!data.oldPassword) throw new Error("Current password is required.");
            const isValid = await bcrypt.compare(data.oldPassword, staff.passwordHash || "");
            if (!isValid) throw new Error("Current password entered is incorrect.");
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(data.newPassword, 10);

        await prismaBypass.staff.update({
            where: { id: resolvedStaffId },
            data: { 
                passwordHash,
                mobilePasswordUsed: true // Bypass first onboarding password reset
            }
        });

        return { success: true, message: "Password updated successfully." };
    } catch (e: any) {
        console.error("Error updating password:", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Delete a staff document (physical file + DB record)
 */
export async function deleteStaffDocumentAction(docId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        // Retrieve document to find physical file path
        const doc = await prismaBypass.staffDocument.findUnique({
            where: { id: docId }
        });

        if (!doc) throw new Error("Document not found.");

        // Security check: only the owner of the document can delete it (unless Principal/Owner/Dev)
        const isAuthorizedAdmin = ["PRINCIPAL", "OWNER", "DEVELOPER"].includes(identity.role);
        if (doc.staffId !== identity.staffId && !isAuthorizedAdmin) {
            throw new Error("UNAUTHORIZED: You can only delete your own documents.");
        }

        // Delete physical file
        const filePath = path.join(process.cwd(), "public", "uploads", "staff", doc.staffId, doc.storedFileName);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.warn("Failed to delete physical file from disk:", err);
        }

        // Delete DB record
        await prismaBypass.staffDocument.delete({
            where: { id: docId }
        });

        return { success: true, message: "Document deleted successfully." };
    } catch (e: any) {
        console.error("Error deleting staff document:", e.message);
        return { success: false, error: e.message };
    }
}
