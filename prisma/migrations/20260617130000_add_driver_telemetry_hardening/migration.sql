-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BREAKDOWN', 'ACCIDENT', 'DELAY', 'ROUTE_DEVIATION', 'GPS_SPOOFING', 'OVERSPEED', 'UNAUTHORIZED_DRIVER', 'VEHICLE_OFFLINE');

-- AlterTable
ALTER TABLE "TripSession" ADD COLUMN     "tripHeartbeatAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VehicleGPSLive" ADD COLUMN     "clientTimestamp" TIMESTAMP(3),
ADD COLUMN     "sequenceNo" INTEGER,
ADD COLUMN     "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VehicleGPSLog" ADD COLUMN     "clientTimestamp" TIMESTAMP(3),
ADD COLUMN     "sequenceNo" INTEGER,
ADD COLUMN     "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VehicleIncident" ADD COLUMN     "incidentType" "IncidentType",
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "VehicleMaintenance" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "DriverDeviceLog" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutTime" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "DriverDeviceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLoginAudit" (
    "id" TEXT NOT NULL,
    "driverId" TEXT,
    "phone" TEXT,
    "licenseNo" TEXT,
    "event" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "schoolId" TEXT,
    "branchId" TEXT,

    CONSTRAINT "DriverLoginAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverRefreshSession" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "deviceId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "DriverRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriverDeviceLog_driverId_idx" ON "DriverDeviceLog"("driverId");

-- CreateIndex
CREATE INDEX "DriverDeviceLog_schoolId_idx" ON "DriverDeviceLog"("schoolId");

-- CreateIndex
CREATE INDEX "DriverDeviceLog_branchId_idx" ON "DriverDeviceLog"("branchId");

-- CreateIndex
CREATE INDEX "DriverLoginAudit_driverId_idx" ON "DriverLoginAudit"("driverId");

-- CreateIndex
CREATE INDEX "DriverLoginAudit_schoolId_idx" ON "DriverLoginAudit"("schoolId");

-- CreateIndex
CREATE INDEX "DriverLoginAudit_branchId_idx" ON "DriverLoginAudit"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverRefreshSession_tokenId_key" ON "DriverRefreshSession"("tokenId");

-- CreateIndex
CREATE INDEX "DriverRefreshSession_driverId_idx" ON "DriverRefreshSession"("driverId");

-- CreateIndex
CREATE INDEX "DriverRefreshSession_tokenId_idx" ON "DriverRefreshSession"("tokenId");

-- CreateIndex
CREATE INDEX "DriverRefreshSession_schoolId_idx" ON "DriverRefreshSession"("schoolId");

-- AddForeignKey
ALTER TABLE "DriverDeviceLog" ADD CONSTRAINT "DriverDeviceLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverDeviceLog" ADD CONSTRAINT "DriverDeviceLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLoginAudit" ADD CONSTRAINT "DriverLoginAudit_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLoginAudit" ADD CONSTRAINT "DriverLoginAudit_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverRefreshSession" ADD CONSTRAINT "DriverRefreshSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverRefreshSession" ADD CONSTRAINT "DriverRefreshSession_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
