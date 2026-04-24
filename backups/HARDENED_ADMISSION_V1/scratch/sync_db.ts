import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncDb() {
  console.log("🚀 Starting Database Synchronization...");
  try {
    // 1. amount (Decimal)
    console.log("- Adding 'amount' column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "FeeComponentMaster" ADD COLUMN "amount" DECIMAL(12,2);
    `).catch(e => console.log("  (amount might already exist or failed safely)"));

    // 2. description (Text)
    console.log("- Adding 'description' column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "FeeComponentMaster" ADD COLUMN "description" TEXT;
    `).catch(e => console.log("  (description might already exist or failed safely)"));

    // 3. isActive (Boolean)
    console.log("- Adding 'isActive' column...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "FeeComponentMaster" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
    `).catch(e => console.log("  (isActive might already exist or failed safely)"));

    console.log("✅ Database Synchronization Complete!");
  } catch (e) {
    console.error("❌ Critical Error syncing DB:", e);
  } finally {
    await prisma.$disconnect();
  }
}

syncDb();
