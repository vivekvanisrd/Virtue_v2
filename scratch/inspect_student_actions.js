const fs = require('fs');
const code = fs.readFileSync('src/lib/actions/student-actions.ts', 'utf8');

// Find all export async function declarations
const regex = /export\s+async\s+function\s+(\w+)/g;
let match;
console.log('--- FUNCTIONS IN STUDENT ACTIONS ---');
while ((match = regex.exec(code)) !== null) {
  console.log(match[1]);
}
