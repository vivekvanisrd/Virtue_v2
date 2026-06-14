const fs = require('fs');
const path = require('path');

const oldBrainDir = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e';

if (!fs.existsSync(oldBrainDir)) {
  console.log("Old brain directory does not exist");
  process.exit(1);
}

// List all files in the old brain directory
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walkDir(oldBrainDir);
console.log("Files found in old brain:");
files.forEach(f => console.log(" -", f));
