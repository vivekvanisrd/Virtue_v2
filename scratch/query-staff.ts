import { prismaBypass } from "../src/lib/prisma";

async function main() {
  console.log("Checking Branches in DB...");
  const branches = await prismaBypass.branch.findMany({
    include: {
      school: true,
      _count: {
        select: { staff: true }
      }
    }
  });

  for (const b of branches) {
    console.log(`Branch: ${b.name} (ID: ${b.id}), School: ${b.school.name} (ID: ${b.school.id}), Staff Count: ${b._count.staff}`);
    
    if (b._count.staff > 0) {
      const staffList = await prismaBypass.staff.findMany({
        where: { branchId: b.id },
        take: 5
      });
      for (const s of staffList) {
        console.log(`  - Staff: ${s.firstName} ${s.lastName} (Status: ${s.status}, BiometricID: ${s.biometricId}, Code: ${s.staffCode})`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
