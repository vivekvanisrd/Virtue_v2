import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔍 [DB_DIAGNOSTIC] Retrieving active PostgreSQL activity...");
  const activity: any = await prisma.$queryRawUnsafe(`
    SELECT pid, age(clock_timestamp(), query_start) as duration, state, query
    FROM pg_stat_activity
    WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
    ORDER BY duration DESC;
  `);
  console.log("Active Queries in DB:\n", JSON.stringify(activity, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
