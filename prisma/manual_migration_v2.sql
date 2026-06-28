-- ============================================================
-- VIRTUE V2 — Manual Migration: Calendar + Payroll + Attendance
-- Run this in Supabase SQL Editor (safe, all additive)
-- Date: 2026-06-19
-- ============================================================

-- 1. Add country/state/calendar fields to School
ALTER TABLE "School"
  ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS "state" TEXT,
  ADD COLUMN IF NOT EXISTS "saturdayPolicy" TEXT DEFAULT 'ALL_OFF',
  ADD COLUMN IF NOT EXISTS "academicYearStart" INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS "academicYearEnd" INTEGER DEFAULT 3;

-- 2. Add late threshold to AttendancePolicy (default 555 = 9:15 AM)
ALTER TABLE "AttendancePolicy"
  ADD COLUMN IF NOT EXISTS "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 555;

-- Create index on AttendancePolicy (schoolId, branchId)
CREATE INDEX IF NOT EXISTS "AttendancePolicy_schoolId_branchId_idx"
  ON "AttendancePolicy"("schoolId", "branchId");

-- 3. Add payroll lock fields to PayrollRun
ALTER TABLE "PayrollRun"
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "unlockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "unlockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "unlockReason" TEXT,
  ADD COLUMN IF NOT EXISTS "workingDaysOverride" INTEGER,
  ADD COLUMN IF NOT EXISTS "workingDaysOverrideReason" TEXT;

-- 4. Add unique constraint to StaffAttendance (one record per staff per day)
CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendance_staffId_date_key"
  ON "StaffAttendance"("staffId", "date");

CREATE INDEX IF NOT EXISTS "StaffAttendance_schoolId_date_idx"
  ON "StaffAttendance"("schoolId", "date");

-- 5. Add unique constraint to StudentAttendance (one record per student per day per session)
CREATE UNIQUE INDEX IF NOT EXISTS "StudentAttendance_studentId_date_session_key"
  ON "StudentAttendance"("studentId", "date", "session");

-- 6. Create SchoolCalendar table
CREATE TABLE IF NOT EXISTS "SchoolCalendar" (
  "id"         TEXT NOT NULL,
  "schoolId"   TEXT NOT NULL,
  "branchId"   TEXT,
  "date"       TIMESTAMP(3) NOT NULL,
  "type"       TEXT NOT NULL,
  "reason"     TEXT NOT NULL,
  "source"     TEXT NOT NULL DEFAULT 'SCHOOL',
  "isOverride" BOOLEAN NOT NULL DEFAULT false,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchoolCalendar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SchoolCalendar_schoolId_date_key"
  ON "SchoolCalendar"("schoolId", "date");

CREATE INDEX IF NOT EXISTS "SchoolCalendar_schoolId_date_idx"
  ON "SchoolCalendar"("schoolId", "date");

CREATE INDEX IF NOT EXISTS "SchoolCalendar_schoolId_type_idx"
  ON "SchoolCalendar"("schoolId", "type");

ALTER TABLE "SchoolCalendar"
  ADD CONSTRAINT "SchoolCalendar_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchoolCalendar"
  ADD CONSTRAINT "SchoolCalendar_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Create PublicHolidayMaster table
CREATE TABLE IF NOT EXISTS "PublicHolidayMaster" (
  "id"        TEXT NOT NULL,
  "country"   TEXT NOT NULL DEFAULT 'India',
  "state"     TEXT,
  "year"      INTEGER NOT NULL,
  "date"      TIMESTAMP(3) NOT NULL,
  "name"      TEXT NOT NULL,
  "type"      TEXT NOT NULL DEFAULT 'PUBLIC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PublicHolidayMaster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublicHolidayMaster_country_state_year_date_key"
  ON "PublicHolidayMaster"("country", "state", "year", "date");

CREATE INDEX IF NOT EXISTS "PublicHolidayMaster_country_state_year_idx"
  ON "PublicHolidayMaster"("country", "state", "year");

-- 8. Create BiometricDevice table (fingerprint reader registry)
CREATE TABLE IF NOT EXISTS "BiometricDevice" (
  "id"          TEXT NOT NULL,
  "schoolId"    TEXT NOT NULL,
  "branchId"    TEXT NOT NULL,
  "deviceCode"  TEXT NOT NULL,
  "deviceName"  TEXT NOT NULL,
  "model"       TEXT,
  "location"    TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "lastPingAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BiometricDevice_deviceCode_key"
  ON "BiometricDevice"("deviceCode");

CREATE INDEX IF NOT EXISTS "BiometricDevice_schoolId_branchId_idx"
  ON "BiometricDevice"("schoolId", "branchId");

ALTER TABLE "BiometricDevice"
  ADD CONSTRAINT "BiometricDevice_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BiometricDevice"
  ADD CONSTRAINT "BiometricDevice_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- DONE. All changes are additive — zero data loss.
-- ============================================================
