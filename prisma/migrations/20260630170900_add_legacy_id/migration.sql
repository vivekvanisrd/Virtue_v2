-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "legacyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Student_legacyId_key" ON "Student"("legacyId");
