import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Force TTY markers to trick Prisma Migrate into thinking it has an interactive terminal
process.stdout.isTTY = true;
process.stderr.isTTY = true;
process.stdin.isTTY = true;

// Set up the command line arguments for the Prisma CLI
process.argv = [
  process.argv[0],
  require.resolve('prisma'),
  'migrate',
  'dev',
  '--name',
  'add_enquiry_transport_fields'
];

console.log("Invoking Prisma Migrate via TTY-spoofing wrapper...");
require('prisma');
