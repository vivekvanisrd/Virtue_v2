const bcrypt = require('bcryptjs');

const hash = "$2b$10$V9gyazegzsdF4ZsYfyr/I..rv49nK6SBnAvVYz5L7/C5rMDMeQMD6";
const candidatePasswords = [
  "VivekeVani@369",
  "Vivek@369",
  "VivekeVani@2026",
  "Vivek@2026",
  "vivek",
  "vivek@369",
  "vivek@2026",
  "Virtue@369",
  "Virtue@2026",
  "InitialKey@PaVa",
  "Pava@369",
  "Pava@2026",
  "pava",
  "pavan"
];

async function main() {
  for (const pw of candidatePasswords) {
    const isMatch = await bcrypt.compare(pw, hash);
    if (isMatch) {
      console.log(`🎉 FOUND MATCHING PASSWORD: "${pw}"`);
      return;
    }
  }
  console.log("❌ No password matched the hash.");
}

main();
