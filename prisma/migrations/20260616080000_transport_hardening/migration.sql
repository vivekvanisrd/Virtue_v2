-- AlterTable (with DEFAULT for compatibility with existing rows)
ALTER TABLE "VehicleIncident" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "VehicleMaintenance" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop standard unique constraint on StudentTransport(studentId) if it exists
ALTER TABLE "StudentTransport" DROP CONSTRAINT IF EXISTS "StudentTransport_studentId_key";
DROP INDEX IF EXISTS "StudentTransport_studentId_key";

-- Create partial unique index to allow one active student transport allocation, but multiple soft-deleted ones
CREATE UNIQUE INDEX "StudentTransport_studentId_key" ON "StudentTransport" ("studentId") WHERE "status" = 'Active' AND "isDeleted" = false;

-- Create partial unique indexes for active driver assignments
CREATE UNIQUE INDEX IF NOT EXISTS "DriverAssignment_active_vehicle_idx" ON "DriverAssignment" ("vehicleId") WHERE "status" = 'Active' AND "isDeleted" = false;
CREATE UNIQUE INDEX IF NOT EXISTS "DriverAssignment_active_driver_idx" ON "DriverAssignment" ("driverId") WHERE "status" = 'Active' AND "isDeleted" = false;
