-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "admissionWaiver" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "isTransportRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedRouteId" TEXT,
ADD COLUMN     "requestedStopId" TEXT,
ADD COLUMN     "scholarshipAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "scholarshipReason" TEXT,
ADD COLUMN     "tuitionDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "waiverReason" TEXT;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_requestedRouteId_fkey" FOREIGN KEY ("requestedRouteId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_requestedStopId_fkey" FOREIGN KEY ("requestedStopId") REFERENCES "VehicleStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
