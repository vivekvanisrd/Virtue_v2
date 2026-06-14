const fs = require('fs');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.trim().split('\n');
console.log("Total lines:", lines.length);

const lastLine = lines[lines.length - 1];
try {
  const parsed = JSON.parse(lastLine);
  console.log(`\n--- Last Step (${lines.length - 1}) [Source: ${parsed.source}, Type: ${parsed.type}, Status: ${parsed.status}] ---`);
  console.log(parsed.content);
} catch (e) {
  console.log(lastLine);
}
