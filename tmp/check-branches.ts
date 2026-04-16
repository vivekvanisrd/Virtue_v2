import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const branches = await prisma.branch.findMany({
      select: { code: true, name: true }
    });
    console.log("--- START BRANCHES ---");
    console.log(JSON.stringify(branches, null, 2));
    console.log("--- END BRANCHES ---");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
