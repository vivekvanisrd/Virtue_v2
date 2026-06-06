const fs = require('fs');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const data = fs.readFileSync(logPath, 'utf8');
const lines = data.split('\n');

console.log("Total lines:", lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineLower = line.toLowerCase();
  
  // Look for developer email and any word containing password/pass/credential
  if (lineLower.includes('developer@pava-edux.com') && (lineLower.includes('password') || lineLower.includes('pass') || lineLower.includes('hash'))) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.content) {
        // Search inside content for password-like assignments, e.g., "password is" or "password:" or "pw:"
        console.log(`\n--- Line ${i + 1} (Source: ${parsed.source}, Type: ${parsed.type}) ---`);
        
        // Print lines of the content that contain password or credential info
        const contentLines = parsed.content.split('\n');
        contentLines.forEach((cLine, idx) => {
          if (cLine.toLowerCase().includes('password') || cLine.toLowerCase().includes('developer') || cLine.toLowerCase().includes('cred')) {
            console.log(`  [Subline ${idx + 1}]: ${cLine.trim()}`);
          }
        });
      }
    } catch (e) {
      console.log(`\n--- Line ${i + 1} (Raw Match) ---`);
      console.log(line.substring(0, 500));
    }
  }
}
