import { PrismaClient } from '../node_modules/.prisma/client';
const p = new PrismaClient();

async function main() {
  const s = await p.staff.findUnique({ 
    where: { id: 'cfe827ad-d63f-4362-b637-51002ab0ac84' }, 
    include: { professional: true, statutory: true, bank: true } 
  });
  console.log('=== Staff Record ===');
  console.log(JSON.stringify(s, null, 2));
  await p.$disconnect();
}

main();
