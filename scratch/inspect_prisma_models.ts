import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const keys = Object.keys(prisma).filter(k => !k.startsWith("_") && !k.startsWith("$"));
  console.log("Prisma Model Keys:", keys);
}

main().catch(console.error).finally(() => prisma.$disconnect());
