import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.staff.updateMany({
    where: { schoolId: 'VIVES', role: 'OWNER' },
    data: { onboardingStatus: 'PASSWORD_CHANGE_REQUIRED' }
  });
  console.log('Updated', result.count, 'owner records for VIVES');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
