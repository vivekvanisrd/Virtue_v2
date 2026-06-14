const fs = require('fs');
const content = fs.readFileSync('src/components/finance/FeeCollectionForm.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('sibling')) {
    matches.push({ line: idx + 1, text: line.trim() });
  }
});

console.log('--- Matches for sibling in FeeCollectionForm.tsx ---');
console.log(JSON.stringify(matches, null, 2));
