import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  console.log("📡 [DB_SETUP] Connecting to database to enable pgvector...");
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
  console.log("✅ [DB_SETUP] pgvector extension successfully enabled!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
