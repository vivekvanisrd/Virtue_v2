import { Prisma } from "@prisma/client";
import { getCurrentTenant } from "./auth/tenancy-context";

/**
 * MODELS REQUIRING TENANCY ISOLATION
 */
const TENANT_MODELS = [
    "Student", "Staff", "AcademicRecord", "AcademicHistory", 
    "FinancialRecord", "Collection", "Enquiry", "ActivityLog", 
    "Book", "LibraryMember", "ExamResult", "Attendance",
    "Address", "FamilyDetail", "PreviousSchool", "MedicalRecord",
    "BankDetail", "Document", "TransportDetail"
];

/**
 * PRISMA TENANCY EXTENSION
 */
export const tenancyExtension = Prisma.defineExtension((client) => {
    return client.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const tenant = getCurrentTenant();
                    
                    // Bypass if no context, global dev, or model is not tenant-aware
                    if (!tenant || tenant.isGlobalDev || !TENANT_MODELS.includes(model)) {
                        return query(args);
                    }

                    // Cast args to any to allow dynamic injection of schoolId
                    const a = args as any;

                    // 1. SELECT / UPDATE / DELETE / COUNT (where-based)
                    if (['findMany', 'findFirst', 'findUnique', 'count', 'updateMany', 'deleteMany', 'aggregate', 'groupBy', 'update', 'delete'].includes(operation)) {
                        a.where = a.where || {};
                        a.where.schoolId = tenant.schoolId;
                    }

                    // 2. CREATE (data-based)
                    if (operation === 'create' || operation === 'createMany') {
                        if (operation === 'create') {
                            a.data = a.data || {};
                            a.data.schoolId = tenant.schoolId;
                        } else {
                            // createMany
                            if (Array.isArray(a.data)) {
                                a.data.forEach((item: any) => {
                                    item.schoolId = tenant.schoolId;
                                });
                            }
                        }
                    }

                    // 3. UPSERT
                    if (operation === 'upsert') {
                        a.where = a.where || {};
                        a.where.schoolId = tenant.schoolId;
                        a.create = a.create || {};
                        a.create.schoolId = tenant.schoolId;
                        a.update = a.update || {};
                        a.update.schoolId = tenant.schoolId;
                    }

                    return query(args);
                },
            },
        },
    });
});
