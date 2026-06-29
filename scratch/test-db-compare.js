const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pooledUrl = "postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const directUrl = "postgresql://postgres.bmyhbgwyirvjeadpvwny:VivekeVani%40369@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";

async function runTest(url, label) {
  console.log(`\n--- BENCHMARK FOR: ${label} ---`);
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });

  try {
    const start = Date.now();
    await prisma.$connect();
    const connectTime = Date.now() - start;
    console.log(`🔌 Connect took: ${connectTime}ms`);

    const queryStart = Date.now();
    const count = await prisma.school.count();
    const queryTime = Date.now() - queryStart;
    console.log(`📊 Single query took: ${queryTime}ms`);

    const parallelStart = Date.now();
    await Promise.all([
      prisma.school.findFirst(),
      prisma.branch.findMany({ take: 5 }),
      prisma.academicYear.findFirst()
    ]);
    const parallelTime = Date.now() - parallelStart;
    console.log(`⚡ Parallel vitals fetch took: ${parallelTime}ms`);
  } catch (err) {
    console.error("❌ Error during test:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await runTest(pooledUrl, "POOLED (Port 6543)");
  await runTest(directUrl, "DIRECT (Port 5432)");
}

main();
