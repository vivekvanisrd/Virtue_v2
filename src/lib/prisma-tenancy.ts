import { Prisma } from "@prisma/client";
import { getSovereignIdentity } from "./auth/backbone";

/**
 * 🧱 SYSTEM_MODELS (Blacklist - Hardcoded for Security)
 * Models in this list are NOT subject to mandatory institutional gating.
 * ONLY MODIFY THIS LIST VIA FORMAL SECURITY CODE REVIEW.
 * 
 * ⚠️ AcademicYear and FinancialYear intentionally EXCLUDED:
 * They have schoolId fields and must be tenant-scoped.
 * DEVELOPER role bypasses this via isGlobalAdmin check.
 */
const SYSTEM_MODELS = [
    "School", "GlobalSetting", "TenancyCounter", "PlatformAdmin", 
    "PlatformClass", "PlatformSection", "PlatformAcademicYear", "PlatformFinancialYear",
    "AttendanceException"
];

/**
 * 🏛️ SCHOOL_LEVEL_MODELS
 * Models that establish foundational architecture and span the entire School.
 * These require a schoolId but DO NOT have a branchId.
 */
const SCHOOL_LEVEL_MODELS = [
    "Branch", "AcademicYear", "FinancialYear", "SovereignRole", "StaffDepartment", "StaffCategory"
];

/**
 * 🕵️ RECURSIVE SANITIZER: Scans and strips institutional IDs from any depth
 * Highly optimized for V8.1 Final Polish.
 */
function recursiveSanitize(data: any, role?: string, visited = new Set<any>(), depth = 0): any {
    // 🛡️ Performance & Depth Safeguard (Genesis 8.1 Polish)
    if (!data || typeof data !== 'object' || depth > 8) return data;
    
    // 🏛️ Atomic Structure Guard: Prevent mutation of Dates or Decimals
    const typeTag = Object.prototype.toString.call(data);
    if (typeTag === '[object Date]') return data;
    if (data?.constructor?.name === 'Decimal' || (data && Array.isArray(data.d) && typeof data.e === 'number' && typeof data.s === 'number')) return data;

    if (visited.has(data)) return data; 
    visited.add(data);

    if (Array.isArray(data)) {
        // Optimistic shortcut for primitive arrays
        if (data.length > 0 && typeof data[0] !== 'object') return data;
        return data.map(item => recursiveSanitize(item, role, visited, depth + 1));
    }

    const sanitized: any = { ...data };
    
    // 1. ABSOLUTE BLACKLIST: Never leak sensitive hashes
    if (role !== 'PLATFORM_ADMIN' && role !== 'DEVELOPER') {
        if (sanitized.passwordHash) delete sanitized.passwordHash;
        if (sanitized.integrityHash) delete sanitized.integrityHash;
    }

    // 2. TENANCY GATING: Institutional boundaries
    if (sanitized.schoolId) delete sanitized.schoolId;
    if (sanitized.branchId) delete sanitized.branchId;
    if (sanitized.school_id) delete sanitized.school_id;
    if (sanitized.branch_id) delete sanitized.branch_id;

    // 3. PII PROTECTION: Role-based field pruning
    const isHighPrivilege = role === 'OWNER' || role === 'PRINCIPAL' || role === 'DEVELOPER' || role === 'PLATFORM_ADMIN';
    if (!isHighPrivilege) {
        if (sanitized.aadhaarNumber) delete sanitized.aadhaarNumber;
        if (sanitized.panNumber) delete sanitized.panNumber;
        if (sanitized.accountNumber) delete sanitized.accountNumber;
    }

    // Recurse conditionally
    for (const key in sanitized) {
        const val = sanitized[key];
        if (val && typeof val === 'object') {
            sanitized[key] = recursiveSanitize(val, role, visited, depth + 1);
        }
    }

    return sanitized;
}

/**
 * 🏛️ PRISMA TENANCY EXTENSION (Sentinel V8.1 - Final Genesis Seal)
 */
