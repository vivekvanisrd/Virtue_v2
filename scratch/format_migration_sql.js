const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'prisma', 'migrations', 'migration_diff.sql');
const destDir = path.join(__dirname, '..', 'prisma', 'migrations', '20260615190000_init_transport_v2');
const destPath = path.join(destDir, 'migration.sql');

try {
  console.log('Reading migration_diff.sql (UTF-16LE)...');
  let content = fs.readFileSync(srcPath, 'utf16le');
  
  // Strip BOM if present
  if (content.charCodeAt(0) === 0xFEFF || content.startsWith('\uFEFF')) {
    console.log('BOM detected! Stripping BOM...');
    content = content.substring(1);
  }
  
  // Clean up any other weird carriage returns if needed
  content = content.trim();

  console.log('Creating directory:', destDir);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  console.log('Writing clean UTF-8 migration.sql...');
  fs.writeFileSync(destPath, content, 'utf8');
  console.log('Migration file created successfully at:', destPath);

  console.log('Cleaning up temporary migration_diff.sql...');
  fs.unlinkSync(srcPath);
  console.log('Done!');
} catch (e) {
  console.error('Error:', e.message);
}
