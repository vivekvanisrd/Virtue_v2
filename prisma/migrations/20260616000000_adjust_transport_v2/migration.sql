-- AlterTable
ALTER TABLE "VehicleGPSLog" ALTER COLUMN "branchId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Driver_branchId_idx" ON "Driver"("branchId");

-- CreateIndex
CREATE INDEX "DriverAssignment_branchId_idx" ON "DriverAssignment"("branchId");

-- CreateIndex
CREATE INDEX "StudentTransport_branchId_idx" ON "StudentTransport"("branchId");

-- CreateIndex
CREATE INDEX "TripSession_branchId_idx" ON "TripSession"("branchId");

-- CreateIndex
CREATE INDEX "VehicleGPSLive_schoolId_idx" ON "VehicleGPSLive"("schoolId");

-- CreateIndex
CREATE INDEX "VehicleGPSLive_branchId_idx" ON "VehicleGPSLive"("branchId");

-- CreateIndex
CREATE INDEX "VehicleGPSLog_branchId_idx" ON "VehicleGPSLog"("branchId");

-- CreateIndex
CREATE INDEX "BusAttendance_branchId_idx" ON "BusAttendance"("branchId");

-- CreateIndex
CREATE INDEX "VehicleIncident_branchId_idx" ON "VehicleIncident"("branchId");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_branchId_idx" ON "VehicleMaintenance"("branchId");

-- CreateIndex
CREATE INDEX "RoutePolyline_schoolId_idx" ON "RoutePolyline"("schoolId");

-- CreateIndex
CREATE INDEX "RoutePolyline_branchId_idx" ON "RoutePolyline"("branchId");

-- CreateIndex
CREATE INDEX "TransportNotification_branchId_idx" ON "TransportNotification"("branchId");
