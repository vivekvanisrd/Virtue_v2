const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      branches: true
    }
  });

  console.log("\n🏫 VIRTUE V2: SCHOOL & BRANCH REGISTRY\n");

  schools.forEach(school => {
    console.log(`[SCHOOL] ID: ${school.id} | Name: ${school.name}`);
    console.log("------------------------------------------------------------------");
    if (school.branches.length === 0) {
      console.log("  ⚠️ No branches registered.");
    } else {
      school.branches.forEach(branch => {
        console.log(`  └─ [BRANCH] ID: ${branch.id.padEnd(12)} | Code: ${branch.code.padEnd(6)} | Name: ${branch.name}`);
      });
    }
    console.log("\n");
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
