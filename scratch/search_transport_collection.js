const fs = require('fs');
const path = require('path');

function searchFiles(dir, text, results = []) {
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
          searchFiles(fullPath, text, results);
        }
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(text)) {
          results.push(fullPath);
        }
      }
    } catch (e) {}
  }
  return results;
}

const results = searchFiles('src', 'TransportCollection');
console.log('--- REFERENCES TO TransportCollection ---');
results.forEach(r => console.log(r));
