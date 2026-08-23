import { prismaBypass as prisma } from "../src/lib/prisma";

async function main() {
  const schools = await prisma.school.findMany({
    include: {
      branches: true,
      Class: true
    }
  });

  console.log("=== SCHOOLS & BRANCHES ===");
  for (const s of schools) {
    console.log(`School: ${s.name} (ID: ${s.id})`);
    console.log("  Branches:", s.branches.map(b => `${b.name} (ID: ${b.id}, Code: ${b.code})`));
    console.log("  Classes:", s.Class.map(c => `${c.name} (ID: ${c.id})`));
  }
}

main().catch(console.error);
