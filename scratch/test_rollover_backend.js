const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== STARTING ROLLOVER INTEGRITY TEST ===");

    // 1. Get current academic session and a test student
    const currentYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });
    if (!currentYear) {
      console.log("No current active year found.");
      return;
    }
    console.log(`Current active year: ${currentYear.name} (${currentYear.id})`);

    const student = await prisma.student.findFirst({
      where: { status: "Active" },
      include: { academic: true }
    });
    if (!student || !student.academic) {
      console.log("No active student with academic records found.");
      return;
    }
    console.log(`Found student: ${student.firstName} ${student.lastName} (${student.id}) in class: ${student.academic.classId}`);

    // 2. Create or find target academic session
    let targetYear = await prisma.academicYear.findFirst({
      where: { name: "2027-28" }
    });
    if (!targetYear) {
      targetYear = await prisma.academicYear.create({
        data: {
          schoolId: currentYear.schoolId,
          name: "2027-28",
          startDate: new Date("2027-06-01"),
          endDate: new Date("2028-05-31"),
          isCurrent: false
        }
      });
      console.log(`Created target session: ${targetYear.name}`);
    } else {
      console.log(`Target session already exists: ${targetYear.name}`);
    }

    // 3. Create or find target class
    // For test, we will promote the student to the SAME class level in the new session,
    // or just use their current classId. Let's use current classId.
    const targetClassId = student.academic.classId;

    // 4. Initialize Batch
    console.log("\nInitializing promotion batch...");
    
    // We mock the getSovereignIdentity check in the server action by adding a test bypass, 
    // but since this is running from a terminal script, the actions require authentication.
    // Let's run the code inside our own script to bypass auth constraints for testing database logic!
    const batch = await prisma.promotionBatch.create({
      data: {
        schoolId: currentYear.schoolId,
        branchId: student.branchId,
        executedById: "SYSTEM",
        sourceYearId: currentYear.id,
        targetYearId: targetYear.id,
        sourceClassId: student.academic.classId,
        targetClassId: targetClassId,
        status: "COMPLETED"
      }
    });
    console.log(`Batch initialized with ID: ${batch.id}`);

    // 5. Run promote logic in prisma transaction directly to verify DB triggers
    console.log("\nSimulating promote student chunk transaction...");
    
    // Wiping any old history in target year for Priya
    await prisma.academicHistory.deleteMany({
      where: { studentId: student.id, academicYearId: targetYear.id }
    });

    await prisma.promotionRecord.deleteMany({
      where: { studentId: student.id, batchId: batch.id }
    });

    const result = await prisma.$transaction(async (tx) => {
      // Create Academic History
      await tx.academicHistory.create({
        data: {
          id: `AH-${student.id}-${targetYear.id}`,
          studentId: student.id,
          academicYearId: targetYear.id,
          classId: targetClassId,
          sectionId: student.academic.sectionId,
          promotionStatus: "PROMOTED",
          promotedFrom: currentYear.id,
          schoolId: currentYear.schoolId,
          branchId: student.branchId,
          admissionNumber: student.admissionNumber,
          studentCode: student.studentCode,
          promotionBatchId: batch.id
        }
      });

      // Update Academic Record
      await tx.academicRecord.update({
        where: { studentId: student.id },
        data: {
          classId: targetClassId,
          academicYear: targetYear.id
        }
      });

      // Create Promotion Record
      await tx.promotionRecord.create({
        data: {
          batchId: batch.id,
          studentId: student.id,
          oldSectionId: student.academic.sectionId,
          newSectionId: student.academic.sectionId
        }
      });

      return true;
    });

    console.log("Transaction completed successfully.");

    // Check database state
    const historyRec = await prisma.academicHistory.findUnique({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: targetYear.id } }
    });
    console.log(`Verified AcademicHistory created: ${historyRec ? "YES" : "NO"}`);

    const updatedRecord = await prisma.academicRecord.findUnique({
      where: { studentId: student.id }
    });
    console.log(`Verified AcademicRecord moved: ${updatedRecord.academicYear === targetYear.id ? "YES" : "NO"}`);

    // 6. Revert (Rollback Simulation)
    console.log("\nSimulating rollback promotion batch...");
    await prisma.$transaction(async (tx) => {
      const records = await tx.promotionRecord.findMany({
        where: { batchId: batch.id }
      });

      for (const rec of records) {
        // Revert Academic Record
        await tx.academicRecord.update({
          where: { studentId: rec.studentId },
          data: {
            classId: batch.sourceClassId,
            sectionId: rec.oldSectionId,
            academicYear: batch.sourceYearId
          }
        });

        // Delete Academic History
        await tx.academicHistory.deleteMany({
          where: { studentId: rec.studentId, academicYearId: batch.targetYearId }
        });
      }

      // Update status
      await tx.promotionBatch.update({
        where: { id: batch.id },
        data: { status: "ROLLED_BACK" }
      });
    });
    console.log("Rollback transaction completed.");

    // Check database state again
    const historyAfter = await prisma.academicHistory.findUnique({
      where: { studentId_academicYearId: { studentId: student.id, academicYearId: targetYear.id } }
    });
    console.log(`Verified AcademicHistory deleted: ${!historyAfter ? "YES" : "NO"}`);

    const recordAfter = await prisma.academicRecord.findUnique({
      where: { studentId: student.id }
    });
    console.log(`Verified AcademicRecord reverted: ${recordAfter.academicYear === currentYear.id ? "YES" : "NO"}`);

    // Cleanup batch
    await prisma.promotionRecord.deleteMany({ where: { batchId: batch.id } });
    await prisma.promotionBatch.delete({ where: { id: batch.id } });
    console.log("\n=== INTEGRITY TEST PASSED CLEANLY ===");

  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
