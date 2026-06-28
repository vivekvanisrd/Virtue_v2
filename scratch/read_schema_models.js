const fs = require('fs');
const readline = require('readline');

async function main() {
  const fileStream = fs.createReadStream('prisma/schema.prisma');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.trim().startsWith('model ')) {
      console.log(`${lineNum}: ${line}`);
    }
  }
}

main();
