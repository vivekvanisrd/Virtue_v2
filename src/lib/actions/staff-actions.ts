"use server";

import prisma from "@/lib/prisma";
import { getSovereignIdentity } from "@/lib/auth/backbone";
import { IdGenerator } from "@/lib/id-generator";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { sanitizeError } from "@/lib/utils/error-handler";
import { logActivity } from "@/lib/utils/audit-logger";
import { staffOnboardingSchema } from "@/types/staff";

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
                    status: "ACTIVE"
                }
            });

            // Audit
            await tx.activityLog.create({
                data: {
                    schoolId,
                    userId: identity.staffId,
                    branchId: branch.id,
                    entityType: "STAFF",
                    entityId: principal.id,
                    action: "PRINCIPAL_APPOINTED",
                    details: `Principal ${data.firstName} ${data.lastName} appointed to ${branch.name}. Code: ${staffCode}`
                }
            });

            return principal;
        });

        revalidatePath("/", "layout");
        return { 
            success: true, 
            data: JSON.parse(JSON.stringify({
                id: result.id,
                username: result.username,
                staffCode: result.staffCode
            }))
        };

    } catch (e: any) {
        return { success: false, ...sanitizeError(e) };
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

        // 1. Validate Schema Fidelity
        const validated = staffOnboardingSchema.safeParse(data);
        if (!validated.success) {
            const errorMsg = validated.error?.issues?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') || "Unknown error.";
            return { success: false, error: `VALIDATION_FAILED: ${errorMsg}` };
        }
        
        // Use validated data from here on
        const baseData = validated.data;
        const schoolId = identity.schoolId;

        // 1A. Enforce Tenancy Bounds
        // 1A. Enforce Tenancy Bounds (Zero-Trust Identity Lock)
        if (identity.role !== "OWNER" && identity.role !== "DEVELOPER") {
            // Principals are spatially jailed to their OWN campus. 
            // If the form sends a missing or mismatched branch, we AUTO-REPAIR it.
            if (!data.branchId || data.branchId !== identity.branchId) {
                console.log(`🛡️ [StaffActions] Identity sentinel: Force-lining branch ${identity.branchId} for ${identity.role}`);
                data.branchId = identity.branchId;
            }
        }
        // 🔒 Universal Safety Fallback: If branchId is STILL empty (e.g. OWNER on Elite Form without selector), use session branchId
        if (!data.branchId) {
            data.branchId = identity.branchId;
        }

        // 1B. Prevent Role Escalation
        const requestedRole = data.role?.toUpperCase() || "STAFF";
        if (requestedRole === "PRINCIPAL" || requestedRole === "OWNER" || requestedRole === "DEVELOPER") {
            throw new Error("ACCESS_DENIED: Executive roles cannot be appointed through standard onboarding.");
        }

        // 1C. Resolve Branch (Spatially Jailed)
        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, schoolId }
        });
        if (!branch) throw new Error("INVALID_BRANCH: Selected campus does not exist or falls outside your jurisdiction.");

        // 1D. Explicit Identity Conflict Check (Forensic specificity)
        const existingStaff = await prisma.staff.findFirst({
            where: {
                branchId: branch.id,
                OR: [
                    { phone: data.phone },
                    { email: data.email && data.email !== "" ? data.email : undefined }
                ]
            }
        });

        if (existingStaff) {
            const conflictField = existingStaff.phone === data.phone ? "Phone Number" : "Email Address";
            throw new Error(`IDENTIFICATION_CONFLICT: This ${conflictField} is already registered to another staff member in this branch.`);
        }

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
        const username = `${data.firstName.trim().toLowerCase()}_${Math.floor(Math.random() * 10000)}`;

        // 4. Atomic Onboarding
        const result = await prisma.$transaction(async (tx: any) => {
            // A. Base Record
            const staff = await tx.staff.create({
                data: {
                    staffCode,
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    // 🔒 Nullable fields: null if empty, value if filled
                    middleName: data.middleName?.trim() || null,
                    email: data.email?.trim().toLowerCase() || null,
                    phone: data.phone?.trim() || null,
                    gender: data.gender || null,
                    dob: data.dob ? new Date(data.dob) : null,
                    address: data.address?.trim() || null,
                    onboardingStatus: data.onboardingStatus || "JOINED",
                    role: requestedRole,
                    branchId: branch.id,
                    schoolId,
                    username,
                    passwordHash: tempPasswordHash,
                    status: "ACTIVE"
                }
            });

            // B. Professional Layers
            await tx.staffProfessional.create({
                data: {
                    staffId: staff.id,
                    schoolId,
                    branchId: branch.id,
                    designation: data.designation || "Staff",
                    department: data.department || "Academics",
                    qualification: data.qualification || "",
                    experienceYears: Number(data.experienceYears) || 0,
                    dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
                    basicSalary: Number(data.basicSalary) || 0
                }
            });

            // C. Statutory Layers
            await tx.staffStatutory.create({
                data: {
                    staffId: staff.id,
                    schoolId,
                    branchId: branch.id,
                    panNumber: data.panNumber,
                    pfNumber: data.pfNumber,
                    uanNumber: data.uanNumber,
                    esiNumber: data.esiNumber,
                    aadhaarNumber: data.aadhaarNumber
                }
            });

            // D. Bank Routing - Bulletproof Bridge
            if (data.bankName || data.accountNumber) {
                await tx.staffBank.create({
                    data: {
                        staffId: staff.id,
                        schoolId,
                        branchId: branch.id,
                        bankName: data.bankName || "Pending",
                        accountName: data.accountName || `${data.firstName} ${data.lastName}`,
                        accountNumber: data.accountNumber || "Pending",
                        ifscCode: data.ifscCode || ""
                    }
                });
            }

            // E. Audit Trail
            await tx.activityLog.create({
                data: {
                    schoolId,
                    userId: identity.staffId,
                    branchId: branch.id,
                    entityType: "STAFF",
                    entityId: staff.id,
                    action: "STAFF_ONBOARDED",
                    details: `Staff member ${data.firstName} ${data.lastName} (${data.role}) onboarded. Code: ${staffCode}`
                }
            });

            return staff;
        }, { timeout: 20000 });

        revalidatePath("/", "layout");
        return { success: true, data: JSON.parse(JSON.stringify(result)) };

    } catch (e: any) {
        return { success: false, ...sanitizeError(e) };
    }
}

