import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const studentId = "abc8d68a-541d-4c40-abf3-d7f32710ab84";
  console.log("⏱️  [RAW_SQL] Running raw PostgreSQL join timing test...");
  
  const t0 = Date.now();
  const res: any = await prisma.$queryRawUnsafe(`
    SELECT s.id, s."firstName", f.id as "financialId", sfc.id as "componentId"
    FROM "Student" s
    LEFT JOIN "FinancialRecord" f ON s.id = f."studentId"
    LEFT JOIN "StudentFeeComponent" sfc ON f.id = sfc."studentFinancialId"
    WHERE s.id = $1;
  `, studentId);
  
  console.log(`⏱️  [RAW_SQL] Query took ${Date.now() - t0}ms. Rows returned: ${res.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
