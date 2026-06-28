const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// fallback to .env if .env.local doesn't have DATABASE_URL
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ ERROR: DATABASE_URL is not defined in .env or .env.local");
    process.exit(1);
  }

  // Ensure backups directory exists
  const backupsDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const outputFile = path.join(backupsDir, `db-backup-${timestamp}.sql`);

  console.log("📡 Connecting to remote database to pull backup...");
  console.log(`📂 Output file: ${outputFile}`);

  // Find pg_dump executable
  let pgDumpPath = 'pg_dump'; // default to PATH

  // If on Windows, check common installation paths
  if (process.platform === 'win32') {
    const commonPaths = [
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\13\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\12\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    ];
    
    // Check if pg_dump is available in PATH first
    const inPath = await checkInPath('pg_dump');
    if (!inPath) {
      const foundPath = commonPaths.find(p => fs.existsSync(p));
      if (foundPath) {
        pgDumpPath = foundPath;
        console.log(`🔧 Found pg_dump at: ${pgDumpPath}`);
      } else {
        console.warn("⚠️ WARNING: pg_dump was not found in PATH or standard PostgreSQL installation paths.");
        console.warn("Please make sure PostgreSQL is installed and pg_dump is in your PATH.");
      }
    }
  }

  // Run pg_dump
  // We use standard schema and data backup (plain text SQL)
  const args = [
    '-d', dbUrl,
    '--no-owner',
    '--no-acl',
    '-f', outputFile
  ];

  console.log(`🚀 Executing pg_dump backup...`);
  const child = spawn(pgDumpPath, args, { stdio: 'inherit' });

  child.on('close', (code) => {
    if (code === 0) {
      console.log(`\n✅ DATABASE BACKUP SUCCESSFUL!`);
      console.log(`Saved to: ${outputFile}`);
    } else {
      console.error(`\n❌ Backup failed with exit code ${code}`);
      process.exit(code);
    }
  });

  child.on('error', (err) => {
    console.error(`❌ Failed to start pg_dump process:`, err.message);
    process.exit(1);
  });
}

function checkInPath(cmd) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const checkCmd = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    exec(checkCmd, (err) => {
      resolve(!err);
    });
  });
}

main().catch(console.error);
