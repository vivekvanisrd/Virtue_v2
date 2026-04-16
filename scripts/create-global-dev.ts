import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏁 Starting Global Developer Genesis...');

  const password = 'Virtue@2026';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Provision System Anchor School
  console.log('🏛️ Provisioning System Anchor School...');
  const school = await prisma.school.upsert({
    where: { code: 'V-SYSTEM-ROOT' },
    update: {},
    create: {
      id: 'V-SYSTEM-ROOT',
      name: 'Virtue Identity Hub',
      code: 'V-SYSTEM-ROOT',
      status: 'ACTIVE'
    }
  });

  // 2. Provision System Anchor Branch
  console.log('📍 Provisioning System Anchor Branch...');
  const branch = await prisma.branch.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'V-SYSTEM-HQ' } },
    update: {},
    create: {
      id: 'V-SYSTEM-HQ',
      schoolId: school.id,
      name: 'Main HQ',
      code: 'V-SYSTEM-HQ'
    }
  });

  // 3. Create Global Developer Account
  console.log('🧬 Creating Global Developer Account...');
  const developer = await prisma.staff.upsert({
    where: { username: 'pavan' },
    update: {
        passwordHash: hashedPassword,
        email: 'vivekvanisrd@gmail.com',
        role: 'DEVELOPER'
    },
    create: {
      id: 'DEV-PAVAN-001',
      staffCode: 'DEV-ROOT-01',
      firstName: 'Pavan',
      lastName: 'Developer',
      username: 'pavan',
      email: 'vivekvanisrd@gmail.com',
      role: 'DEVELOPER',
      status: 'ACTIVE',
      passwordHash: hashedPassword,
      schoolId: school.id,
      branchId: branch.id
    }
  });

  console.log('--- GENESIS SUCCESS REPORT ---');
  console.log(`✅ School ID: ${school.id}`);
  console.log(`✅ Branch ID: ${branch.id}`);
  console.log(`✅ Developer: ${developer.firstName} (${developer.username})`);
  console.log(`✅ Identifier: ${developer.email}`);
  console.log(`✅ Password : ${password} (Hashed)`);
}

main()
  .catch((e) => {
    console.error('❌ Genesis Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
