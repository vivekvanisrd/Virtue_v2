const { PrismaClient } = require("@prisma/client");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function main() {
  console.log("--- DATABASE LATENCY BENCHMARK ---");
  console.log(`Connecting to: ${process.env.DATABASE_URL}`);
  
  const start = Date.now();
  await prisma.$connect();
  const connectTime = Date.now() - start;
  console.log(`🔌 Connection handshake took: ${connectTime}ms`);

  const queryStart = Date.now();
  const count = await prisma.school.count();
  const queryTime = Date.now() - queryStart;
  console.log(`📊 Simple count query took: ${queryTime}ms`);
  console.log(`Total schools: ${count}`);

  const parallelStart = Date.now();
  await Promise.all([
    prisma.school.findFirst(),
    prisma.branch.findMany({ take: 5 }),
    prisma.academicYear.findFirst()
  ]);
  const parallelTime = Date.now() - parallelStart;
  console.log(`⚡ Parallel vitals fetch took: ${parallelTime}ms`);

  console.log("----------------------------------");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
