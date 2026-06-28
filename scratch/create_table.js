const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("Creating CommunicationLog table in Supabase...");
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CommunicationLog" (
        "id" TEXT NOT NULL,
        "schoolId" TEXT NOT NULL,
        "branchId" TEXT,
        "sender" TEXT NOT NULL,
        "recipient" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("✅ Table CommunicationLog created/verified!");

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CommunicationLog_schoolId_idx" ON "CommunicationLog"("schoolId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "CommunicationLog_branchId_idx" ON "CommunicationLog"("branchId");
    `);
    console.log("✅ Indexes created successfully!");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
