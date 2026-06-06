const fs = require('fs');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.split('\n');

console.log("Total lines in transcript:", lines.length);

let found = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (i < 5800) { // Only older lines
    const lineLower = line.toLowerCase();
    if (lineLower.includes('developer@pava-edux.com') || lineLower.includes('password') || lineLower.includes('credentials')) {
      found.push({ lineNum: i + 1, content: line });
    }
  }
}

console.log(`Found ${found.length} matching lines before line 5800.`);

// Let's print them cleanly, focusing on MODEL responses or USER inputs which usually contain the text shown to the user
found.forEach(f => {
  try {
    const parsed = JSON.parse(f.content);
    if (parsed.source === 'MODEL' && parsed.content) {
      // Look for passwords or credentials in the text
      if (parsed.content.toLowerCase().includes('password') || parsed.content.toLowerCase().includes('developer@pava-edux.com')) {
        console.log(`\n--- Line ${f.lineNum} (MODEL Response) ---`);
        console.log(parsed.content);
      }
    } else if (parsed.source === 'USER_EXPLICIT' && parsed.content) {
      console.log(`\n--- Line ${f.lineNum} (USER Input) ---`);
      console.log(parsed.content);
    }
  } catch (err) {
    // Ignore JSON parse errors for incomplete lines
  }
});
