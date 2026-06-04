const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/SriKriations/.gemini/antigravity/brain/31a3a905-7369-4150-9648-115f020732c8';
const files = fs.readdirSync(dir)
  .map(f => {
    const stats = fs.statSync(path.join(dir, f));
    return { name: f, mtime: stats.mtime, size: stats.size };
  })
  .sort((a, b) => b.mtime - a.mtime);

console.log("Files sorted by modification time (newest first):");
for (const f of files.slice(0, 15)) {
  console.log(`${f.name} | ${f.mtime.toISOString()} | ${f.size} bytes`);
}
