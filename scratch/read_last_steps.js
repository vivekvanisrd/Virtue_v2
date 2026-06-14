const fs = require('fs');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.trim().split('\n');

console.log("Total lines in transcript:", lines.length);

const targetIndex = 5829; // Step 5830 is at index 5829
if (targetIndex < lines.length) {
  const line = lines[targetIndex];
  try {
    const parsed = JSON.parse(line);
    console.log(`\n================= Step ${targetIndex + 1} (${parsed.source} | ${parsed.type}) =================`);
    console.log(parsed.content.substring(0, 3000));
  } catch (e) {
    console.log(line);
  }
} else {
  console.log("Target index out of bounds");
}
