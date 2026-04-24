import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Virtue@369';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log(`🔐 Updating Developer password to: ${newPassword}...`);

  const developer = await prisma.staff.update({
    where: { username: 'pavan' },
    data: {
      passwordHash: hashedPassword
    }
  });

  console.log(`✅ Password Synchronization Success for: ${developer.username}`);
}

main()
  .catch((e) => {
    console.error('❌ Update Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
