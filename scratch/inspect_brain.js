const fs = require('fs');
const path = require('path');

const brainDirs = [
  'C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain',
  'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain'
];

brainDirs.forEach(dir => {
  console.log(`\nChecking directory: ${dir}`);
  if (!fs.existsSync(dir)) {
    console.log("Directory does not exist.");
    return;
  }
  try {
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      const fullPath = path.join(dir, f);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const transcriptPath = path.join(fullPath, '.system_generated', 'logs', 'transcript.jsonl');
          if (fs.existsSync(transcriptPath)) {
            const transcriptStat = fs.statSync(transcriptPath);
            console.log(`Directory: ${f} | Modified: ${transcriptStat.mtime.toISOString()} | Size: ${transcriptStat.size}`);
          }
        }
      } catch (err) {
        console.log(`  Error stating ${f}:`, err.message);
      }
    });
  } catch (err) {
    console.log("Error reading directory:", err.message);
  }
});
