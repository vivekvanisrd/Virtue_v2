const fs = require('fs');

const src = 'C:\\Users\\SriKriations\\.gemini\\antigravity\\brain\\9c7156a0-e1c4-462b-a3f8-70303075f29e\\implementation_plan.md';
const dest = 'j:\\virtue_fb\\virtue-v2\\scratch\\old_implementation_plan.md';

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log("Successfully copied to", dest);
} else {
  console.log("Source file does not exist:", src);
}
