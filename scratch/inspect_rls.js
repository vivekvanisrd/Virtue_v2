const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== RLS POLICIES ===");
    const policies = await prisma.$queryRaw`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies
    `;
    console.log(JSON.stringify(policies, null, 2));

    console.log("\n=== TABLES WITH RLS ENABLED ===");
    const rlsTables = await prisma.$queryRaw`
      SELECT relname, relrowsecurity 
      FROM pg_class 
      JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace 
      WHERE nspname = 'public' AND relrowsecurity = true
    `;
    console.log(JSON.stringify(rlsTables, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
