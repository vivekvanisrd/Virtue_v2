const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma', 'migrations', '20201207184859_initial_migration', 'migration.sql');

try {
  console.log('Reading migration file...');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.charCodeAt(0) === 0xFEFF || content.startsWith('\uFEFF')) {
    console.log('BOM detected! Stripping BOM...');
    content = content.substring(1);
  } else {
    console.log('No BOM detected at char index 0.');
  }
  
  console.log('Writing migration file back as UTF-8 without BOM...');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully stripped BOM!');
} catch (e) {
  console.error('Error during conversion:', e.message);
}
