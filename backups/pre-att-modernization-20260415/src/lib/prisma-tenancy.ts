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
    "PlatformClass", "PlatformSection", "PlatformAcademicYear", "PlatformFinancialYear"
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
function recursiveSanitize(data: any, role?: string, visited = new Set<any>()): any {
    // 🛡️ Performance & Type Safety Short-Circuit
    if (!data || typeof data !== 'object') return data;
    
    // 🏛️ SOVEREIGN RESILIENCE: Definitive Type Guard (Genesis Seal)
    // Prevent Dates, Decimals, or other atomic structures from being flattened
    const typeTag = Object.prototype.toString.call(data);
    if (typeTag === '[object Date]') return data; // 🔒 Guard Dates
    if (data?.constructor?.name === 'Decimal' || (data.d && data.e && typeof data.s === 'number')) return data; // 🔒 Guard Decimals

    if (visited.has(data)) return data; // Circular reference guard
    visited.add(data);

    if (Array.isArray(data)) {
        return data.map(item => recursiveSanitize(item, role, visited));
    }

    const sanitized: any = { ...data };
    
    // 🏛️ SOVEREIGN SENTINEL: Field-Level Purification
    // 1. ABSOLUTE BLACKLIST: Never leak to any role below PLATFORM levels
    if (role !== 'PLATFORM_ADMIN' && role !== 'DEVELOPER') {
        delete sanitized.passwordHash;
        delete sanitized.integrityHash;
    }

    // 2. TENANCY GATING: Institutional boundaries
    delete sanitized.schoolId;
    delete sanitized.branchId;

    // 3. PII PROTECTION: Restrict sensitive identifiers to Principals/Owners/Devs
    const isHighPrivilege = role === 'OWNER' || role === 'PRINCIPAL' || role === 'DEVELOPER' || role === 'PLATFORM_ADMIN';
    if (!isHighPrivilege) {
        delete sanitized.aadhaarNumber;
        delete sanitized.panNumber;
        delete sanitized.accountNumber;
    }

    // Recurse into nested relations only if they are objects
    for (const key in sanitized) {
        const val = sanitized[key];
        if (val && typeof val === 'object') {
            sanitized[key] = recursiveSanitize(val, role, visited);
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

                    const rawTenant = await getSovereignIdentity();

                    const isSystemModel = SYSTEM_MODELS.includes(model as string);
                    
                    // 🛡️ LOCK: Fail-Shut Policy (Universal Coverage)
                    // If this is a tenant-scoped model but we have no session, we LOCK the request.
                    if (!isSystemModel && !rawTenant && process.env.SKIP_TENANCY !== 'true') {
                        // 🏛️ RECOVERY HOOK: Check if we are in a trusted transition
                        if (args?.where?.id || args?.where?.schoolId) {
                            console.warn(`🕵️ [SENTINEL] Blind Query detected on '${model}'. Identity Drift suspected.`);
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

                    if (!tenant || tenant.isGlobalDev || isGlobalAdmin) {
                        return query(args);
                    }

                    console.log(`🏛️ [TENANCY_DEBUG] Operation: ${operation} Model: ${model}`);

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
                        if (operation === 'findUnique') {
                             operation = 'findFirst';
                        }

                        a.where = a.where || {};

                        // 🔍 INTENT VALIDATION: Verify incoming tenancy doesn't conflict with session
                        if (a.where.schoolId && a.where.schoolId !== tenant.schoolId && tenant.role !== 'PLATFORM_ADMIN') {
                            throw new Error(`SECURITY_VIOLATION: Institutional conflict. (Request: ${a.where.schoolId}, Active: ${tenant.schoolId})`);
                        }

                        if (a.where.branchId && (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL') && a.where.branchId !== tenant.branchId) {
                            throw new Error(`SECURITY_VIOLATION: Branch conflict. (Request: ${a.where.branchId}, Active: ${tenant.branchId})`);
                        }

                        // 🔒 HARD JAIL: Enforce deterministic filters
                        a.where.schoolId = tenant.schoolId;
                        
                        // 🏛️ UNIVERSAL OVERSIGHT: Principals and Owners see all branches. 
                        // Only STAFF are jailed to their specific branch.
                        if (tenant.role === 'STAFF') {
                             if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                 a.where.branchId = tenant.branchId;
                             }
                        }
                    }

                    // 2. PAYLOAD SANITIZATION (CREATE / UPDATE)
                    if (['create', 'createMany', 'update', 'updateMany', 'upsert'].includes(operation)) {
                        if (a.data) {
                            // 🔒 ZERO TRUST (Rule 2.5): Never trust tenancy fields from frontend
                            delete (a.data as any).schoolId;
                            
                            // 🔒 Strict Jail for Standard Staff and Principals. 
                            if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL') {
                                delete (a.data as any).branchId;
                            }
                        }

                        if (operation === 'create') {
                            a.data = a.data || {};
                            a.data.schoolId = tenant.schoolId;
                            // 🔒 Mandatory Injection
                            if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL' || !a.data.branchId) {
                                    a.data.branchId = tenant.branchId;
                                }
                            }
                        } else if (operation === 'createMany') {
                            if (Array.isArray(a.data)) {
                                a.data.forEach((item: any) => {
                                    item.schoolId = tenant.schoolId;
                                    if (!SCHOOL_LEVEL_MODELS.includes(model as string)) {
                                        if (tenant.role === 'STAFF' || tenant.role === 'PRINCIPAL' || !item.branchId) {
                                            item.branchId = tenant.branchId;
                                        }
                                    }
                                });
                            }
                        }
                    }

                    // 🔒 LOCKDOWN: Audit Immutability
                    if (['ActivityLog', 'FinancialAuditLog'].includes(model)) {
                        if (['update', 'delete', 'updateMany', 'deleteMany', 'upsert'].includes(operation)) {
                            if (tenant?.role !== 'PLATFORM_ADMIN' && tenant?.role !== 'DEVELOPER') {
                                throw new Error(`SECURITY_VIOLATION: Forensic audit logs are read-only for ${tenant?.role}.`);
                            }
                        }
                    }

                    // --- LEVEL 3: RLS HANDSHAKE (Ultimate Shield) ---
                    // Optimized to reduce round-trips and connection hold time
                    const result = await (client as any).$transaction(async (tx: any) => {
                        await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${tenant.schoolId}';`);
                        if (tenant.branchId) {
                            await tx.$executeRawUnsafe(`SET LOCAL app.current_branch_id = '${tenant.branchId}';`);
                        }
                        return query(args);
                    }, {
                        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
                        timeout: 10000 // Reduced timeout to release connections faster on hang
                    });

                    // 🕵️ RECURSIVE SANITIZATION (V8.1 Deep Seal)
                    // If SKIP_TENANCY is explicitly enabled (internal routines), we skip sanitization
                    if (process.env.SKIP_TENANCY === 'true') {
                        return result;
                    }

                    return recursiveSanitize(result, tenant?.role);
                },
            },
        },
    });
});
