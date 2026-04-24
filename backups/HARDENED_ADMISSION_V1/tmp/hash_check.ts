import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staff = await prisma.staff.findMany({
    select: {
      email: true,
      passwordHash: true
    }
  });
  console.log(JSON.stringify(staff.map(s => ({ email: s.email, hasHash: !!s.passwordHash })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
