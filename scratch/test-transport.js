const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Trying to query prisma.transportRoute...');
    const routes = await prisma.transportRoute.findMany();
    console.log('Routes found:', routes.length);
  } catch (err) {
    console.error('CRASHED WITH ERROR:', err.message);
  }

  try {
    console.log('Trying to query prisma.route...');
    const routes = await prisma.route.findMany();
    console.log('Routes found:', routes.length);
  } catch (err) {
    console.error('CRASHED WITH ERROR:', err.message);
  }

  await prisma.$disconnect();
}

main();
