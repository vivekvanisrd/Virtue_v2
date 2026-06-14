const fs = require('fs');
const content = fs.readFileSync('src/components/finance/StudentFinancialHub.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('sibling') || line.includes('findPotentialSiblings')) {
    matches.push({ line: idx + 1, text: line.trim() });
  }
});

console.log('--- Sibling Matches in StudentFinancialHub.tsx ---');
console.log(JSON.stringify(matches, null, 2));
