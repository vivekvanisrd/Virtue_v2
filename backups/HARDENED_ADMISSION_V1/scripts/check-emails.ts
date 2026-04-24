import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.platformAdmin.findMany({ select: { email: true, username: true } });
  const staff = await prisma.staff.findMany({ select: { email: true, username: true }, take: 5 });

  console.log('--- Platform Admins ---');
  admins.forEach(a => console.log(a.email || a.username));

  console.log('--- Staff (Sample) ---');
  staff.forEach(s => console.log(s.email || s.username));
}

main().catch(console.error).finally(() => prisma.$disconnect());