export async function getStaffDirectoryAction() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

        const staff = await prisma.staff.findMany({
            where: { schoolId: identity.schoolId },
            include: {
                professional: true,
                statutory: true,
                bank: true,
                advances: true,
                branch: true
            },
            orderBy: { firstName: 'asc' }
        });

        return { success: true, data: JSON.parse(JSON.stringify(staff)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getStaffByIdAction(staffId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

        const staff = await prisma.staff.findUnique({
            where: { id: staffId, schoolId: identity.schoolId },
            include: {
                professional: true,
                statutory: true,
                bank: true,
                advances: true,
                branch: true
            }
        });

        return { success: true, data: JSON.parse(JSON.stringify(staff)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function disburseStaffAdvanceAction(staffId: string, amount: number, installment: number, reason: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");

        const advance = await prisma.staffAdvance.create({
            data: {
                staffId,
                amount,
                balance: amount,
                installment,
                reason,
                status: "Active"
            }
        });

        revalidatePath("/", "layout");
        return { success: true, data: advance };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getSalaryHubStats() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
        
        const count = await prisma.staff.count({ 
            where: { schoolId: identity.schoolId, status: "ACTIVE" } 
        });
        
        return { success: true, data: { staffCount: count, totalBudget: "₹-" } };
    } catch(e: any) { return { success: false, error: e.message }; }
}

export async function getStaffHubStats() {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
        
        const count = await prisma.staff.count({ 
            where: { schoolId: identity.schoolId } 
        });
        
        return { success: true, data: { totalStaff: count, activeStaff: count, newJoinees: 0 } };
    } catch(e: any) { return { success: false, error: e.message }; }
}

export async function updateStaffProfessionalAction(staffId: string, data: any) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
        const res = await prisma.staffProfessional.update({
            where: { staffId },
            data: {
                basicSalary: data.basicSalary,
                designation: data.designation,
                department: data.department
            }
        });
        revalidatePath("/", "layout");
        return { success: true, data: res };
    } catch(e: any) { return { success: false, error: e.message }; }
}

export async function transferStaffBranchAction(staffId: string, targetBranchId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || identity.role !== "OWNER") throw new Error("ACCESS_DENIED: Only Owners can transfer staff.");
        
        const res = await prisma.staff.update({
             where: { id: staffId, schoolId: identity.schoolId }, // Jail condition
             data: { branchId: targetBranchId }
        });
        revalidatePath("/", "layout");
        return { success: true, data: res };
    } catch(e: any) { return { success: false, error: e.message }; }
}
export async function updateStaffAction(staffId: string, data: any) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        // 1. Validate Schema Fidelity (Partial Update Mode)
        // Note: For updates, we use partial() to allow sparse data objects from UI steps
        const validated = staffOnboardingSchema.partial().safeParse(data);
        if (!validated.success) {
            const errorMsg = validated.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `VALIDATION_FAILED: ${errorMsg}` };
        }

        const updateData: any = validated.data;
        const schoolId = identity.schoolId;

        // 1. Verify record existence and tenancy context
        const currentStaff = await prisma.staff.findUnique({
            where: { id: staffId, schoolId } // Rule 2.1: Always jail by schoolId
        });

        if (!currentStaff) throw new Error("STAFF_NOT_FOUND: Record does not exist in your institution.");

        // 2. Enforce Branch Jailing (Rule 5.3)
        // 1A. Enforce Tenancy Bounds (Zero-Trust Identity Lock)
        if (identity.role !== "OWNER" && identity.role !== "DEVELOPER") {
            if (!data.branchId || data.branchId !== identity.branchId) {
                console.log(`🛡️ [StaffActions] Identity sentinel: Force-lining branch ${identity.branchId} for update`);
                data.branchId = identity.branchId;
            }
        }

        // 3. Prevent Executive Role Escalation via standard form
        if (data.role && (data.role === "PRINCIPAL" || data.role === "OWNER") && currentStaff.role !== data.role) {
             if (identity.role !== "OWNER") {
                throw new Error("ACCESS_DENIED: Only Owners can appoint or modify Executive roles.");
             }
        }

        // 4. Atomic Multi-Layer Update
        const result = await prisma.$transaction(async (tx: any) => {
            // A. Base Record Update (ID & School remain immutable)
            const staff = await tx.staff.update({
                where: { id: staffId },
                data: {
                    // 🔒 Required fields: skip (undefined) if empty — never overwrite with empty string
                    ...(data.firstName?.trim() && { firstName: data.firstName.trim() }),
                    ...(data.lastName?.trim() && { lastName: data.lastName.trim() }),
                    ...(data.role && { role: data.role }),
                    // 🔒 Nullable fields: null if empty (user cleared), value if filled
                    middleName: data.middleName?.trim() || null,
                    email: data.email?.trim().toLowerCase() || null,
                    phone: data.phone?.trim() || null,
                    gender: data.gender || null,
                    dob: data.dob ? new Date(data.dob) : null,
                    address: data.address?.trim() || null,
                    onboardingStatus: data.onboardingStatus || null,
                }
            });

            // B. Professional Layers
            await tx.staffProfessional.upsert({
                where: { staffId },
                update: {
                    // 🔒 Required fields: skip if empty
                    ...(data.designation?.trim() && { designation: data.designation.trim() }),
                    ...(data.dateOfJoining && { dateOfJoining: new Date(data.dateOfJoining) }),
                    ...(data.basicSalary !== undefined && data.basicSalary !== "" && { basicSalary: Number(data.basicSalary) }),
                    // 🔒 Nullable fields: null if empty
                    department: data.department || null,
                    qualification: data.qualification?.trim() || null,
                    experienceYears: (data.experienceYears !== undefined && data.experienceYears !== "") ? Number(data.experienceYears) : null,
                },
                create: {
                    staffId,
                    schoolId,
                    branchId: staff.branchId,
                    designation: data.designation?.trim() || "Staff",
                    department: data.department || "Academics",
                    qualification: data.qualification?.trim() || null,
                    experienceYears: Number(data.experienceYears) || 0,
                    dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : new Date(),
                    basicSalary: Number(data.basicSalary) || 0
                }
            });

            // C. Statutory Layer
            await tx.staffStatutory.upsert({
                where: { staffId },
                update: {
                    // 🔒 All statutory fields are nullable — null if empty, value if filled
                    panNumber: data.panNumber?.trim().toUpperCase() || null,
                    pfNumber: data.pfNumber?.trim() || null,
                    uanNumber: data.uanNumber?.trim() || null,
                    esiNumber: data.esiNumber?.trim() || null,
                    aadhaarNumber: data.aadhaarNumber?.trim() || null,
                },
                create: {
                    staffId,
                    schoolId,
                    branchId: staff.branchId,
                    panNumber: data.panNumber?.trim().toUpperCase() || null,
                    pfNumber: data.pfNumber?.trim() || null,
                    uanNumber: data.uanNumber?.trim() || null,
                    esiNumber: data.esiNumber?.trim() || null,
                    aadhaarNumber: data.aadhaarNumber?.trim() || null,
                }
            });

            // D. Bank Routing - Bulletproof Bridge
            if (data.bankName || data.accountNumber || data.ifscCode || data.accountName) {
                await tx.staffBank.upsert({
                    where: { staffId },
                    update: {
                        // 🔒 Bank fields are non-nullable in schema — skip (undefined) if empty, value if filled
                        ...(data.bankName?.trim() && { bankName: data.bankName.trim() }),
                        ...(data.accountName?.trim() && { accountName: data.accountName.trim() }),
                        ...(data.accountNumber?.trim() && { accountNumber: data.accountNumber.trim() }),
                        ...(data.ifscCode?.trim() && { ifscCode: data.ifscCode.trim().toUpperCase() }),
                    },
                    create: {
                        staffId,
                        schoolId,
                        branchId: staff.branchId,
                        bankName: data.bankName || "Pending",
                        accountName: data.accountName || `${data.firstName} ${data.lastName}`,
                        accountNumber: data.accountNumber || "Pending",
                        ifscCode: data.ifscCode || ""
                    }
                });
            }

            // E. Audit Trail
            await tx.activityLog.create({
                data: {
                    schoolId,
                    userId: identity.staffId,
                    branchId: staff.branchId,
                    entityType: "STAFF",
                    entityId: staff.id,
                    action: "STAFF_UPDATED",
                    details: `Staff member ${staff.firstName} ${staff.lastName} record updated. Code: ${staff.staffCode}`
                }
            });

            return staff;
        }, { timeout: 20000 });

        revalidatePath("/", "layout");
        return { success: true, data: JSON.parse(JSON.stringify(result)) };

    } catch (e: any) {
        console.error("❌ [UPDATE_STAFF_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 🔐 UPDATE STAFF ROLE
 * Safely swaps the administrative role and permissions of a staff member.
 */
export async function updateStaffRoleAction(staffId: string, newRole: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity || !['DEVELOPER', 'OWNER', 'PRINCIPAL'].includes(identity.role)) {
            throw new Error("SECURE_AUTH_REQUIRED: Insufficient privileges to modify security roles.");
        }

        const staff = await prisma.staff.update({
            where: { id: staffId },
            data: { role: newRole }
        });

        await logActivity({
            schoolId: staff.schoolId,
            userId: identity.staffId,
            branchId: staff.branchId,
            entityType: "STAFF",
            entityId: staff.id,
            action: "ROLE_UPDATED",
            details: `Staff member ${staff.firstName} role changed to ${newRole}`
        });

        revalidatePath("/", "layout");
        return { success: true, data: JSON.parse(JSON.stringify(staff)) };
    } catch (e: any) {
        console.error("❌ [ROLE_UPDATE_ERROR]", e.message);
        return { success: false, error: e.message };
    }
}

