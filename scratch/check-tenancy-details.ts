import { prismaBypass } from "../src/lib/prisma";

async function main() {
  console.log("🏫 Querying Schools in database...");
  const schools = await prismaBypass.school.findMany();
  for (const s of schools) {
    console.log(`- School ID: "${s.id}", Name: "${s.name}", Code: "${s.code}"`);
  }

  console.log("\n🏢 Querying Branches in database...");
  const branches = await prismaBypass.branch.findMany({
    include: { school: true }
  });
  for (const b of branches) {
    console.log(`- Branch ID: "${b.id}", Name: "${b.name}", Code: "${b.code}", SchoolId: "${b.schoolId}" (School Name: "${b.school?.name || "None"}")`);
  }
}

main().catch(console.error);
