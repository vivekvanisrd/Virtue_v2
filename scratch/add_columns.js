const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function run() {
  try {
    console.log("Running SQL to add columns to fee_payment_links...");
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.fee_payment_links ADD COLUMN IF NOT EXISTS payment_method TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.fee_payment_links ADD COLUMN IF NOT EXISTS payment_details TEXT;
    `);
    console.log("Columns added successfully!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
