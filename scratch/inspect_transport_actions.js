const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/transport-actions.ts', 'utf8');

const regex = /export\s+async\s+function\s+(\w+)/g;
let match;
console.log('--- FUNCTIONS IN TRANSPORT ACTIONS ---');
while ((match = regex.exec(code)) !== null) {
  console.log(match[1]);
}
