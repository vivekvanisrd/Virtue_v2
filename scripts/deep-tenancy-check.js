const { PrismaClient } = require('@prisma/client');
const { tenancyStorage } = require('../src/lib/auth/tenancy-context'); // Adjust path as needed

// Mocking the extension because we want to test exactly what's in the app
// We'll import the real prisma client which already has the extension
const prisma = require('../src/lib/prisma').default;

async function simulateForUser(staffName) {
  console.log(`\n--- Simulating for ${staffName} ---`);
  
  // 1. Get user data
  const staff = await prisma.staff.findFirst({
    where: { firstName: { contains: staffName, mode: 'insensitive' } }
  });

  if (!staff) {
    console.log(`User ${staffName} not found.`);
    return;
  }

  console.log(`User Context: schoolId=${staff.schoolId}, branchId=${staff.branchId}, role=${staff.role}`);

  // 2. Run the directory query inside the tenancy context
  const store = {
    schoolId: staff.schoolId,
    branchId: staff.branchId,
    role: staff.role
  };

  await tenancyStorage.run(store, async () => {
    const students = await prisma.student.findMany({
      where: {
        schoolId: staff.schoolId,
        AND: [
          staff.branchId ? { academic: { branchId: staff.branchId } } : {},
        ]
      },
      include: {
        academic: true
      }
    });

    console.log(`Result: Found ${students.length} students.`);
    if (students.length > 0) {
      console.log(`Sample Student: ${students[0].firstName} (Branch: ${students[0].academic?.branchId})`);
    }
  });
}

async function main() {
  await simulateForUser('virtuetest1');
  await simulateForUser('Vibhushree');
}

main().catch(console.error).finally(() => prisma.$disconnect());
