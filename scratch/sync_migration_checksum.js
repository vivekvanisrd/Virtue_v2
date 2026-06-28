const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const migrationPath = 'prisma/migrations/20201207184859_initial_migration/migration.sql';
    if (!fs.existsSync(migrationPath)) {
      console.error("Migration file not found!");
      return;
    }

    const content = fs.readFileSync(migrationPath, 'utf8');
    
    // Prisma calculates SHA256 of the migration.sql file content
    const sha256 = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    console.log("Calculated SHA256 checksum of local migration.sql:", sha256);

    // Fetch existing migration from database
    const dbMigration = await prisma.$queryRaw`
      SELECT migration_name, checksum 
      FROM _prisma_migrations 
      WHERE migration_name = '20201207184859_initial_migration'
    `;
    console.log("Current DB migration entry:", dbMigration);

    if (dbMigration.length === 0) {
      console.error("Migration entry not found in database!");
      return;
    }

    const dbChecksum = dbMigration[0].checksum;
    if (dbChecksum === sha256) {
      console.log("Checksums already match! No update needed.");
    } else {
      console.log(`Updating checksum from '${dbChecksum}' to '${sha256}'...`);
      const updated = await prisma.$executeRaw`
        UPDATE _prisma_migrations 
        SET checksum = ${sha256} 
        WHERE migration_name = '20201207184859_initial_migration'
      `;
      console.log("Update result:", updated);
    }
  } catch (err) {
    console.error("Error updating checksum:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
