
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON CORE TABLES
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Staff" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicHistory" ENABLE ROW LEVEL SECURITY;

-- 2. CREATE TENANT ISOLATION POLICIES
-- Policy: Access allowed ONLY if schoolId matches session context
-- Note: 'app.current_school_id' is set via Prisma extension handshake

DO $$ 
BEGIN
    -- Student Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Student') THEN
        CREATE POLICY tenant_isolation ON "Student" 
        USING ("schoolId" = current_setting('app.current_school_id', true)::text);
    END IF;

    -- Staff Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Staff') THEN
        CREATE POLICY tenant_isolation ON "Staff" 
        USING ("schoolId" = current_setting('app.current_school_id', true)::text);
    END IF;

    -- Enquiry Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Enquiry') THEN
        CREATE POLICY tenant_isolation ON "Enquiry" 
        USING ("schoolId" = current_setting('app.current_school_id', true)::text);
    END IF;

    -- Collection Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'Collection') THEN
        CREATE POLICY tenant_isolation ON "Collection" 
        USING ("schoolId" = current_setting('app.current_school_id', true)::text);
    END IF;

    -- AcademicHistory Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'AcademicHistory') THEN
        CREATE POLICY tenant_isolation ON "AcademicHistory" 
        USING ("schoolId" = current_setting('app.current_school_id', true)::text);
    END IF;
END $$;

-- 3. CREATE IMMUTABILITY TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION fn_block_tenant_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD."schoolId" IS NOT NULL AND OLD."schoolId" != NEW."schoolId") THEN
        RAISE EXCEPTION 'Hardening Error: schoolId is IMMUTABLE and cannot be changed across tenants.';
    END IF;
    
    IF (OLD."branchId" IS NOT NULL AND OLD."branchId" != NEW."branchId") THEN
        RAISE EXCEPTION 'Hardening Error: branchId is IMMUTABLE and cannot be changed across tenants.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ATTACH TRIGGER TO CORE TABLES
-- Student
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_block_tenant_update' AND tgrelid = '"Student"'::regclass) THEN
        CREATE TRIGGER trig_block_tenant_update
        BEFORE UPDATE ON "Student"
        FOR EACH ROW EXECUTE FUNCTION fn_block_tenant_update();
    END IF;
END $$;

-- Staff
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trig_block_tenant_update' AND tgrelid = '"Staff"'::regclass) THEN
        CREATE TRIGGER trig_block_tenant_update
        BEFORE UPDATE ON "Staff"
        FOR EACH ROW EXECUTE FUNCTION fn_block_tenant_update();
    END IF;
END $$;
