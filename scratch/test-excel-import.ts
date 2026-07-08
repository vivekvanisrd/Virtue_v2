import { PrismaClient } from "@prisma/client";
import { prismaBypass } from "../src/lib/prisma";
import { importStudentsAction } from "../src/lib/actions/student-import-actions";

const prisma = new PrismaClient();

async function main() {
  console.log("🧪 [TEST] Starting Student Excel Import engine integration tests...");

  // 1. Resolve institutional branch context and a valid class/academic year configuration
  const firstClass = await prismaBypass.class.findFirst();
  if (!firstClass) {
    console.error("❌ No classes found in the database. Please configure a class first.");
    return;
  }
  const schoolId = firstClass.schoolId;
  const branchId = firstClass.branchId || "GLOBAL";

  console.log(`- Resolved School context: ${schoolId}`);
  console.log(`- Using database Class: "${firstClass.name}" (Code: ${firstClass.code})`);

  // Clean old test student if any
  const testStudentCode = "STUD-TEST-IMP-99";
  const oldStudent = await prismaBypass.student.findFirst({
    where: { studentCode: testStudentCode }
  });
  if (oldStudent) {
    await prismaBypass.studentAcademicYear.deleteMany({ where: { studentId: oldStudent.id } });
    await prismaBypass.academicRecord.deleteMany({ where: { studentId: oldStudent.id } });
    await prismaBypass.studentGuardian.deleteMany({ where: { studentId: oldStudent.id } });
    await prismaBypass.address.deleteMany({ where: { studentId: oldStudent.id } });
    await prismaBypass.student.delete({ where: { id: oldStudent.id } });
  }

  // 2. Mock Admin Context to run the import action
  process.env.TEST_OVERRIDE_SOVEREIGN = "true";
  process.env.TEST_OVERRIDE_GUARDIAN = "false";
  process.env.TEST_SCHOOL_ID = schoolId;
  process.env.TEST_BRANCH_ID = branchId;
  process.env.TEST_STAFF_ID = "mock-admin-id";
  process.env.TEST_ROLE = "DEVELOPER";

  // 3. Define mock parsed excel rows
  const mockImportRows = [
    {
      studentCode: testStudentCode,
      firstName: "Aravind",
      lastName: "Rao",
      dateOfBirth: "2018-05-15",
      gender: "MALE",
      className: firstClass.name, // Map name to resolve class
      sectionName: "A",
      guardianFirstName: "Ravi",
      guardianLastName: "Rao",
      guardianPhone: "9900887766",
      guardianEmail: "ravi.rao@example.com",
      relationType: "FATHER",
      address: "456 Silicon Enclave, Tech City"
    }
  ];

  console.log("\n⚡ [STAFF] Triggering bulk excel import process...");
  const importRes = await importStudentsAction(mockImportRows);
  console.log("Import Result:", importRes);

  if (!importRes.success) {
    console.error("❌ Student import action failed.");
    return;
  }

  // 4. Assert and query database updates
  console.log("\n🔍 Verification: Checking database inserts...");
  const importedStudent = await prismaBypass.student.findFirst({
    where: { studentCode: testStudentCode },
    include: {
      academic: true,
      guardians: {
        include: { guardian: true }
      }
    }
  });

  if (!importedStudent) {
    console.error("❌ Imported student record not found in database.");
    return;
  }

  console.log("- Student resolved:", importedStudent.firstName, importedStudent.lastName);
  console.log("- Linked Class ID:", importedStudent.academic?.classId);
  console.log("- Guardians count linked:", importedStudent.guardians?.length);
  
  const link = importedStudent.guardians[0];
  if (link && link.guardian) {
    console.log(`- Linked Guardian: ${link.guardian.firstName} ${link.guardian.lastName || ""} (Relation: ${link.relationType})`);
    console.log(`- Guardian Phone & Email: ${link.guardian.phone} | ${link.guardian.email}`);
  }

  // Assert correct values
  if (
    importedStudent.firstName === "Aravind" && 
    importedStudent.bookId === testStudentCode &&
    importedStudent.guardians.length === 1 && 
    link.guardian.phone === "9900887766"
  ) {
    console.log("\n🎉 [STUDENT EXCEL IMPORT TESTS PASSED SUCCESSFULLY]");
  } else {
    console.error("\n❌ Failure: Data fields mismatch in database.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
