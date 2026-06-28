-- CreateTable
CREATE TABLE "TransportAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schoolId" TEXT NOT NULL,
    "branchId" TEXT,

    CONSTRAINT "TransportAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportAuditLog_schoolId_idx" ON "TransportAuditLog"("schoolId");

-- CreateIndex
CREATE INDEX "TransportAuditLog_branchId_idx" ON "TransportAuditLog"("branchId");
