const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '.next');

if (fs.existsSync(nextDir)) {
  console.log('🧹 Found .next directory. Deleting cache to resolve Turbopack compilation mismatch...');
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('✅ Successfully cleared the .next directory.');
  } catch (error) {
    console.error('❌ Failed to delete .next directory:', error.message);
  }
} else {
  console.log('ℹ️ No .next directory found.');
}
