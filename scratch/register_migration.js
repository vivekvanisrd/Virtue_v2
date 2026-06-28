const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const migrationName = '20260616060000_add_transport_documents';
    const migrationPath = `prisma/migrations/${migrationName}/migration.sql`;
    
    if (!fs.existsSync(migrationPath)) {
      console.error("Migration file not found!");
      return;
    }

    const content = fs.readFileSync(migrationPath, 'utf8');
    const sha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    console.log("Calculated SHA256 checksum:", sha256);

    // Check if migration already exists in db
    const existing = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${migrationName}
    `;
    
    if (existing.length > 0) {
      console.log("Migration is already registered in the database.");
      return;
    }

    console.log("Registering migration in _prisma_migrations table...");
    const uuid = crypto.randomUUID();
    const now = new Date();
    
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (
        "id", 
        "checksum", 
        "finished_at", 
        "migration_name", 
        "logs", 
        "rolled_back_at", 
        "started_at", 
        "applied_steps_count"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, uuid, sha256, now, migrationName, null, null, now, 1);
    
    console.log("Migration registered successfully!");
  } catch (err) {
    console.error("Error registering migration:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
