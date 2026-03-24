const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'vivek.viva@example.com';
  const updated = await prisma.staff.updateMany({
    where: { email },
    data: { role: 'DEVELOPER' }
  });
  console.log(`Updated ${updated.count} records. ${email} is now a DEVELOPER.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
