import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pkg = require('prisma/package.json');
console.log("Prisma package bin mapping:", pkg.bin);
