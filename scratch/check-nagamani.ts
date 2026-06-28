import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const staffList = await prisma.staff.findMany({
    where: { phone: "9100000011" },
    include: {
      statutory: true,
      bank: true,
      professional: true
    }
  });
  console.log('=== Staff records with phone 9100000011 ===');
  console.log(JSON.stringify(staffList, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