/**
 * 💹 GET STAFF FINANCIAL SUMMARY
 * Aggregates all financial data points for a specific staff member including
 * Salary history, Advance Ledger, and Attendance pulse.
 */
export async function getStaffFinancialSummaryAction(staffId: string) {
    try {
        const identity = await getSovereignIdentity();
        if (!identity) throw new Error("SECURE_AUTH_REQUIRED.");

        const staff = await prisma.staff.findUnique({
            where: { 
                id: staffId,
                schoolId: identity.schoolId 
            },
            include: {
                professional: true,
                salarySlips: {
                    orderBy: { updatedAt: 'desc' },
                    take: 12 // Last 12 months
                },
                advances: {
                    orderBy: { disbursedDate: 'desc' }
                },
                attendance: {
                    where: {
                        date: {
                            gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) // Last 6 months
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!staff) throw new Error("STAFF_NOT_FOUND");

        // 🧮 Summary Math
        const totalEarnings = staff.salarySlips.reduce((acc: number, s: any) => acc + Number(s.netSalary || 0), 0);
        const activeAdvance = staff.advances.filter((a: any) => a.status === "Active").reduce((acc: number, a: any) => acc + Number(a.balance || 0), 0);
        
        // Attendance Stats (Last 30 days)
        const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
        const recentAttendance = staff.attendance.filter((a: any) => a.date >= thirtyDaysAgo);
        const presentDays = recentAttendance.filter((a: any) => a.status === "Present").length;
        const totalPossible = recentAttendance.length || 1;
        const attendanceRate = Math.round((presentDays / totalPossible) * 100);

        return {
            success: true,
            data: JSON.parse(JSON.stringify({
                staff: {
                    id: staff.id,
                    firstName: staff.firstName,
                    lastName: staff.lastName,
                    staffCode: staff.staffCode,
                    role: staff.role
                },
                metrics: {
                    totalEarnings,
                    activeAdvance,
                    attendanceRate
                },
                slips: staff.salarySlips,
                advances: staff.advances,
                attendanceHistory: staff.attendance
            }))
        };
    } catch (e: any) {
        console.error("❌ [FINANCIAL_SUMMARY_ERROR]", e.message);
        return { success: false, error: e.message || "INTERNAL_DATA_ERROR" };
    }
}
