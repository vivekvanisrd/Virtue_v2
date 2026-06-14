const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist:", logPath);
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.trim().split('\n');

const userInputs = [];
lines.forEach((line, idx) => {
  try {
    const parsed = JSON.parse(line);
    if (parsed.type === 'USER_INPUT') {
      userInputs.push({ index: idx, content: parsed.content });
    }
  } catch (e) {}
});

console.log(`Found ${userInputs.length} user inputs.`);
userInputs.slice(-30).forEach(u => {
  console.log(`[Step ${u.index + 1}] ${u.content}`);
});

