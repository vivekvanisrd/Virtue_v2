import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("9100000011", 10);
  const result = await prisma.staff.updateMany({
    where: { phone: "9100000011" },
    data: {
      onboardingStatus: "PASSWORD_CHANGE_REQUIRED",
      passwordHash: hash,
      username: null,
      mobilePasswordUsed: false,
    }
  });
  console.log('Reset Nagamani count:', result.count);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
