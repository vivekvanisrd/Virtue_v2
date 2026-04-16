import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.$queryRawUnsafe('SELECT migration_name, checksum, finished_at FROM _prisma_migrations');
  console.log(JSON.stringify(m, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
