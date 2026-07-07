-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "TransportSettings" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "approachRadius" INTEGER NOT NULL DEFAULT 1000,
    "gpsInterval" INTEGER NOT NULL DEFAULT 5,
    "gpsAccuracyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "maxSpeedLimit" DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    "heartbeatTimeout" INTEGER NOT NULL DEFAULT 5,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "simulatorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationJob" (
    "id" TEXT NOT NULL,
    "tripSessionId" TEXT NOT NULL,
    "status" "SimulationStatus" NOT NULL,
    "currentPolylineIndex" INTEGER NOT NULL DEFAULT 0,
    "lastExecutedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "SimulationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationStatusLog" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "NotificationStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransportSettings_schoolId_key" ON "TransportSettings"("schoolId");

-- CreateIndex
CREATE INDEX "TransportSettings_schoolId_idx" ON "TransportSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationJob_tripSessionId_key" ON "SimulationJob"("tripSessionId");

-- CreateIndex
CREATE INDEX "SimulationJob_schoolId_idx" ON "SimulationJob"("schoolId");

-- CreateIndex
CREATE INDEX "NotificationStatusLog_notificationId_idx" ON "NotificationStatusLog"("notificationId");

-- AddForeignKey
ALTER TABLE "TransportSettings" ADD CONSTRAINT "TransportSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationJob" ADD CONSTRAINT "SimulationJob_tripSessionId_fkey" FOREIGN KEY ("tripSessionId") REFERENCES "TripSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationStatusLog" ADD CONSTRAINT "NotificationStatusLog_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "TransportNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
