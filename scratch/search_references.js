const fs = require('fs');

const migrationPath = 'prisma/migrations/20201207184859_initial_migration/migration.sql';

if (fs.existsSync(migrationPath)) {
  const content = fs.readFileSync(migrationPath, 'utf8');
  const lines = content.split('\n');
  
  const tables = ['Route', 'Vehicle', 'VehicleStop'];
  
  tables.forEach(table => {
    console.log(`=== ALTER TABLE ${table} ===`);
    let active = false;
    lines.forEach((line, idx) => {
      if (line.includes(`ALTER TABLE "${table}"`)) {
        active = true;
      }
      if (active) {
        console.log(`${idx + 1}: ${line}`);
        if (line.trim() === '' || line.includes(';')) {
          active = false;
        }
      }
    });
  });
}



