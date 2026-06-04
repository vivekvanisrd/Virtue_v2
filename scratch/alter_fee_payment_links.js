const { PrismaClient } = require("@prisma/client");

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:VivekeVani%40369@db.bmyhbgwyirvjeadpvwny.supabase.co:5432/postgres";

async function main() {
  console.log("📡 Connecting to Supabase database...");
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    console.log("Adding school_id and branch_id to fee_payment_links table...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE fee_payment_links 
      ADD COLUMN IF NOT EXISTS school_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255);
    `);
    console.log("✅ Columns added successfully!");
  } catch (err) {
    console.error("❌ Alter table failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