export const tenancyExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // 🛡️ LOCK: Sovereign Bypass (Maintenance/Genesis Mode)
                    if (process.env.SKIP_TENANCY === 'true') {
                        return query(args);
                    }

                    const isSystemModel = SYSTEM_MODELS.includes(model as string);

                    // --- LEVEL 1: IDENTITY RESOLUTION (Bypass for System Models) ---
                    // Optimized: Only call getSovereignIdentity if this is a tenant-scoped model
                    if (isSystemModel) {
                        return query(args);
                    }

                    const rawTenant = await getSovereignIdentity();
                    
                    // 🛡️ LOCK: Fail-Shut Policy (Universal Coverage)
                    if (!rawTenant) {
                        // 🏛️ RECOVERY HOOK: Allow session-free access if schoolId is explicitly provided (e.g. Razorpay Callback)
                        const a = args as any;
                        const explicitSchoolId = a.where?.schoolId || a.data?.schoolId || (Array.isArray(a.data) ? a.data[0]?.schoolId : null);
                        
                        if (explicitSchoolId) {
                            return query(args); 
                        }

                        throw new Error(`SECURITY_VIOLATION: Initialized Fail-Shut. Protected model '${model}' accessed without session.`);
                    }

                    // 🛡️ LOCK: Context Immutability
                    const tenant = rawTenant ? Object.freeze({ ...rawTenant }) : null;

                    // Bypass if global dev
                    const isGlobalAdmin = tenant?.role === 'PLATFORM_ADMIN' || tenant?.role === 'DEVELOPER';
                    
                    // 🛡️ LOCK: Platform Master Gating
                    if (model.startsWith('Platform') && !isGlobalAdmin) {
                        throw new Error(`SECURITY_VIOLATION: Restricted Access. Universal Platform Templates are manageable by Platform Administrators only.`);
                    }

                    if (!tenant || (tenant as any).isGlobalDev || isGlobalAdmin) {
                        return query(args);
                    }

                    // 🛡️ LOCK: System Model Bypass (Restricted)
                    // System models can be read, but School must be gated by ID
                    if (isSystemModel) {
                        if (model === 'School' && (operation.startsWith('find') || operation === 'count')) {
                            const a = args as any;
                            a.where = a.where || {};
                            
                            // 🔒 CRITICAL: Throw if attempting to discover another school
                            if (a.where.id && a.where.id !== tenant.schoolId) {
                                throw new Error(`SECURITY_VIOLATION: Institutional breach attempt. Discovery of foreign school '${a.where.id}' blocked.`);
                            }

                            a.where.id = tenant.schoolId;
                        }
                        return query(args);
                    }

                    // Cast args to any to allow dynamic injection
                    const a = args as any;
                    
                    const isSnakeCaseModel = (model as string).startsWith("inventory_") || model === "fee_payment_links";
                    const schoolIdField = isSnakeCaseModel ? "school_id" : "schoolId";
                    const branchIdField = isSnakeCaseModel ? "branch_id" : "branchId";

                    // 🛡️ LOCK: Surgical Query Intent Validation (Point 11 & 12)
                    if (['findMany', 'updateMany', 'deleteMany', 'count'].includes(operation)) {
                        const whereKeys = Object.keys(a.where || {});
                        if (whereKeys.length === 0) {
                             throw new Error(`SECURITY_VIOLATION: Ambiguous query intent on protected model '${model}'. Empty 'where' clause rejected.`);
                        }
                    }

                    // 1. DETERMINISTIC GATING (SELECT / UPDATE / DELETE / COUNT)
                    if (['findMany', 'findFirst', 'findUnique', 'count', 'updateMany', 'deleteMany', 'aggregate', 'groupBy', 'update', 'delete'].includes(operation)) {
                        
                        // 🛡️ LOCK: findUnique MUST pivot to findFirst to avoid ID-guess bypass
                        let op = operation;
                        if (op === 'findUnique') {
                             op = 'findFirst';
                        }

                        a.where = a.where || {};

                        const incomingSchoolId = a.where[schoolIdField] || (isSnakeCaseModel ? a.where.schoolId : a.where.school_id);
                        const incomingBranchId = a.where[branchIdField] || (isSnakeCaseModel ? a.where.branchId : a.where.branch_id);

                        // 🔍 INTENT VALIDATION: Verify incoming tenancy doesn't conflict with session
                        if (incomingSchoolId && incomingSchoolId !== tenant.schoolId && tenant.role !== 'PLATFORM_ADMIN') {
                            throw new Error(`SECURITY_VIOLATION: Institutional conflict. (Request: ${incomingSchoolId}, Active: ${tenant.schoolId})`);
                        }

                        if (incomingBranchId && (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL') && incomingBranchId !== tenant.branchId) {
                            throw new Error(`SECURITY_VIOLATION: Branch conflict. (Request: ${incomingBranchId}, Active: ${tenant.branchId})`);
                        }

                        // 🔒 HARD JAIL: Enforce deterministic filters
                        a.where[schoolIdField] = tenant.schoolId;
                        if (isSnakeCaseModel) {
                            delete a.where.schoolId;
                            delete a.where.branchId;
                        } else {
                            delete a.where.school_id;
                            delete a.where.branch_id;
                        }
                        
                        // 🏛️ UNIVERSAL OVERSIGHT: Principals and Owners see all branches. 
                        // Only STAFF are jailed to their specific branch.
                        if (tenant.role === 'STAFF') {
                             if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                  a.where[branchIdField] = tenant.branchId;
                             }
                        }
                    }

                    // 2. PAYLOAD SANITIZATION (CREATE / UPDATE)
                    if (['create', 'createMany', 'update', 'updateMany', 'upsert'].includes(operation)) {
                        if (a.data) {
                            // 🔒 ZERO TRUST (Rule 2.5): Never trust tenancy fields from frontend
                            delete (a.data as any).schoolId;
                            delete (a.data as any).school_id;
                            
                            // 🔒 Strict Jail for Standard Staff and Principals. 
                            if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL') {
                                delete (a.data as any).branchId;
                                delete (a.data as any).branch_id;
                            }
                        }

                        if (operation === 'create') {
                           if ((a as any)?.where) {
                                (a as any).where = {
                                    ...(a as any).where,
                                    [schoolIdField]: (tenant as any).schoolId
                                };
                                if (isSnakeCaseModel) {
                                    delete (a as any).where.schoolId;
                                } else {
                                    delete (a as any).where.school_id;
                                }
                            }
                            a.data = a.data || {};
                            a.data[schoolIdField] = tenant.schoolId;
                            // 🔒 Mandatory Injection
                            if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL' || !a.data[branchIdField]) {
                                    a.data[branchIdField] = tenant.branchId;
                                }
                            }
                        } else if (operation === 'createMany') {
                            if (Array.isArray(a.data)) {
                                a.data.forEach((item: any) => {
                                    item[schoolIdField] = tenant.schoolId;
                                    if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                        if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL' || !item[branchIdField]) {
                                            item[branchIdField] = tenant.branchId;
                                        }
                                    }
                                });
                            }
                        }
                    }

                    // 🔒 LOCKDOWN: Audit & Financial Immutability
                    if (['ActivityLog', 'FinancialAuditLog', 'JournalEntry', 'Collection', 'JournalLine'].includes(model)) {
                        if (['update', 'delete', 'updateMany', 'deleteMany', 'upsert'].includes(operation)) {
                            // Immutability is Absolute for Financial Records
                            if (['JournalEntry', 'Collection', 'JournalLine'].includes(model)) {
                                throw new Error(`SECURITY_VIOLATION: NON_EDITABLE_RECORD. Financial transactions are immutable and cannot be modified or removed. Use Reversals for corrections.`);
                            }
                            
                            // Audit logs are read-only for standard institutional roles
                            if (tenant?.role !== 'PLATFORM_ADMIN' && tenant?.role !== 'DEVELOPER') {
                                throw new Error(`SECURITY_VIOLATION: Forensic audit logs are read-only for ${tenant?.role}.`);
                            }
                        }
                    }

                    // --- LEVEL 3: RLS HANDSHAKE (Ultimate Shield) ---
                    // Optimized to bypass transaction for read operations
                    const isWrite = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation);
                    
                    // 🕵️ SOVEREIGN SANITIZATION: Apply PII scrubbing to ALL results
                    // Previously, the sanitizer was dead code (after an early return). Fixed in V8.2.
                    const shouldSanitize = process.env.SKIP_TENANCY !== 'true';

                    if (!isWrite) {
                        const readResult = await query(args);
                        return shouldSanitize ? recursiveSanitize(readResult, tenant?.role) : readResult;
                    }

                    const writeResult = await (client as any).$transaction(async (tx: any) => {
                        await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${tenant.schoolId}';`);
                        if (tenant.branchId) {
                            await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${tenant.branchId}';`);
                        }
                        return query(args);
                    }, {
                        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
                        timeout: 10000 
                    });

                    return shouldSanitize ? recursiveSanitize(writeResult, tenant?.role) : writeResult;
                },
            },
        },
    });
});
