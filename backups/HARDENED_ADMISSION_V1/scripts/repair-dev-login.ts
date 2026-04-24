import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Virtue@369';
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log('🔧 Repairing Developer Credentials for Native Login...');

  // Update the record to match the exact TITLE CASE expected by the auth logic
  const developer = await prisma.staff.update({
    where: { id: 'DEV-PAVAN-001' },
    data: {
      username: 'pavan', // Lowercase for safety
      email: 'vivekvanisrd@gmail.com',
      status: 'Active', // EXACT MATCH for signInAction check
      passwordHash: hashedPassword,
      role: 'DEVELOPER'
    }
  });

  console.log('--- REPAIR SUCCESS REPORT ---');
  console.log(`✅ ID: ${developer.id}`);
  console.log(`✅ Username: ${developer.username} (Use lowercase 'pavan')`);
  console.log(`✅ Status: ${developer.status} (Verified Title Case)`);
  console.log(`✅ Role: ${developer.role}`);
}

main()
  .catch((e) => {
    console.error('❌ Repair Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
