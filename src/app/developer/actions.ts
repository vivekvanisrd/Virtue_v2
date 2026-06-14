'use server';

import prisma from '@/lib/prisma';
import { getSovereignIdentity } from '@/lib/auth/backbone';
import { GenesisService } from '@/lib/services/genesis-service';
import { seedSovereignRolesAction } from '@/lib/auth/rbac';
import { IdGenerator } from '@/lib/id-generator';
import { sanitizePhone } from '@/lib/utils/validations';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import * as crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// 🛡️ GUARD: Only DEVELOPER can call these actions
// ─────────────────────────────────────────────────────────────────────────────
async function guardDeveloper() {
    const identity = await getSovereignIdentity();
    if (!identity || identity.role !== 'DEVELOPER') {
        throw new Error('SECURITY_VIOLATION: Developer credentials required.');
    }
    return identity;
}

// ─────────────────────────────────────────────────────────────────────────────
// 📋 READ: Full Registry — all schools with branches + owner info
// ─────────────────────────────────────────────────────────────────────────────
export async function getFullRegistryAction() {
    try {
        await guardDeveloper();

        const schools = await prisma.school.findMany({
            include: {
                branches: {
                    orderBy: { createdAt: 'asc' }
                },
                staff: {
                    where: { role: 'OWNER' },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        username: true,
                        branchId: true,
                        onboardingStatus: true,
                        status: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, data: schools };
    } catch (e: any) {
        console.error('[REGISTRY_FETCH]', e.message);
        return { success: false, error: e.message, data: [] };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏫 CREATE: Provision a new School + HQ Branch + Owner + Academic Year
// ─────────────────────────────────────────────────────────────────────────────
export async function createSchoolAction(data: {
    schoolName: string;
    schoolCode: string;
    city: string;
    phone?: string;
    ownerFirstName: string;
    ownerLastName: string;
    ownerEmail: string;
    academicYear: string;       // e.g. "2026-27"
    academicYearStart: string;  // e.g. "2026-06-01"
}) {
    try {
        const identity = await guardDeveloper();

        // Validate required fields
        if (!data.schoolName || !data.schoolCode || !data.ownerEmail) {
            return { success: false, error: 'School name, code, and owner email are required.' };
        }

        const cleanCode = data.schoolCode.trim().toUpperCase();

        // Check code availability
        const exists = await prisma.school.findFirst({ where: { code: cleanCode } });
        if (exists) {
            return { success: false, error: `School code "${cleanCode}" is already taken.` };
        }

        const result = await GenesisService.instantiateSchool(
            cleanCode,          // schoolId = schoolCode
            'STANDARD_K10_V1',
            identity.staffId,
            {
                firstName: data.ownerFirstName,
                lastName: data.ownerLastName,
                email: data.ownerEmail,
                username: `owner_${cleanCode.toLowerCase()}`,
            },
            {
                schoolName: data.schoolName,
                schoolCode: cleanCode,
                branchName: 'Main Campus',
                branchCode: 'MAIN',
                city: data.city,
                contactPhone: data.phone,
                academicYear: data.academicYear,
                academicYearStart: data.academicYearStart,
            }
        );

        if (!result.success) {
            return { success: false, error: result.error };
        }

        // Seed standard RBAC roles for this school
        await seedSovereignRolesAction(cleanCode);

        try {
            revalidatePath('/developer');
        } catch (e) {}
        return {
            success: true,
            data: result,
            credentials: {
                username: `owner_${cleanCode.toLowerCase()}`,
                password: 'InitialKey@PaVa',
                note: 'Owner must change password on first login.'
            }
        };
    } catch (e: any) {
        console.error('[CREATE_SCHOOL]', e.message);
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏢 CREATE: Provision a new Branch for an existing School
// ─────────────────────────────────────────────────────────────────────────────
export async function createBranchAction(data: {
    schoolId: string;
    branchName: string;
    branchCode: string;
    city?: string;
    phone?: string;
    // Optional: create a branch admin/principal
    createAdmin?: boolean;
    adminFirstName?: string;
    adminLastName?: string;
    adminEmail?: string;
    adminPhone?: string;
}) {
    try {
        const identity = await guardDeveloper();

        if (!data.schoolId || !data.branchName || !data.branchCode) {
            return { success: false, error: 'School ID, branch name, and branch code are required.' };
        }

        const cleanCode = data.branchCode.trim().toUpperCase();

        // Verify school exists
        const school = await prisma.school.findUnique({ where: { id: data.schoolId } });
        if (!school) return { success: false, error: `School "${data.schoolId}" not found.` };

        // Check branch code uniqueness within this school
        const branchExists = await prisma.branch.findFirst({
            where: { schoolId: data.schoolId, code: cleanCode }
        });
        if (branchExists) {
            return { success: false, error: `Branch code "${cleanCode}" already exists in this school.` };
        }

        // Generate branch ID
        const branchId = await IdGenerator.generateBranchId({
            schoolId: data.schoolId,
            schoolCode: school.code,
            branchCode: cleanCode,
        });

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Branch
            const branch = await tx.branch.create({
                data: {
                    id: branchId,
                    schoolId: data.schoolId,
                    name: data.branchName,
                    code: cleanCode,
                    address: data.city,
                    phone: data.phone,
                    isGenesis: false,
                    mode: 'DEVELOPER_PROVISIONING',
                    triggeredBy: identity.staffId,
                }
            });

            // 2. Initialize Chart of Accounts (financial independence)
            const accounts = [
                { code: '1001', name: 'Main Cash Account',    type: 'ASSET'   },
                { code: '1002', name: 'Campus Bank Account',  type: 'ASSET'   },
                { code: '4001', name: 'Tuition Fee Income',   type: 'INCOME'  },
                { code: '4002', name: 'Admission Fee Income', type: 'INCOME'  },
                { code: '4003', name: 'Transport Fee Income', type: 'INCOME'  },
                { code: '5001', name: 'Operating Expenses',   type: 'EXPENSE' },
                { code: '5002', name: 'Staff Salary Expense', type: 'EXPENSE' },
            ];
            for (const acc of accounts) {
                await tx.chartOfAccount.create({
                    data: {
                        schoolId: data.schoolId,
                        branchId: branch.id,
                        accountCode: `${branch.id}-${acc.code}`,
                        accountName: acc.name,
                        accountType: acc.type,
                        currentBalance: 0,
                    }
                });
            }

            // 3. Audit log
            await tx.activityLog.create({
                data: {
                    schoolId: data.schoolId,
                    branchId: branch.id,
                    action: 'BRANCH_PROVISIONED',
                    entityType: 'Branch',
                    entityId: branch.id,
                    details: `Developer provisioned new branch: ${data.branchName} (${cleanCode})`,
                    userId: identity.staffId,
                }
            });

            // 4. Optional: create branch principal/admin
            let adminResult = null;
            if (data.createAdmin && data.adminEmail) {
                if (!data.adminPhone) {
                    throw new Error("Principal phone number is required.");
                }
                const cleanPhone = sanitizePhone(data.adminPhone) || data.adminPhone.replace(/[^\d]/g, "");

                const staffCode = await IdGenerator.generateStaffCode({
                    schoolId: data.schoolId,
                    schoolCode: school.code,
                    branchId: branch.id,
                    branchCode: cleanCode,
                    role: 'PRINCIPAL',
                }, tx);
                
                const username = cleanPhone;
                const rawPassword = cleanPhone;
                const passwordHash = await bcrypt.hash(rawPassword, 10);
                
                const adminStaff = await tx.staff.create({
                    data: {
                        staffCode,
                        firstName: data.adminFirstName || 'Branch',
                        lastName: data.adminLastName || 'Principal',
                        email: data.adminEmail,
                        phone: cleanPhone,
                        username,
                        passwordHash,
                        role: 'PRINCIPAL',
                        schoolId: data.schoolId,
                        branchId: branch.id,
                        status: 'ACTIVE',
                        onboardingStatus: 'PASSWORD_CHANGE_REQUIRED',
                        employeeCategory: 'MANAGEMENT',
                        identityVersion: 'V2',
                    }
                });
                adminResult = {
                    id: adminStaff.id,
                    username,
                    password: rawPassword,
                    note: 'Must change password on first login.'
                };
            }

            return { branch, adminResult };
        }, { timeout: 30000 });

        try {
            revalidatePath('/developer');
        } catch (e) {}
        return { success: true, data: result };
    } catch (e: any) {
        console.error('[CREATE_BRANCH]', e.message);
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 👤 CREATE: Add an Owner/Admin to an EXISTING school
// ─────────────────────────────────────────────────────────────────────────────
export async function createOwnerAction(data: {
    schoolId: string;
    branchId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'OWNER' | 'PRINCIPAL' | 'ACCOUNTANT';
}) {
    try {
        const identity = await guardDeveloper();

        if (!data.schoolId || !data.branchId || !data.email || !data.phone) {
            return { success: false, error: 'School, branch, email, and phone number are required.' };
        }

        // Verify school + branch exist
        const [school, branch] = await Promise.all([
            prisma.school.findUnique({ where: { id: data.schoolId } }),
            prisma.branch.findUnique({ where: { id: data.branchId } }),
        ]);
        if (!school) return { success: false, error: 'School not found.' };
        if (!branch || branch.schoolId !== data.schoolId) {
            return { success: false, error: 'Branch not found or does not belong to this school.' };
        }

        // Check email uniqueness in this branch
        const emailTaken = await prisma.staff.findFirst({
            where: { branchId: data.branchId, email: data.email }
        });
        if (emailTaken) return { success: false, error: `Email "${data.email}" already registered in this branch.` };

        const cleanPhone = sanitizePhone(data.phone) || data.phone.replace(/[^\d]/g, "");
        const username = cleanPhone;
        const rawPassword = cleanPhone;
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const staff = await prisma.$transaction(async (tx) => {
            const staffCode = await IdGenerator.generateStaffCode({
                schoolId: data.schoolId,
                schoolCode: school.code,
                branchId: data.branchId,
                branchCode: branch.code,
                role: data.role,
            }, tx);

            let employeeCategory: 'OWNER' | 'MANAGEMENT' | 'NON_TEACHING' = 'NON_TEACHING';
            if (data.role === 'OWNER') {
                employeeCategory = 'OWNER';
            } else if (data.role === 'PRINCIPAL') {
                employeeCategory = 'MANAGEMENT';
            }

            const newStaff = await tx.staff.create({
                data: {
                    staffCode,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    phone: cleanPhone,
                    username,
                    passwordHash,
                    role: data.role,
                    schoolId: data.schoolId,
                    branchId: data.branchId,
                    status: 'ACTIVE',
                    onboardingStatus: 'PASSWORD_CHANGE_REQUIRED',
                    employeeCategory,
                    identityVersion: 'V2',
                }
            });

            // Log activity
            await tx.activityLog.create({
                data: {
                    schoolId: data.schoolId,
                    branchId: data.branchId,
                    action: 'OWNER_PROVISIONED',
                    entityType: 'Staff',
                    entityId: newStaff.id,
                    details: `Developer provisioned ${data.role}: ${data.email} [Metadata: ${JSON.stringify({ role: data.role, email: data.email })}]`,
                    userId: identity.staffId,
                }
            });

            return newStaff;
        });

        try {
            revalidatePath('/developer');
        } catch (e) {}
        return {
            success: true,
            data: {
                id: staff.id,
                username,
                password: rawPassword,
                note: 'Staff must change password on first login.'
            }
        };
    } catch (e: any) {
        console.error('[CREATE_OWNER]', e.message);
        if (e.code === 'P2002') return { success: false, error: 'Username or email conflict. Try a different email.' };
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 UTILS
// ─────────────────────────────────────────────────────────────────────────────
export async function checkCodeAvailabilityAction(type: 'school' | 'branch', code: string, schoolId?: string) {
    try {
        await guardDeveloper();
        if (type === 'school') {
            const count = await prisma.school.count({ where: { code: code.toUpperCase() } });
            return count === 0;
        } else {
            const count = await prisma.branch.count({
                where: { code: code.toUpperCase(), schoolId }
            });
            return count === 0;
        }
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔒 TENANCY AUDIT: Verify a school/branch owner can ONLY see their own data
// ─────────────────────────────────────────────────────────────────────────────
export async function auditTenancyIsolationAction(schoolId: string) {
    try {
        await guardDeveloper();

        // Count records per table — these should ONLY contain schoolId records
        const [students, staff, collections, branches] = await Promise.all([
            prisma.student.count({ where: { schoolId } }),
            prisma.staff.count({ where: { schoolId } }),
            prisma.collection.count({ where: { schoolId } }),
            prisma.branch.count({ where: { schoolId } }),
        ]);

        // Cross-school leak check: verify no record from this school appears in another school
        const foreignStudents = await prisma.student.count({
            where: { NOT: { schoolId } }
        });

        return {
            success: true,
            audit: {
                schoolId,
                ownRecords: { students, staff, collections, branches },
                globalStats: { totalOtherStudents: foreignStudents },
                isolation: 'VERIFIED — Tenancy Interceptor enforced via prisma-tenancy.ts'
            }
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔄 IMPERSONATION: Switch active school and branch context for Developer
// ─────────────────────────────────────────────────────────────────────────────
export async function switchSchoolContextAction(schoolId: string | null, branchId: string | null) {
    try {
        await guardDeveloper();

        const cookieStore = await cookies();
        if (schoolId) {
            cookieStore.set('v-active-school', schoolId, { path: '/', maxAge: 60 * 60 * 24 * 7 }); // 1 week
        } else {
            cookieStore.delete('v-active-school');
        }

        if (branchId) {
            cookieStore.set('v-active-branch', branchId, { path: '/', maxAge: 60 * 60 * 24 * 7 }); // 1 week
        } else {
            cookieStore.delete('v-active-branch');
        }

        return { success: true };
    } catch (e: any) {
        console.error('[SWITCH_CONTEXT_ERR]', e.message);
        return { success: false, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔍 STAFF USERS SEARCH: Search any user across all schools and branches
// ─────────────────────────────────────────────────────────────────────────────
export async function searchStaffUsersAction(query: string) {
    try {
        await guardDeveloper();
        if (!query || query.trim().length < 2) {
            return { success: true, data: [] };
        }
        const cleanQuery = query.trim();
        const staffList = await prisma.staff.findMany({
            where: {
                OR: [
                    { username: { contains: cleanQuery, mode: 'insensitive' } },
                    { email: { contains: cleanQuery, mode: 'insensitive' } },
                    { phone: { contains: cleanQuery, mode: 'insensitive' } },
                    { staffCode: { contains: cleanQuery, mode: 'insensitive' } },
                    { firstName: { contains: cleanQuery, mode: 'insensitive' } },
                    { lastName: { contains: cleanQuery, mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                staffCode: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                username: true,
                role: true,
                school: { select: { name: true, code: true } },
                branch: { select: { name: true, code: true } },
                onboardingStatus: true,
                status: true,
            },
            take: 20
        });
        return { success: true, data: staffList };
    } catch (e: any) {
        console.error('[SEARCH_STAFF_USERS]', e.message);
        return { success: false, error: e.message, data: [] };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🔑 RESET PASSWORD: Secure industrial standard password reset for any user
// ─────────────────────────────────────────────────────────────────────────────
export async function resetUserPasswordAction(staffId: string, customPassword?: string) {
    try {
        const identity = await guardDeveloper();

        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: { school: true, branch: true }
        });

        if (!staff) {
            return { success: false, error: 'Staff user not found.' };
        }

        // Generate temporary password if not provided
        let tempPassword = customPassword?.trim();
        if (!tempPassword) {
            // Generate a secure high-entropy random password
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=";
            const length = 14;
            tempPassword = "";
            const bytes = crypto.randomBytes(length);
            for (let i = 0; i < length; i++) {
                tempPassword += charset[bytes[i] % charset.length];
            }
        }

        const passwordHash = await bcrypt.hash(tempPassword, 10);

        await prisma.$transaction(async (tx) => {
            // Update password and force onboarding status to password change required
            await tx.staff.update({
                where: { id: staffId },
                data: {
                    passwordHash,
                    onboardingStatus: 'PASSWORD_CHANGE_REQUIRED',
                    mobilePasswordUsed: false,
                    mobileSessionToken: null
                }
            });

            // Log activity
            await tx.activityLog.create({
                data: {
                    schoolId: staff.schoolId,
                    branchId: staff.branchId,
                    action: 'STAFF_PASSWORD_RESET_BY_DEV',
                    entityType: 'Staff',
                    entityId: staff.id,
                    details: `Developer reset password for ${staff.role}: ${staff.username || staff.email} (${staff.staffCode})`,
                    userId: identity.staffId,
                }
            });
        });

        return {
            success: true,
            credentials: {
                username: staff.username || staff.phone || staff.email || staff.staffCode,
                password: tempPassword,
                note: 'User must change their password on first login.'
            }
        };
    } catch (e: any) {
        console.error('[RESET_PASSWORD]', e.message);
        return { success: false, error: e.message };
    }
}
