-- CreateIndex
CREATE INDEX "CreditNote_schoolId_studentId_idx" ON "CreditNote"("schoolId", "studentId");

-- CreateIndex
CREATE INDEX "ExamResult_schoolId_studentId_examTypeId_idx" ON "ExamResult"("schoolId", "studentId", "examTypeId");
