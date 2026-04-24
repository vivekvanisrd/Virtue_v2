import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MODELS_TO_FORTIFY = [
    "Staff", "Student", "Branch", "ActivityLog", "ChartOfAccount", "Collection", 
    "Discount", "DiscountType", "FeeComponentMaster", "FeeTemplateComponent", 
    "StudentFeeComponent", "Document", "Enquiry", "ExamResult", "ExamType", 
    "FeeStructure", "FinancialRecord", "GradeScale", "JournalEntry", 
    "Notification", "PayrollRun", "Route", "Subject", "SalarySlip", "StaffKYC"
];

async function applySovereignRLS() {
    console.log("🧬 Starting Sovereign RLS Fortification (PostgreSQL)...");

    try {
        for (const model of MODELS_TO_FORTIFY) {
            console.log(`🔒 Fortifying Table [${model}]...`);
            
            // 1. Enable RLS on the table
            await prisma.$executeRawUnsafe(`ALTER TABLE "${model}" ENABLE ROW LEVEL SECURITY;`);
            
            // 2. Drop existing policy if it exists (for idempotency)
            await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenancy_isolation_policy" ON "${model}";`);
            
            // 3. Create the Sovereign Isolation Policy
            // This policy restricts ALL operations (SELECT, INSERT, UPDATE, DELETE)
            // It mandates that schoolId MUST match the 'app.current_school_id' session variable.
            await prisma.$executeRawUnsafe(`
                CREATE POLICY "tenancy_isolation_policy" ON "${model}"
                AS PERMISSIVE FOR ALL
                TO public
                USING ( "schoolId" = current_setting('app.current_school_id', true) )
                WITH CHECK ( "schoolId" = current_setting('app.current_school_id', true) );
            `);
        }

        console.log("\n🏁 FORTIFICATION COMPLETE: The Database is now physically partitioned by schoolId.");
        console.log("Law 8 & Law 14 (RLS / Final Genesis Seal) are now enforced at the core.");

    } catch (error) {
        console.error("❌ FORTIFICATION CRITICAL FAILURE:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

applySovereignRLS();
