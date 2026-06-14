const fs = require('fs');
const content = fs.readFileSync('src/components/finance/StudentFinancialHub.tsx', 'utf8');

const lines = content.split('\n');
console.log('--- StudentFinancialHub.tsx Lines 430-480 ---');
for (let i = 430; i < 480; i++) {
  if (lines[i]) console.log(`${i + 1}: ${lines[i]}`);
}
