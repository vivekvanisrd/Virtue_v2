const fs = require('fs');

const logPath = 'C:\\\\Users\\\\SriKriations\\\\.gemini\\\\antigravity\\\\brain\\\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\\\.system_generated\\\\logs\\\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.trim().split('\n');

console.log("Total lines in transcript:", lines.length);

const start = Math.max(0, lines.length - 5);
for (let i = start; i < lines.length; i++) {
  const line = lines[i];
  try {
    const parsed = JSON.parse(line);
    console.log(`\n================= Step ${i} (${parsed.source} | ${parsed.type}) =================`);
    console.log(parsed.content || JSON.stringify(parsed.tool_calls, null, 2));
  } catch (e) {
    console.log(`Error parsing line ${i}:`, e.message);
  }
}

