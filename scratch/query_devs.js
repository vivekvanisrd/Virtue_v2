const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'developer@pava-edux.com';
  const newPassword = 'VirtueDev@2026';
  
  console.log(`Hashing password: "${newPassword}"...`);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  
  console.log(`Checking for PlatformAdmin with email: ${email}...`);
  const admin = await prisma.platformAdmin.findUnique({
    where: { email }
  });
  
  if (!admin) {
    console.log(`No PlatformAdmin found with email: ${email}. Listing all admins:`);
    const allAdmins = await prisma.platformAdmin.findMany();
    console.log(JSON.stringify(allAdmins, null, 2));
    
    if (allAdmins.length > 0) {
      console.log(`Resetting password for the first admin: ${allAdmins[0].email}...`);
      const updated = await prisma.platformAdmin.update({
        where: { id: allAdmins[0].id },
        data: { passwordHash }
      });
      console.log(`Successfully reset password for: ${updated.email}`);
    } else {
      console.log('No PlatformAdmin accounts found in the database. Creating one...');
      const created = await prisma.platformAdmin.create({
        data: {
          name: 'Platform Developer',
          email,
          username: 'developer',
          passwordHash
        }
      });
      console.log(`Successfully created PlatformAdmin account:`, JSON.stringify(created, null, 2));
    }
  } else {
    console.log(`Resetting password for: ${admin.email}...`);
    const updated = await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { passwordHash }
    });
    console.log(`Successfully reset password for: ${updated.email}`);
  }
}

main()
  .catch(e => {
    console.error('Error resetting password:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
