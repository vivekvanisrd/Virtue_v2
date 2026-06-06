const fs = require('fs');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i < 5800) {
    if (line.toLowerCase().includes('developer@pava-edux.com')) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.content) {
          console.log(`\n================= Line ${i + 1} =================`);
          console.log(parsed.content);
        }
      } catch (e) {
        // Fallback to printing line substring if not valid JSON
        console.log(`\n================= Line ${i + 1} (Raw Substring) =================`);
        console.log(line.substring(0, 1000));
      }
    }
  }
}
