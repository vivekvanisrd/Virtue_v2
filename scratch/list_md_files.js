const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          getFiles(fullPath, files);
        }
      } else if (file.endsWith('.md')) {
        files.push({ path: fullPath, mtime: stat.mtime });
      }
    } catch (e) {}
  }
  return files;
}

const today = new Date();
today.setHours(0,0,0,0);

const dirs = [
  'j:\\virtue_fb\\virtue-v2',
  'C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain\\21130d0a-19b8-446a-b187-443825e71f13'
];

let allMd = [];
for (const dir of dirs) {
  allMd = allMd.concat(getFiles(dir));
}

// Filter files modified today (June 13, 2026 local time)
// Let's filter files whose mtime is >= today
const todayMd = allMd.filter(f => f.mtime >= today);

todayMd.sort((a, b) => b.mtime - a.mtime);

console.log('--- ALL MD FILES MODIFIED TODAY ---');
todayMd.forEach(f => {
  console.log(`${f.path} (Modified: ${f.mtime.toISOString()})`);
});
