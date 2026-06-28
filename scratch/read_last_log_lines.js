const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\SriKriations\\.gemini\\antigravity-ide\\brain\\ee2596cf-dc5f-4e6d-aee3-f724c9f13c1b\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log("Log path does not exist");
  process.exit(1);
}

const fileStream = fs.createReadStream(logPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

const lines = [];
rl.on('line', (line) => {
  lines.push(line);
});

rl.on('close', () => {
  console.log("Total lines:", lines.length);
  const start = Math.max(0, lines.length - 15);
  for (let i = start; i < lines.length; i++) {
    try {
      const parsed = JSON.parse(lines[i]);
      console.log(`\n--- Step ${i} [Source: ${parsed.source}, Type: ${parsed.type}, Status: ${parsed.status}] ---`);
      if (parsed.content) {
        console.log(parsed.content.substring(0, 500));
      } else if (parsed.tool_calls) {
        console.log("Tool calls:", JSON.stringify(parsed.tool_calls, null, 2).substring(0, 500));
      }
    } catch (e) {
      console.log(`Error parsing line ${i}:`, e.message);
    }
  }
});
