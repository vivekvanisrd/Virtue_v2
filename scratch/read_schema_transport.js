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
    if (line.toLowerCase().includes('transport') || line.toLowerCase().includes('route') || line.toLowerCase().includes('stop') || line.toLowerCase().includes('vehicle')) {
      console.log(`${lineNum}: ${line}`);
    }
  }
}

main();
