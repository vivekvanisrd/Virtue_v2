"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { IdGenerator } from "@/lib/id-generator";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * 🏛️ STAFF ACTION: Appoint a new Principal to a branch
 * Enforces Rule 2.1 (Golden DNA) and Security Gates
 */
export async function appointPrincipalAction(data: {
    firstName: string;
    lastName: string;
    email: string;
    branchId: string;
}) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || identity.role !== "OWNER") {
            throw new Error("ACCESS_DENIED: Only the Institutional Owner can appoint campus leadership.");
        }

        const schoolId = identity.schoolId;

        // 1. Verify Branch exists and belongs to School
        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, schoolId }
        });

        if (!branch) throw new Error("INVALID_CAMPUS: The selected campus does not exist or is unauthorized.");

        // 2. Generate Staff Code (Rule 2.1)
        const staffCode = await IdGenerator.generateStaffCode({
            schoolId,
            schoolCode: schoolId,
            branchId: branch.id,
            branchCode: branch.code,
            role: "Principal"
        });

        // 3. Prepare Credentials
        const tempPasswordHash = await bcrypt.hash(`Virtue@${branch.code}2026`, 10);
        const username = `${branch.code.toLowerCase()}_principal_${Math.floor(Math.random() * 1000)}`;

        // 4. Atomic Creation
        const result = await prisma.$transaction(async (tx: any) => {
            const principal = await tx.staff.create({
                data: {
                    staffCode,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    username,
                    passwordHash: tempPasswordHash,
                    role: "PRINCIPAL",
                    schoolId,
                    branchId: branch.id,
                    status: "ACTIVE",
                    onboardingStatus: "PASSWORD_CHANGE_REQUIRED", // 🔐 Security Gate
                    isGenesis: true,
                }
            });

            // Audit
            await tx.activityLog.create({
                data: {
                    schoolId,
                    branchId: branch.id,
                    action: "PRINCIPAL_APPOINTED",
                    category: "STAFF",
                    details: { name: `${data.firstName} ${data.lastName}`, staffCode, branch: branch.name },
                    staffId: identity.staffId
                }
            });

            return principal;
        });

        revalidatePath("/", "layout");
        return { 
            success: true, 
            data: {
                id: result.id,
                username: result.username,
                staffCode: result.staffCode
            }
        };

    } catch (e: any) {
        console.error("❌ [STAFF_ACTION_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 🏛️ STAFF ACTION: Create and onboard a new staff member
 * Atomic registration across Professional, Statutory, and Bank layers.
 */
export async function createStaffAction(data: any) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const schoolId = identity.schoolId;

        // 1. Resolve Branch
        const branch = await prisma.branch.findUnique({
            where: { id: data.branchId }
        });
        if (!branch) throw new Error("INVALID_BRANCH: Selected campus does not exist.");

        // 2. Generate Staff Code (Rule 2.1)
        const staffCode = await IdGenerator.generateStaffCode({
            schoolId,
            schoolCode: schoolId,
            branchId: branch.id,
            branchCode: branch.code,
            role: data.role
        });

        // 3. Prepare Credentials
        const tempPasswordHash = await bcrypt.hash(`Virtue@${branch.code}2026`, 10);
        const username = `${data.firstName.toLowerCase()}_${Math.floor(Math.random() * 10000)}`;

        // 4. Atomic Onboarding
        const result = await prisma.$transaction(async (tx: any) => {
            // A. Base Record
            const staff = await tx.staff.create({
                data: {
                    staffCode,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    middleName: data.middleName,
                    email: data.email,
                    phone: data.phone,
                    gender: data.gender,
                    dob: data.dob ? new Date(data.dob) : null,
                    role: data.role?.toUpperCase() || "STAFF",
                    branchId: branch.id,
                    schoolId,
                    username,
                    passwordHash: tempPasswordHash,
                    onboardingStatus: "PASSWORD_CHANGE_REQUIRED",
                    status: "ACTIVE"
                }
            });

            // B. Professional Layers
            await tx.staffProfessional.create({
                data: {
                    staffId: staff.id,
                    designation: data.designation || "Staff",
                    department: data.department,
                    qualification: data.qualification,
                    experienceYears: data.experienceYears,
                    dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
                    basicSalary: data.basicSalary || 0
                }
            });

            // C. Statutory Layers
            await tx.staffStatutory.create({
                data: {
                    staffId: staff.id,
                    panNumber: data.panNumber,
                    pfNumber: data.pfNumber,
                    uanNumber: data.uanNumber,
                    esiNumber: data.esiNumber
                }
            });

            // D. Bank Routing
            if (data.bankName && data.accountNumber) {
                await tx.staffBank.create({
                    data: {
                        staffId: staff.id,
                        bankName: data.bankName,
                        accountName: data.accountName || `${data.firstName} ${data.lastName}`,
                        accountNumber: data.accountNumber,
                        ifscCode: data.ifscCode
                    }
                });
            }

            // E. Audit Trail
            await tx.activityLog.create({
                data: {
                    schoolId,
                    branchId: branch.id,
                    action: "STAFF_ONBOARDED",
                    category: "STAFF",
                    details: { staffCode, name: `${data.firstName} ${data.lastName}`, role: data.role },
                    staffId: identity.staffId
                }
            });

            return staff;
        });

        revalidatePath("/", "layout");
        return { success: true, data: result };

    } catch (e: any) {
        console.error("❌ [CREATE_STAFF_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}
