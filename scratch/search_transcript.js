const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist:", logPath);
  process.exit(1);
}

console.log("Searching transcript for developer credentials...");
const data = fs.readFileSync(logPath, 'utf8');
const lines = data.split('\n');

let found = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("developer@pava-edux.com") || line.includes("platformDev") || line.includes("credentials")) {
    found.push({ lineNum: i + 1, content: line.substring(0, 500) });
  }
}

console.log(`Found ${found.length} matching lines.`);
found.slice(-10).forEach(f => {
  console.log(`Line ${f.lineNum}: ${f.content}`);
});
