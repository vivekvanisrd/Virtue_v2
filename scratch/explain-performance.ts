import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 RUNNING QUERY PERFORMANCE REVIEW (EXPLAIN ANALYZE)...");

  // 1. Resolve school context
  const school = await prisma.school.findFirst();
  if (!school) {
    console.error("❌ Pre-requisite failed: No School found in database to run explain plans.");
    process.exit(1);
  }
  const schoolId = school.id;
  console.log(`📌 Target School ID context: "${schoolId}"\n`);

  const queries = [
    {
      name: "1. Routes Listing Query",
      sql: `EXPLAIN ANALYZE SELECT * FROM "Route" WHERE "schoolId" = '${schoolId}' AND "isDeleted" = false`
    },
    {
      name: "2. Vehicle Listing Query",
      sql: `EXPLAIN ANALYZE SELECT * FROM "Vehicle" WHERE "schoolId" = '${schoolId}' AND "isDeleted" = false`
    },
    {
      name: "3. Student Allocations Query",
      sql: `EXPLAIN ANALYZE SELECT * FROM "StudentTransport" WHERE "schoolId" = '${schoolId}' AND "isDeleted" = false`
    },
    {
      name: "4. Driver Assignments Query",
      sql: `EXPLAIN ANALYZE SELECT * FROM "DriverAssignment" WHERE "schoolId" = '${schoolId}' AND "isDeleted" = false`
    },
    {
      name: "5. Trip Sessions Query",
      sql: `EXPLAIN ANALYZE SELECT * FROM "TripSession" WHERE "schoolId" = '${schoolId}' AND "isDeleted" = false`
    }
  ];

  for (const q of queries) {
    console.log(`================================================================================`);
    console.log(`📋 Running Plan for: ${q.name}`);
    console.log(`   SQL: ${q.sql}\n`);

    try {
      const plan: any[] = await prisma.$queryRawUnsafe(q.sql);
      
      let indexUsed = false;
      plan.forEach((row: any) => {
        const line = row["QUERY PLAN"];
        console.log(line);
        if (line.includes("Index Scan") || line.includes("Index Only Scan") || line.includes("Bitmap Index Scan")) {
          indexUsed = true;
        }
      });

      console.log(`\n👉 Index Verification Result: ${indexUsed ? "✅ PASSED (Index Scan / Index Only Scan utilized)" : "⚠️ WARNING (Seq Scan or fallback used - check database stats)"}`);
      console.log(`================================================================================\n`);
    } catch (err: any) {
      console.error(`❌ Query Plan failed:`, err.message);
    }
  }

  await prisma.$disconnect();
}

main();
