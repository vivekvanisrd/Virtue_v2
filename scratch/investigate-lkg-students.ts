import { prismaBypass } from "../src/lib/prisma";

async function main() {
  console.log("🔍 Fetching LKG class details...");
  const lkgClasses = await prismaBypass.class.findMany({
    where: { name: { equals: "LKG", mode: "insensitive" } }
  });
  console.log("LKG Classes found in database:");
  for (const c of lkgClasses) {
    console.log(`- Class ID: "${c.id}", Name: "${c.name}", SchoolId: "${c.schoolId}"`);
  }

  const lkgIds = lkgClasses.map(c => c.id);

  console.log("\n🔍 Querying ALL students with classId in LKG...");
  const allLkgStudents = await prismaBypass.student.findMany({
    where: {
      academic: {
        classId: { in: lkgIds }
      }
    },
    include: {
      academic: true
    }
  });

  console.log(`Found ${allLkgStudents.length} total students assigned to LKG in the database:`);
  for (const s of allLkgStudents) {
    console.log(`- ID: "${s.id}", Name: "${s.firstName} ${s.lastName}", SchoolId: "${s.schoolId}", AcademicYear: "${s.academic?.academicYear}", Status: "${s.status}"`);
  }

  console.log("\n🔍 Let's check current active Academic Year for VIVES school...");
  const currentAY = await prismaBypass.academicYear.findFirst({
    where: {
      schoolId: "VIVES",
      isCurrent: true
    }
  });
  console.log("Current active Academic Year in VIVES:", currentAY ? JSON.stringify(currentAY) : "None");
}

main().catch(console.error);
